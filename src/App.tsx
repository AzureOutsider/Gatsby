import { useEffect, useState } from "react";
import {
  BookOpen,
  ChartNoAxesCombined,
  House,
  Layers3,
  Keyboard,
  Search,
  Moon,
  ArrowUpRight,
  Volume2,
} from "lucide-react";
import { brand } from "./data/design";
import { useLearning } from "./store/LearningProvider";
import { statistics } from "./store/learning";
import type { View } from "./types";
import { HomePage } from "./pages/HomePage";
import { LibraryPage } from "./pages/LibraryPage";
import { ReviewPage } from "./pages/ReviewPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { DataTools } from "./features/statistics/DataTools";
import { Modal } from "./components/UI";
import { PronunciationSettings } from "./features/flashcards/PronunciationSettings";
import { stopAudio } from "./features/flashcards/audio";

const navigation = [
  { id: "home", label: "今日学习", icon: House },
  { id: "library", label: "内容库", icon: BookOpen },
  { id: "review", label: "复习队列", icon: Layers3 },
  { id: "stats", label: "学习记录", icon: ChartNoAxesCombined },
] as const;
export default function App() {
  const { data, view, setView, message, storageWarning, sessionRevision } =
    useLearning();
  const [source, setSource] = useState("all"),
    [modal, setModal] = useState<
      "shortcuts" | "data" | "logo" | "pronunciation" | null
    >(null);
  const pronunciationKey = JSON.stringify(data.pronunciation);
  useEffect(() => {
    stopAudio();
  }, [view, modal, sessionRevision, pronunciationKey]);
  const due = statistics(data).due;
  function start(source = "all") {
    setSource(source);
    setView("review");
  }
  function search() {
    setView("library");
    requestAnimationFrame(() =>
      document.getElementById("library-search")?.focus(),
    );
  }
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = `Gatsby · ${navigation.find((item) => item.id === view)?.label}`;
  }, [view]);
  useEffect(() => {
    function handle(event: KeyboardEvent) {
      if (
        event.isComposing ||
        event.repeat ||
        document.querySelector("dialog[open]")
      )
        return;
      const target = event.target as HTMLElement;
      const typing = !!target.closest(
        'input,textarea,select,[contenteditable="true"]',
      );
      const command = event.ctrlKey || event.metaKey;
      if (
        command &&
        !event.altKey &&
        ["1", "2", "3", "4"].includes(event.key)
      ) {
        event.preventDefault();
        setView(navigation[Number(event.key) - 1].id);
        return;
      }
      if (command && event.key.toLowerCase() === "k") {
        event.preventDefault();
        search();
        return;
      }
      if (event.altKey || command) return;
      if (event.key === "Escape") {
        const leave = document.querySelector<HTMLButtonElement>(
          '[data-action="leave"]',
        );
        if (leave) {
          event.preventDefault();
          leave.click();
        }
        return;
      }
      if (typing) return;
      if (event.key === "?") {
        event.preventDefault();
        setModal("shortcuts");
        return;
      }
      if (view !== "review") return;
      if (event.key === "Enter" && target.closest("button,a")) return;
      const key = event.key.toLowerCase();
      const action: Record<string, string> = {
        "1": "forgot",
        "2": "remembered",
        r: "repeat",
        s: "spelling",
        n: "finish",
        arrowright: "next",
      };
      let button: HTMLButtonElement | null = null;
      if (key === "p")
        button = document.querySelector<HTMLButtonElement>(
          ".study-card .sound-btn",
        );
      else if (key === "enter")
        button = document.querySelector<HTMLButtonElement>(
          '[data-action="next"], [data-action="start"], [data-action="spelling"]',
        );
      else if (action[key])
        button = document.querySelector<HTMLButtonElement>(
          `[data-action="${action[key]}"]`,
        );
      if (button && !button.disabled) {
        event.preventDefault();
        button.click();
      }
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [view, setView]);
  return (
    <>
      <div
        className={`atmosphere ${view === "review" ? "quiet-atmosphere" : ""}`}
        aria-hidden="true"
      >
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <div className="gold-dust" />
      </div>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="app-header">
        <div className="header-inner">
          <div className="identity">
            <button
              className="logo-button"
              aria-label="查看 Gatsby Logo"
              onClick={() => setModal("logo")}
            >
              <img
                src="./gatsby-logo.webp"
                alt="Gatsby"
                width="54"
                height="54"
              />
            </button>
            <button className="brand-copy" onClick={() => setView("home")}>
              <strong>{brand.name}</strong>
              <span>{brand.subtitle}</span>
            </button>
          </div>
          <nav className="main-nav" aria-label="主导航">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={view === id ? "nav-item active" : "nav-item"}
                onClick={() => setView(id as View)}
                aria-current={view === id ? "page" : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
                {id === "review" && due > 0 && (
                  <span
                    className="nav-count"
                    aria-label={`${due} 个单元待复习`}
                  >
                    {due}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="header-tools">
            <button
              className="icon-btn"
              onClick={() => setModal("pronunciation")}
              aria-label="发音设置"
              title="发音设置与试听"
            >
              <Volume2 size={20} aria-hidden="true" />
            </button>
            <button
              className="icon-btn"
              onClick={search}
              aria-label="搜索内容"
              title="搜索 · Ctrl+K"
            >
              <Search size={20} />
            </button>
            <button
              className="icon-btn"
              onClick={() => setModal("shortcuts")}
              aria-label="键盘快捷键"
              title="快捷键 · ?"
            >
              <Keyboard size={20} />
            </button>
            <span className="theme-label">
              <Moon size={15} aria-hidden="true" />
              {brand.theme}
            </span>
          </div>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className={`main-content page-${view}`}
      >
        {storageWarning && (
          <div className="storage-warning" role="alert">
            <p>{storageWarning}</p>
            <button className="quiet-btn" onClick={() => setModal("data")}>
              查看诊断与处理
            </button>
          </div>
        )}
        {view === "home" && <HomePage onStart={start} />}
        {view === "library" && <LibraryPage onStart={start} />}
        {view === "review" && (
          <ReviewPage key={sessionRevision} source={source} />
        )}
        {view === "stats" && (
          <StatisticsPage onData={() => setModal("data")} onStart={start} />
        )}
        <footer className="app-footer">
          <span>
            <span className="status-dot" />
            本地学习，独自生长。
          </span>
          <button className="text-btn" onClick={() => setModal("data")}>
            备份我的学习 <ArrowUpRight size={15} />
          </button>
        </footer>
      </main>
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
      {modal === "data" && <DataTools onClose={() => setModal(null)} />}
      {modal === "pronunciation" && (
        <PronunciationSettings onClose={() => setModal(null)} />
      )}
      {modal === "logo" && (
        <Modal title="Gatsby" onClose={() => setModal(null)}>
          <img
            className="logo-preview"
            src="./gatsby-scene.webp"
            alt="Gatsby Logo：暖光下的晚宴与钢琴"
          />
          <p className="modal-copy">你的英语学习室。夜色留白，词句生光。</p>
        </Modal>
      )}
      {modal === "shortcuts" && (
        <Modal title="让手指，跟上思考" onClose={() => setModal(null)} wide>
          <div className="shortcut-grid">
            <section>
              <h3>翻卡与发音</h3>
              <p>
                <kbd>1</kbd> 不记得
              </p>
              <p>
                <kbd>2</kbd> 记得
              </p>
              <p>
                <kbd>Enter</kbd> / <kbd>→</kbd> 下一张
              </p>
              <p>
                <kbd>R</kbd> 记得后，再来一次
              </p>
              <p>
                <kbd>P</kbd> 播放发音
              </p>
            </section>
            <section>
              <h3>一轮学习</h3>
              <p>
                <kbd>Enter</kbd> 开始一轮 / 提交拼写
              </p>
              <p>
                <kbd>S</kbd> 翻卡完成后进入拼写
              </p>
              <p>
                <kbd>N</kbd> 跳过拼写，结束本轮
              </p>
              <p>
                <kbd>Esc</kbd> 暂存并离开
              </p>
            </section>
            <section>
              <h3>随处可用</h3>
              <p>
                <kbd>Ctrl</kbd> + <kbd>1–4</kbd> 切换页面
              </p>
              <p>
                <kbd>Ctrl</kbd> + <kbd>K</kbd> 搜索
              </p>
              <p>
                <kbd>?</kbd> 快捷键帮助
              </p>
              <p>
                <kbd>Esc</kbd> 关闭弹窗
              </p>
            </section>
          </div>
          <p className="form-help">
            输入英文时，字母、数字和方向键不会触发学习快捷键。聚焦按钮后，Enter
            保持按钮原有行为。
          </p>
        </Modal>
      )}
    </>
  );
}
