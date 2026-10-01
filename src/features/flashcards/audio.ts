import type { PronunciationSettings } from "../../types";
import {
  englishVoices,
  resolveVoice,
  supportedSpeech,
  voiceKey,
  voiceLabel,
} from "./voices";

export const START_TIMEOUT_MS = 2000;
export type AudioPhase = "idle" | "preparing" | "playing" | "failed";
export interface AudioState {
  phase: AudioPhase;
  owner: string;
  message: string;
  voice: string;
  backup: boolean;
}
const idle: AudioState = {
  phase: "idle",
  owner: "",
  message: "",
  voice: "",
  backup: false,
};
let state = idle;
let generation = 0;
let cleanup = () => {};
let utterance: SpeechSynthesisUtterance | null = null;
const listeners = new Set<() => void>();
export const audioSnapshot = () => state;
export function subscribeAudio(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function publish(next: AudioState) {
  state = next;
  listeners.forEach((listener) => listener());
}
function cancelAttempt() {
  // Invalidate callbacks before cancel(): some engines dispatch errors synchronously.
  generation++;
  cleanup();
  cleanup = () => {};
  utterance = null;
  if (supportedSpeech()) window.speechSynthesis.cancel();
}
export function stopAudio() {
  cancelAttempt();
  publish(idle);
}
export function playWord(
  text: string,
  settings: PronunciationSettings,
  owner: string,
  backup = false,
  autoFallback = true,
) {
  stopAudio();
  function attempt(useBackup: boolean, mainFailure = "") {
    const token = generation;
    const choice = useBackup ? settings.backupVoice : settings.voice;
    publish({
      phase: "preparing",
      owner,
      message: mainFailure ? "主声音未能播放，正在切换备用声音…" : "",
      voice: choice ? voiceLabel(choice) : "",
      backup: useBackup,
    });
    function fail(message: string, canFallback = true) {
      if (token !== generation) return;
      cancelAttempt();
      const differentBackup =
        settings.backupVoice &&
        settings.voice &&
        voiceKey(settings.backupVoice) !== voiceKey(settings.voice);
      if (
        canFallback &&
        autoFallback &&
        !useBackup &&
        differentBackup &&
        supportedSpeech() &&
        typeof SpeechSynthesisUtterance !== "undefined"
      ) {
        attempt(true, message);
      } else
        publish({
          ...state,
          phase: "failed",
          message: mainFailure
            ? `主声音失败：${mainFailure} 备用声音也失败：${message}`
            : message,
        });
    }
    if (!supportedSpeech() || typeof SpeechSynthesisUtterance === "undefined") {
      fail("此浏览器不支持语音播放，请使用支持语音的 Edge 或 Chrome。", false);
      return;
    }
    if (!choice) {
      fail(
        useBackup
          ? "尚未选择备用声音，请打开发音设置。"
          : "请先在发音设置中试听并选择主声音。",
        false,
      );
      return;
    }
    const synth = window.speechSynthesis;
    let speakTimer: ReturnType<typeof setTimeout> | undefined;
    let queued = false;
    // Includes voice-list waiting: there is no extra 3-second wait on each click.
    const startWait = setTimeout(
      () => fail("声音准备超过 2 秒，请重试、检查网络或重新选择声音。"),
      START_TIMEOUT_MS,
    );
    cleanup = () => {
      clearTimeout(speakTimer);
      clearTimeout(startWait);
      synth.removeEventListener("voiceschanged", voicesChanged);
    };
    function start() {
      if (token !== generation || queued) return;
      const voice = resolveVoice(choice!);
      if (!voice) {
        fail(
          "已选声音在当前浏览器不可用，请检查语音包或在发音设置中重新选择。",
        );
        return;
      }
      queued = true;
      synth.removeEventListener("voiceschanged", voicesChanged);
      const speech = new SpeechSynthesisUtterance(text);
      utterance = speech;
      speech.voice = voice;
      speech.lang = voice.lang;
      speech.rate = settings.rate;
      speech.onstart = () => {
        if (token !== generation) return;
        clearTimeout(startWait);
        publish({ ...state, phase: "playing", message: "" });
      };
      speech.onend = () => {
        if (token !== generation) return;
        generation++;
        cleanup();
        cleanup = () => {};
        utterance = null;
        publish({ ...state, phase: "idle" });
      };
      speech.onerror = (event) => {
        const messages: Record<string, string> = {
          network: "在线声音连接失败，请检查网络后重试。",
          "not-allowed": "浏览器阻止了播放，请再次点击播放并检查站点权限。",
          "voice-unavailable": "已选声音不可用，请在发音设置中重新选择。",
          "language-unavailable":
            "英语语音包不可用，请安装语音包或选择其他声音。",
          "audio-busy": "音频设备正忙，请关闭其他播放后重试。",
          "audio-hardware": "音频设备不可用，请检查输出设备后重试。",
          canceled: "播放已取消，请点击重试。",
          interrupted: "播放已中断，请点击重试。",
        };
        fail(
          messages[event.error] || "语音播放失败，请重试或选择其他声音。",
          !["canceled", "interrupted"].includes(event.error),
        );
      };
      speakTimer = setTimeout(() => {
        if (token !== generation) return;
        try {
          synth.speak(speech);
        } catch {
          fail("无法启动语音，请重试或选择其他声音。");
        }
      }, 0);
    }
    function voicesChanged() {
      if (englishVoices().length) start();
    }
    if (englishVoices().length) start();
    else synth.addEventListener("voiceschanged", voicesChanged);
  }
  attempt(backup);
}
