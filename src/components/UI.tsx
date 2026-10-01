import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X, Volume2, Square } from "lucide-react";
import {
  playWord,
  stopAudio,
  audioSnapshot,
} from "../features/flashcards/audio";
import { useAudio } from "../features/flashcards/audio-hooks";
import { defaultPronunciation } from "../features/flashcards/voices";
import { PronunciationSettings } from "../features/flashcards/PronunciationSettings";
import { useLearning } from "../store/LearningProvider";

export function PageHead({
  title,
  copy,
  children,
}: {
  title: string;
  copy: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        <p>{copy}</p>
      </div>
      {children}
    </header>
  );
}
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(Math.max(0, Math.min(100, value)))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
export function Sound({ text }: { text: string }) {
  const { data } = useLearning();
  const settings = data.pronunciation || defaultPronunciation;
  const settingsKey = JSON.stringify(settings);
  const owner = useId();
  const audio = useAudio();
  const [open, setOpen] = useState(false);
  const active = audio.owner === owner;
  const phase = active ? audio.phase : "idle";
  useEffect(
    () => () => {
      if (audioSnapshot().owner === owner) stopAudio();
    },
    [owner, text, settingsKey],
  );
  const label =
    phase === "preparing"
      ? "准备中"
      : phase === "playing"
        ? "播放中"
        : phase === "failed"
          ? "播放失败"
          : "播放发音";
  return (
    <div className="sound-control">
      <div className="sound-actions">
        <button
          className="quiet-btn sound-btn"
          title="播放发音 · P；再次点击重新播放"
          aria-label={`播放 ${text} 的发音 · ${label}`}
          aria-describedby={`${owner}-status`}
          onClick={() => playWord(text, settings, owner)}
        >
          <Volume2 size={20} aria-hidden="true" />
          {label}
        </button>
        {["preparing", "playing"].includes(phase) && (
          <button
            className="icon-btn"
            aria-label="停止发音"
            onClick={stopAudio}
          >
            <Square size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <p
        id={`${owner}-status`}
        className={
          phase === "failed" ? "form-error sound-status" : "muted sound-status"
        }
        role="status"
        aria-atomic="true"
      >
        {phase === "failed"
          ? audio.message
          : phase === "preparing"
            ? "正在准备声音…"
            : phase === "playing"
              ? `${audio.backup ? "备用声音：" : ""}${audio.voice}`
              : active && audio.backup
                ? `已使用备用声音：${audio.voice}`
                : ""}
      </p>
      {phase === "failed" && (
        <div className="sound-recovery">
          {!!settings.backupVoice && !audio.backup && (
            <button
              className="text-btn"
              onClick={() => playWord(text, settings, owner, true)}
            >
              使用备用声音播放
            </button>
          )}
          <button className="text-btn" onClick={() => setOpen(true)}>
            打开发音设置
          </button>
        </div>
      )}
      {open && <PronunciationSettings onClose={() => setOpen(false)} />}
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className={`modal ${wide ? "wide-modal" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <h2 id={id}>{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="关闭">
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
