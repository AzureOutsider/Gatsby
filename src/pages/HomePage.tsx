import { useState } from "react";
import { ArrowRight, Moon, Sparkles, SlidersHorizontal } from "lucide-react";
import { useLearning } from "../store/LearningProvider";
import { homeBooks, statistics } from "../store/learning";
import { Progress } from "../components/UI";
import { BookCard } from "../features/library/BookCard";
import { HomeBookPicker } from "../features/library/HomeBookPicker";
export function HomePage({ onStart }: { onStart: (source?: string) => void }) {
  const { data, setView } = useLearning(),
    stats = statistics(data);
  const [pickingBooks, setPickingBooks] = useState(false);
  return (
    <>
      <div className="home-greeting">
        <span>
          <Moon size={16} aria-hidden="true" /> 给自己，一点安静的学习时间。
        </span>
        <time>
          {new Date().toLocaleDateString("zh-CN", {
            month: "long",
            day: "numeric",
            weekday: "long",
          })}
        </time>
      </div>
      <div className="home-hero-grid">
        <section className="home-hero">
          <img
            src="./gatsby-scene.webp"
            alt="暖金灯光下的钢琴、酒杯与晚宴剪影"
            className="hero-art"
          />
          <div className="hero-shade" />
          <div className="hero-copy">
            <p className="hero-intro">夜色留白，词句生光。</p>
            <h1 lang="en">
              A little light.
              <br />A little English.
            </h1>
            <p className="hero-chinese">在文字里，与世界相遇。</p>
            <p className="hero-description">
              把一首歌、一页小说、一段对白，
              <br />
              慢慢读成自己的语言。
            </p>
            <button className="primary-btn hero-cta" onClick={() => onStart()}>
              {data.round ? "继续当前轮次" : "开始今天的学习"}
              <ArrowRight size={19} aria-hidden="true" />
            </button>
          </div>
          <div className="hero-caption">晚宴之后，故事继续。</div>
        </section>
        <aside className="daily-card glass-panel">
          <span className="badge">
            <Sparkles size={14} aria-hidden="true" /> 今日的节奏
          </span>
          <h2>
            让记忆，
            <br />
            多停留一会儿。
          </h2>
          <div className="daily-number">
            {stats.due}
            <span>个单元待复习</span>
          </div>
          <div className="daily-goal">
            <div>
              <span>今日复习目标</span>
              <strong>
                {stats.today} / {data.dailyGoal}
              </strong>
            </div>
            <Progress
              value={(stats.today / data.dailyGoal) * 100}
              label="今日复习目标"
            />
          </div>
          <p className="streak-line">
            {stats.streak
              ? `已连续学习 ${stats.streak} 天`
              : "从今天开始，积累第一天。"}
          </p>
        </aside>
      </div>
      {data.round && (
        <section className="resume-strip">
          <div>
            <span className="status-dot" />
            <strong>上次的进度还在这里</strong>
            <p>
              {data.round.sourceTitle} ·{" "}
              {data.round.stage === "cards"
                ? "翻卡复习中"
                : data.round.stage === "gate"
                  ? "翻卡完成，等待进入拼写"
                  : "拼写练习中"}
            </p>
          </div>
          <button className="quiet-btn" onClick={() => setView("review")}>
            接着学 <ArrowRight size={17} />
          </button>
        </section>
      )}
      <div className="metrics-row">
        {[
          [stats.mastered, "已掌握单元"],
          [data.items.length, "收藏内容"],
          [stats.week, "本周复习次数"],
          [data.rounds.length, "完成学习轮次"],
        ].map(([value, label]) => (
          <div className="metric" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="section-heading">
        <div>
          <h2>下一段，读什么</h2>
          <p>音乐、文字与对白，都是英语的入口。</p>
        </div>
        <div className="home-book-actions">
          <button
            className="quiet-btn"
            disabled={!data.items.length}
            onClick={() => setPickingBooks(true)}
          >
            <SlidersHorizontal size={17} aria-hidden="true" /> 选择展示词书
          </button>
          <button className="text-btn" onClick={() => setView("library")}>
            浏览内容库 <ArrowRight size={17} />
          </button>
        </div>
      </div>
      {data.items.length ? (
        <div className="home-books">
          {homeBooks(data).map((book) => (
            <BookCard key={book.id} book={book} onStart={onStart} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>内容库还是空的，先放入一份喜欢的英语。</p>
          <button className="primary-btn" onClick={() => setView("library")}>
            打开内容库
          </button>
        </div>
      )}
      {pickingBooks && (
        <HomeBookPicker onClose={() => setPickingBooks(false)} />
      )}
    </>
  );
}
