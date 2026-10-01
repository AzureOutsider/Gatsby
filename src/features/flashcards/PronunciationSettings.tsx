import { useEffect, useId, useRef, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { Modal } from "../../components/UI";
import { useLearning } from "../../store/LearningProvider";
import type { VoiceChoice } from "../../types";
import { playWord, stopAudio } from "./audio";
import { useAudio, useVoices } from "./audio-hooks";
import {
  defaultPronunciation,
  resolveVoice,
  voiceChoice,
  voiceKey,
  voiceLabel,
} from "./voices";

const samples = [
  { label: "单词", text: "beautiful" },
  { label: "短语", text: "take it for granted" },
  { label: "句子", text: "The melody lingered long after the music stopped." },
];
export function PronunciationSettings({ onClose }: { onClose: () => void }) {
  const { data, update, notify } = useLearning();
  const [draft, setDraft] = useState(
    data.pronunciation || defaultPronunciation,
  );
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [sample, setSample] = useState(samples[0].text);
  const [backup, setBackup] = useState(false);
  const owner = useId();
  const { voices, loading, supported } = useVoices();
  const audio = useAudio();
  const active = audio.owner === owner;
  useEffect(() => {
    stopAudio();
    return stopAudio;
  }, []);
  const visible = voices.filter(
    (voice) =>
      draft.accent === "en" ||
      voice.lang.replace("_", "-").toLowerCase() === draft.accent.toLowerCase(),
  );
  function change(patch: Partial<typeof draft>) {
    stopAudio();
    setDraft((value) => ({ ...value, ...patch }));
    setError("");
  }
  function options(
    selected: VoiceChoice | null,
    choices: SpeechSynthesisVoice[],
  ) {
    return (
      <>
        {selected && !resolveVoice(selected, choices) && (
          <option value={voiceKey(selected)}>
            {voiceLabel(selected)} ·{" "}
            {resolveVoice(selected, voices)
              ? "不在当前口音筛选中"
              : "当前不可用"}
          </option>
        )}
        {choices.map((voice) => (
          <option
            key={voiceKey(voiceChoice(voice))}
            value={voiceKey(voiceChoice(voice))}
          >
            {voiceLabel(voiceChoice(voice))}
          </option>
        ))}
      </>
    );
  }
  function choose(key: string): VoiceChoice | null {
    return (
      voices.map(voiceChoice).find((voice) => voiceKey(voice) === key) || null
    );
  }
  function save() {
    requestAnimationFrame(() => errorRef.current?.focus());
    if (!draft.voice || !resolveVoice(draft.voice, voices)) {
      setError("请选择当前可用的主声音，建议试听后再保存。");
      return;
    }
    if (draft.backupVoice && !resolveVoice(draft.backupVoice, voices)) {
      setError("备用声音当前不可用，请重新选择或设为不使用备用声音。");
      return;
    }
    if (update((value) => ({ ...value, pronunciation: draft }))) {
      notify("发音设置已保存。之后的播放将使用你选定的主声音。");
      onClose();
    } else setError("发音设置保存失败，选择仍保留。请检查数据存储后重试。");
  }
  return (
    <Modal title="发音设置" onClose={onClose} wide>
      <form
        className="editor-form pronunciation-form"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <p className="modal-copy">
          试听后，选一个喜欢的声音。单词、短语和句子都使用同一个主声音。
        </p>
        <p className="form-help">
          本地表示在设备上合成，在线声音可能需要联网；声音质量请以试听为准。这里列出当前浏览器实际提供的英语声音。
        </p>
        <p role="status" className="form-help">
          {!supported
            ? "当前浏览器不支持语音，请使用支持语音的 Edge 或 Chrome。"
            : loading
              ? "正在读取可用英语声音…"
              : voices.length
                ? `已找到 ${voices.length} 个英语声音。`
                : "没有可用英语声音。请检查系统英语语音包，或在其他支持语音的浏览器中打开应用。"}
        </p>
        {error && (
          <p role="alert" className="form-error" ref={errorRef} tabIndex={-1}>
            {error}
          </p>
        )}
        <label>
          口音筛选
          <select
            value={draft.accent}
            onChange={(event) =>
              change({ accent: event.target.value as typeof draft.accent })
            }
          >
            <option value="en-US">美音</option>
            <option value="en-GB">英音</option>
            <option value="en">全部英语声音</option>
          </select>
        </label>
        <label>
          主声音
          <select
            value={draft.voice ? voiceKey(draft.voice) : ""}
            onChange={(event) => change({ voice: choose(event.target.value) })}
          >
            <option value="">请选择并试听声音</option>
            {options(draft.voice, visible)}
          </select>
        </label>
        {!!voices.length && !visible.length && (
          <p className="form-help">
            这个口音没有可选声音，试试“全部英语声音”。
          </p>
        )}
        <label>
          备用声音
          <select
            value={draft.backupVoice ? voiceKey(draft.backupVoice) : ""}
            onChange={(event) =>
              change({ backupVoice: choose(event.target.value) })
            }
          >
            <option value="">不使用备用声音</option>
            {options(draft.backupVoice, voices)}
          </select>
        </label>
        <p className="form-help">
          主声音出错或 2
          秒内未启动时，自动尝试备用声音，并标明播放来源。下一次正常播放仍先尝试主声音。建议选择与主声音不同的备用声音。
        </p>
        <label>
          语速
          <select
            value={draft.rate}
            onChange={(event) => change({ rate: Number(event.target.value) })}
          >
            {Array.from({ length: 11 }, (_, index) => (index + 5) / 10).map(
              (rate) => (
                <option key={rate} value={rate}>
                  {rate.toFixed(1)}×
                  {rate === 1 ? " · 标准" : rate === 0.9 ? " · 默认" : ""}
                </option>
              ),
            )}
            {!Number.isInteger(draft.rate * 10) && (
              <option value={draft.rate}>{draft.rate}×</option>
            )}
          </select>
        </label>
        <section className="voice-audition" aria-label="声音试听">
          <h3>声音试听</h3>
          <label>
            试听声音
            <select
              value={backup ? "backup" : "main"}
              onChange={(event) => {
                stopAudio();
                setBackup(event.target.value === "backup");
              }}
            >
              <option value="main">主声音</option>
              <option value="backup">备用声音</option>
            </select>
          </label>
          <div className="audition-samples">
            {samples.map((value) => (
              <button
                key={value.label}
                type="button"
                className="quiet-btn"
                aria-pressed={sample === value.text}
                onClick={() => {
                  stopAudio();
                  setSample(value.text);
                }}
              >
                {value.label}
              </button>
            ))}
          </div>
          <label>
            试听文本
            <textarea
              rows={2}
              lang="en"
              value={sample}
              maxLength={500}
              onChange={(event) => {
                stopAudio();
                setSample(event.target.value);
              }}
            />
          </label>
          <div className="audition-actions">
            <button
              type="button"
              className="quiet-btn"
              disabled={
                !sample.trim() ||
                !(backup ? draft.backupVoice : draft.voice) ||
                !supported
              }
              onClick={() =>
                playWord(sample.trim(), draft, owner, backup, false)
              }
            >
              <Volume2 size={18} aria-hidden="true" />
              {active && audio.phase === "preparing"
                ? "准备中 · 重新试听"
                : active && audio.phase === "playing"
                  ? "播放中 · 重新试听"
                  : "播放试听"}
            </button>
            {active && ["preparing", "playing"].includes(audio.phase) && (
              <button type="button" className="text-btn" onClick={stopAudio}>
                <Square size={16} aria-hidden="true" />
                停止试听
              </button>
            )}
          </div>
          <p
            className={
              active && audio.phase === "failed" ? "form-error" : "form-help"
            }
            role="status"
            aria-atomic="true"
          >
            {active
              ? audio.phase === "failed"
                ? `试听失败：${audio.message}`
                : audio.phase === "playing"
                  ? `正在试听：${audio.voice}`
                  : audio.phase === "preparing"
                    ? "正在准备试听…"
                    : "试听已结束。"
              : "选择单词、短语或句子试听，也可以输入自己的英文。"}
          </p>
        </section>
        <div className="modal-actions">
          <button type="button" className="quiet-btn" onClick={onClose}>
            取消
          </button>
          <button
            type="submit"
            className="primary-btn"
            disabled={loading || !voices.length}
          >
            保存发音设置
          </button>
        </div>
      </form>
    </Modal>
  );
}
