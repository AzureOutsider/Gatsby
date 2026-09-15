import { useEffect, useState } from "react";
import { ArrowRight, Check, BookmarkCheck } from "lucide-react";
import type { Feedback, FreeSession, Mode } from "../types";
import { useLearning } from "../store/LearningProvider";
import {
  advanceCard,
  advanceSpelling,
  checkSpelling,
  enterSpelling,
  feedback,
  finishRound,
  normalizeAnswer,
  record,
  repeatCard,
  units,
} from "../store/learning";
import { PageHead, Progress } from "../components/UI";
import { Flashcard } from "../features/flashcards/Flashcard";
import { Spelling } from "../features/spelling/Spelling";
import { RoundSetup } from "../features/learning-round/RoundSetup";
import { RoundHistory } from "../features/learning-round/RoundHistory";
import { stopAudio, warmWord } from "../features/flashcards/audio";
export function ReviewPage({ source }: { source: string }) {
  const { data, update, setView, notify } = useLearning(),
    round = data.round;
  const [free, setFree] = useState<FreeSession | null>(null);
  const spelling = round?.stage === "spelling";
  const card = round
    ? spelling
      ? round.spellingQueue[round.spellingIndex]
      : round.cardQueue[round.cardIndex]
    : free?.queue[free.index];
  useEffect(() => {
    if (card) void warmWord(card.prompt);
    return stopAudio;
  }, [card?.prompt]);
  function leave() {
    setView("home");
    notify(round ? "本轮进度已保存，下次可以接着学。" : "已离开自由练习。");
  }
  function startFree(id: string) {
    const queue = units(data, id);
    if (!queue.length) return;
    setFree({
      queue,
      baseQueue: queue.slice(),
      index: 0,
      phase: "prompt",
      feedback: null,
      repeats: [],
      repeatPass: false,
      typedAnswer: "",
      typingCorrect: null,
    });
  }
  function freeFeedback(value: Feedback, typed = "") {
    if (!free || !card || free.phase !== "prompt") return;
    if (
      !update((data) => {
        const next = structuredClone(data);
        record(
          next,
          card,
          value === "forgot" ? "again" : "know",
          data.practiceMode,
        );
        return next;
      })
    )
      return;
    const next = {
      ...free,
      phase: "answer" as const,
      feedback: value,
      typedAnswer: typed,
      typingCorrect: value === "remembered",
    };
    if (value === "forgot") {
      if (data.practiceMode !== "cards") next.queue = [...free.queue, card];
      else if (
        !free.repeatPass &&
        !free.repeats.some(
          (unit) => unit.itemId === card.itemId && unit.prompt === card.prompt,
        )
      )
        next.repeats = [...free.repeats, card];
    }
    setFree(next);
  }
  function nextFree() {
    if (!free || free.phase !== "answer") return;
    let queue = free.queue,
      index = free.index + 1,
      repeats = free.repeats,
      repeatPass = free.repeatPass;
    if (index >= queue.length) {
      queue = repeats.length ? repeats.slice() : free.baseQueue.slice();
      index = 0;
      repeatPass = repeats.length > 0;
      repeats = [];
    }
    setFree({
      ...free,
      queue,
      index,
      repeats,
      repeatPass,
      phase: "prompt",
      feedback: null,
      typedAnswer: "",
      typingCorrect: null,
    });
  }
  if (!round && !free)
    return (
      <>
        <PageHead
          title="开始一轮，专注一小组"
          copy="把英语放进日常，不必一次学完。"
        />
        <RoundSetup
          source={
            data.items.some((book) => book.id === source) ? source : "all"
          }
          onFree={startFree}
        />
        {data.rounds.length > 0 && (
          <section className="history-section">
            <div className="section-heading">
              <h2>最近完成的轮次</h2>
              <span className="muted">每一步都有记录</span>
            </div>
            <RoundHistory rounds={data.rounds.slice(0, 3)} />
          </section>
        )}
      </>
    );
  const index = round
    ? spelling
      ? round.spellingIndex
      : round.cardIndex
    : free!.index;
  const queue = round
    ? spelling
      ? round.spellingQueue
      : round.cardQueue
    : free!.queue;
  const gate = round?.stage === "gate";
  return (
    <>
      <PageHead
        title={round ? round.sourceTitle : "自由练习"}
        copy={
          gate
            ? "这一轮的翻卡已完成，接下来由你决定。"
            : round
              ? "本轮进度自动保存，随时都能接着学。"
              : "按自己的节奏，练习翻卡、拼写或语境填空。"
        }
      >
        <div className="review-head-actions">
          <button className="quiet-btn" data-action="leave" onClick={leave}>
            <BookmarkCheck size={17} />
            {round ? "暂存并离开" : "离开练习"}
          </button>
          {round && (
            <button
              className="text-btn muted"
              onClick={() => {
                if (
                  confirm(
                    "放弃当前轮次？已有复习反馈保留，但本轮不计入完成记录。",
                  )
                )
                  update((data) => ({ ...data, round: null }));
              }}
            >
              放弃本轮
            </button>
          )}
        </div>
      </PageHead>
      {free && (
        <div className="mode-switch">
          {(
            [
              ["cards", "翻卡复习"],
              ["spelling", "拼写练习"],
              ["cloze", "语境填空"],
            ] as [Mode, string][]
          ).map(([mode, title]) => (
            <button
              key={mode}
              aria-pressed={data.practiceMode === mode}
              className={data.practiceMode === mode ? "selected" : ""}
              onClick={() => {
                if (update((data) => ({ ...data, practiceMode: mode })))
                  setFree({
                    ...free,
                    phase: "prompt",
                    feedback: null,
                    typedAnswer: "",
                    typingCorrect: null,
                  });
              }}
            >
              {title}
            </button>
          ))}
        </div>
      )}
      <div className="round-progress-heading">
        <span>
          {gate
            ? "翻卡完成"
            : spelling
              ? "本轮拼写"
              : free
                ? "自由练习"
                : "本轮翻卡"}
        </span>
        <strong>
          {gate ? round.cards.length : index + 1} / {queue.length}
        </strong>
      </div>
      <Progress
        value={gate ? 100 : (index / queue.length) * 100}
        label="当前阶段进度"
      />
      <div className="review-layout">
        {gate ? (
          <section className="gate-card glass-panel">
            <div className="completion-mark">
              <Check size={30} />
            </div>
            <h2>这些词，已经见过一面。</h2>
            <p>
              刚才复习了 {round.cards.length} 个学习单元。
              <br />
              要不要把它们再写一遍，让记忆更深一点？
            </p>
            <div className="gate-detail">
              <strong>
                {round.cards.length}
                <span>本轮单元</span>
              </strong>
              <strong>
                {Object.keys(round.cardRepeats).length}
                <span>安排重现</span>
              </strong>
            </div>
            <div className="study-actions">
              <button
                className="primary-btn"
                data-action="spelling"
                onClick={() => update(enterSpelling)}
              >
                进入拼写练习 <kbd>S</kbd>
              </button>
              <button
                className="quiet-btn"
                data-action="finish"
                onClick={() => {
                  if (update((data) => finishRound(data, false)))
                    notify("本轮已完成，学习记录已保存。");
                }}
              >
                结束本轮 <kbd>N</kbd>
              </button>
            </div>
          </section>
        ) : (
          card &&
          (spelling || (free && data.practiceMode !== "cards") ? (
            <Spelling
              card={card}
              phase={round ? round.spellingPhase : free!.phase}
              typedAnswer={round ? round.typedAnswer : free!.typedAnswer}
              correct={round ? round.typingCorrect : free!.typingCorrect}
              cloze={!!free && data.practiceMode === "cloze"}
              onCheck={(value) =>
                round
                  ? update((data) => checkSpelling(data, value))
                  : freeFeedback(
                      normalizeAnswer(value) === normalizeAnswer(card.prompt)
                        ? "remembered"
                        : "forgot",
                      value,
                    )
              }
              onNext={() => {
                if (round) {
                  if (
                    update(advanceSpelling) &&
                    round.spellingIndex + 1 >= round.spellingQueue.length
                  )
                    notify("本轮全部拼写正确，学习完成！");
                } else nextFree();
              }}
            />
          ) : (
            <Flashcard
              card={card}
              phase={round ? round.cardPhase : free!.phase}
              feedback={round ? round.cardFeedback : free!.feedback}
              onFeedback={(value) =>
                round
                  ? update((data) => feedback(data, value))
                  : freeFeedback(value)
              }
              onNext={() => (round ? update(advanceCard) : nextFree())}
              onRepeat={() =>
                round
                  ? update(repeatCard)
                  : setFree({ ...free!, phase: "prompt", feedback: null })
              }
            />
          ))
        )}
        <aside className="queue-panel glass-panel">
          <h2>{gate ? "下一步的小提示" : "本轮接下来"}</h2>
          {gate ? (
            <p className="queue-note">
              拼写只练刚才这一轮的内容。拼错的词会排到队尾，稍后再遇到，直到写对。
            </p>
          ) : (
            queue.slice(index + 1, index + 6).map((unit, i) => (
              <div className="queue-row" key={`${index}-${i}`}>
                <span className="queue-dot" />
                <div>
                  <strong>
                    {spelling || (data.practiceMode !== "cards" && free)
                      ? `待拼写单元 ${i + 1}`
                      : unit.prompt}
                  </strong>
                  <span>
                    {unit.kind} · {i === 0 ? "下一张" : "稍后"}
                  </span>
                </div>
              </div>
            ))
          )}
          {!gate && index + 1 >= queue.length && (
            <p className="queue-note">这是当前队列的最后一张。</p>
          )}
          <div className="queue-bottom">
            <span className="status-dot" />
            {round ? "进度已保存在此浏览器" : "自由练习不记录轮次进度"}
            <p>不用赶路，记住一点就好。</p>
          </div>
        </aside>
      </div>
      <div className="practice-footnote">
        <span>
          发音 <kbd>P</kbd>
        </span>
        <span>
          快捷键帮助 <kbd>?</kbd>
        </span>
        <span>
          暂存离开 <kbd>Esc</kbd>
        </span>
        <ArrowRight size={15} aria-hidden="true" />
        <span>答案会保留到你主动进入下一张</span>
      </div>
    </>
  );
}
