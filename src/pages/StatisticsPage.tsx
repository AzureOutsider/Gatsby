import { Database, ArrowUpRight } from "lucide-react";
import { PageHead, Empty } from "../components/UI";
import { useLearning } from "../store/LearningProvider";
import { scheduleOf, statistics } from "../store/learning";
import { dailyGoals } from "../data/design";
import { RoundHistory } from "../features/learning-round/RoundHistory";
export function StatisticsPage({
  onData,
  onStart,
}: {
  onData: () => void;
  onStart: (id: string) => void;
}) {
  const { data, update } = useLearning(),
    stats = statistics(data),
    peak = Math.max(1, ...stats.days.map((day) => day.count));
  return (
    <>
      <PageHead
        title="每一点积累，都算数"
        copy="没有排行榜，只有你和昨天的自己。"
      >
        <button className="quiet-btn" onClick={onData}>
          <Database size={18} />
          数据管理
        </button>
      </PageHead>
      <div className="statistics-metrics">
        {[
          [stats.total, "累计复习"],
          [stats.remembered, "记得反馈"],
          [stats.streak, "连续学习天数"],
          [data.rounds.length, "完成轮次"],
        ].map(([value, label]) => (
          <div className="stat-card glass-panel" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="statistics-grid">
        <section className="chart-card glass-panel">
          <div className="section-heading">
            <h2>最近七天</h2>
            <span className="muted">共 {stats.week} 次复习</span>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={stats.days
              .map((day) => `${day.key}：${day.count} 次`)
              .join("；")}
          >
            {stats.days.map((day) => (
              <div className="bar-column" key={day.key}>
                <span>{day.count}</span>
                <div className="bar-space">
                  <i
                    style={{
                      height: `${(day.count / peak) * 100}%`,
                      minHeight: day.count ? 4 : 0,
                    }}
                  />
                </div>
                <span>周{day.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="goal-card glass-panel">
          <span className="badge">留一点时间给自己</span>
          <h2>小目标，长久地学。</h2>
          <p>目标按复习反馈次数计算，不催促，只记录。</p>
          <label>
            每日复习目标
            <select
              value={data.dailyGoal}
              onChange={(e) =>
                update((data) => ({
                  ...data,
                  dailyGoal: Number(e.target.value),
                }))
              }
            >
              {dailyGoals.map((goal) => (
                <option key={goal} value={goal}>
                  {goal} 次 / 天
                </option>
              ))}
            </select>
          </label>
          <p className="goal-today">
            今天已完成 <strong>{stats.today}</strong> 次
          </p>
        </section>
      </div>
      <section className="history-section">
        <div className="section-heading">
          <h2>值得再看一眼</h2>
          <span className="muted">根据“不记得”和拼写错误记录</span>
        </div>
        {stats.weak.length ? (
          <div className="weak-list glass-panel">
            {stats.weak.map((card) => (
              <div className="weak-row" key={card.itemId + card.prompt}>
                <div>
                  <strong lang="en">{card.prompt}</strong>
                  <span>{card.answer}</span>
                </div>
                <span className="muted">
                  重练 {scheduleOf(data, card).lapses} 次
                </span>
                <button
                  className="text-btn"
                  onClick={() => onStart(card.itemId)}
                >
                  复习来源 <ArrowUpRight size={17} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Empty>
            还没有需要重练的内容。开始一轮后，这里会记录需要再巩固的词。
          </Empty>
        )}
      </section>
      <section className="history-section">
        <div className="section-heading">
          <h2>走过的每一轮</h2>
          <span className="muted">
            最近 {Math.min(20, data.rounds.length)} 轮
          </span>
        </div>
        {data.rounds.length ? (
          <RoundHistory rounds={data.rounds.slice(0, 20)} />
        ) : (
          <Empty>完成第一轮后，你的学习记录会出现在这里。</Empty>
        )}
      </section>
    </>
  );
}
