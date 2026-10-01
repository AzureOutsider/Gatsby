import type { PronunciationSettings } from "../../types";
import {
  englishVoices,
  resolveVoice,
  supportedSpeech,
  voiceLabel,
} from "./voices";

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
export function stopAudio() {
  generation++;
  cleanup();
  cleanup = () => {};
  utterance = null;
  if (supportedSpeech()) window.speechSynthesis.cancel();
  publish(idle);
}
// Only the explicitly chosen voice is used. A fallback requires a separate user action.
export function playWord(
  text: string,
  settings: PronunciationSettings,
  owner: string,
  backup = false,
) {
  stopAudio();
  const token = generation;
  const choice = backup ? settings.backupVoice : settings.voice;
  publish({
    phase: "preparing",
    owner,
    message: "",
    voice: choice ? voiceLabel(choice) : "",
    backup,
  });
  function fail(message: string) {
    if (token !== generation) return;
    generation++;
    cleanup();
    cleanup = () => {};
    utterance = null;
    if (supportedSpeech()) window.speechSynthesis.cancel();
    publish({ ...state, phase: "failed", message });
  }
  if (!supportedSpeech() || typeof SpeechSynthesisUtterance === "undefined") {
    fail("此浏览器不支持语音播放，请使用支持语音的 Edge 或 Chrome。");
    return;
  }
  if (!choice) {
    fail(
      backup
        ? "尚未选择备用声音，请打开发音设置。"
        : "请先在发音设置中试听并选择主声音。",
    );
    return;
  }
  const synth = window.speechSynthesis;
  let voiceWait: ReturnType<typeof setTimeout> | undefined;
  let speakTimer: ReturnType<typeof setTimeout> | undefined;
  let startWait: ReturnType<typeof setTimeout> | undefined;
  let queued = false;
  cleanup = () => {
    clearTimeout(voiceWait);
    clearTimeout(speakTimer);
    clearTimeout(startWait);
    synth.removeEventListener("voiceschanged", voicesChanged);
  };
  function start() {
    if (token !== generation || queued) return;
    const voice = resolveVoice(choice!);
    if (!voice) {
      fail(
        "已选声音在当前浏览器不可用。请检查语音包，或在发音设置中重新选择；也可主动使用备用声音。",
      );
      return;
    }
    queued = true;
    clearTimeout(voiceWait);
    synth.removeEventListener("voiceschanged", voicesChanged);
    const speech = new SpeechSynthesisUtterance(text);
    utterance = speech; // Retain while active: some engines otherwise drop events.
    speech.voice = voice;
    speech.lang = voice.lang;
    speech.rate = settings.rate;
    speech.onstart = () => {
      if (token !== generation) return;
      clearTimeout(startWait);
      publish({ ...state, phase: "playing" });
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
        network: "在线声音连接失败，请检查网络后重试，或主动使用备用声音。",
        "not-allowed": "浏览器阻止了播放，请再次点击播放按钮并检查站点权限。",
        "voice-unavailable": "已选声音不可用，请在发音设置中重新选择。",
        "language-unavailable":
          "英语语音包不可用，请安装语音包或选择其他声音。",
        "audio-busy": "音频设备正忙，请关闭其他播放后重试。",
        "audio-hardware": "音频设备不可用，请检查输出设备后重试。",
      };
      fail(
        messages[event.error] ||
          "语音播放失败，请重试或在发音设置中选择其他声音。",
      );
    };
    // Let cancel() settle without waiting for any dictionary request.
    speakTimer = setTimeout(() => {
      if (token !== generation) return;
      startWait = setTimeout(
        () => fail("声音准备超过 10 秒，请重试、检查网络或主动使用备用声音。"),
        10000,
      );
      try {
        synth.speak(speech);
      } catch {
        fail("无法启动语音，请重试或在发音设置中选择其他声音。");
      }
    }, 0);
  }
  function voicesChanged() {
    if (englishVoices().length) start();
  }
  if (englishVoices().length) start();
  else {
    synth.addEventListener("voiceschanged", voicesChanged);
    voiceWait = setTimeout(start, 3000);
  }
}
