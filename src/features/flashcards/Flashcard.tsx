import type { Card, Feedback, Phase } from "../../types";
import { Sound } from "../../components/UI";
export function Flashcard({
  card,
  phase,
  feedback,
  onFeedback,
  onNext,
  onRepeat,
}: {
  card: Card;
  phase: Phase;
  feedback: Feedback | null;
  onFeedback: (value: Feedback) => void;
  onNext: () => void;
  onRepeat: () => void;
}) {
  return (
    <section className="study-card glass-panel">
      <div className="study-meta">
        <span className="badge">翻卡复习</span>
        <span>
          {card.kind} · {card.itemTitle}
        </span>
      </div>
      <div className="word-heading">
        <h2 lang="en">{card.prompt}</h2>
        <Sound text={card.prompt} />
      </div>
      <p className="study-context" lang="en">
        {card.context}
      </p>
      {phase === "answer" ? (
        <>
          <div className="answer-panel" aria-live="polite">
            <h3>{card.answer}</h3>
            <p>{card.note}</p>
            {feedback === "forgot" && (
              <span className="feedback-note">
                已安排本轮稍后重现，答案会保留到你进入下一张。
              </span>
            )}
          </div>
          <div className="study-actions">
            <button className="primary-btn" data-action="next" onClick={onNext}>
              下一个 <kbd>Enter</kbd>
            </button>
            {feedback === "remembered" && (
              <button
                className="quiet-btn"
                data-action="repeat"
                onClick={onRepeat}
              >
                再来一次 <kbd>R</kbd>
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="recall-space">
            <span>先在心里想一想它的意思。</span>
          </div>
          <div className="study-actions">
            <button
              className="quiet-btn"
              data-action="forgot"
              onClick={() => onFeedback("forgot")}
            >
              不记得 <kbd>1</kbd>
            </button>
            <button
              className="primary-btn"
              data-action="remembered"
              onClick={() => onFeedback("remembered")}
            >
              记得 <kbd>2</kbd>
            </button>
          </div>
        </>
      )}
    </section>
  );
}
