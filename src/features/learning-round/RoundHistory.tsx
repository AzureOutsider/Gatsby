import type { RoundHistory as History } from "../../types";
export function RoundHistory({ rounds }: { rounds: History[] }) {
  return (
    <div className="round-history">
      {rounds.map((round) => (
        <div className="history-row" key={round.id}>
          <div>
            <strong>{round.sourceTitle}</strong>
            <span>
              {new Date(round.completedAt).toLocaleString("zh-CN", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div>
            <strong>{round.cardCount} 个单元</strong>
            <span>
              {round.spellingCompleted
                ? `完成拼写 · 错误重练 ${round.spellingWrong} 次`
                : "完成翻卡 · 跳过拼写"}
            </span>
          </div>
          <span className="badge green-badge">已完成</span>
        </div>
      ))}
    </div>
  );
}
