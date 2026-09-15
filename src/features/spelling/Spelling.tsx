import { useEffect, useRef, useState } from "react";
import type { Card, Phase } from "../../types";
import { Sound } from "../../components/UI";
import { maskPrompt } from "../../store/learning";
export function Spelling({
  card,
  phase,
  typedAnswer,
  correct,
  cloze = false,
  onCheck,
  onNext,
}: {
  card: Card;
  phase: Phase;
  typedAnswer: string;
  correct: boolean | null;
  cloze?: boolean;
  onCheck: (value: string) => void;
  onNext: () => void;
}) {
  const [input, setInput] = useState(""),
    ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setInput("");
    if (phase === "prompt") ref.current?.focus();
  }, [card, phase]);
  return (
    <section className="study-card glass-panel">
      <div className="study-meta">
        <span className="badge">{cloze ? "语境填空" : "拼写练习"}</span>
        <span>
          {card.kind} · {card.itemTitle}
        </span>
      </div>
      <p className="study-instruction">
        {cloze
          ? "结合语境，补上缺失的英文。"
          : "根据中文释义，写出刚才复习过的英文。"}
      </p>
      <div className="word-heading">
        <h2 className="meaning-heading">{card.answer}</h2>
        <Sound text={card.prompt} />
      </div>
      <p className="study-context" lang="en">
        {maskPrompt(card.context, card.prompt)}
      </p>
      {phase === "prompt" ? (
        <form
          className="spelling-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (input.trim()) onCheck(input);
          }}
        >
          <label htmlFor="spelling-input">英文答案</label>
          <input
            ref={ref}
            id="spelling-input"
            lang="en"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            placeholder="Type your answer…"
          />
          <button className="primary-btn" type="submit">
            检查答案 <kbd>Enter</kbd>
          </button>
        </form>
      ) : (
        <>
          <div
            className={`answer-panel ${correct ? "correct" : "incorrect"}`}
            aria-live="polite"
          >
            <span className="feedback-note">
              {correct ? "拼写正确" : "先记住答案，这个词已排到队尾。"}
            </span>
            <p>
              你的答案：<span lang="en">{typedAnswer}</span>
            </p>
            <h3 lang="en">{card.prompt}</h3>
            <p>{card.note}</p>
          </div>
          <div className="study-actions">
            <button className="primary-btn" data-action="next" onClick={onNext}>
              {correct ? "下一个" : "继续下一张"} <kbd>Enter</kbd>
            </button>
          </div>
        </>
      )}
    </section>
  );
}
