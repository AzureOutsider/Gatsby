import type { PronunciationSettings, VoiceChoice } from "../../types";

export const defaultPronunciation: PronunciationSettings = {
  accent: "en-US",
  voice: null,
  backupVoice: null,
  rate: 0.9,
};
export const supportedSpeech = () =>
  typeof window !== "undefined" && !!window.speechSynthesis;
export function englishVoices(): SpeechSynthesisVoice[] {
  if (!supportedSpeech()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => /^en(?:[-_]|$)/i.test(voice.lang));
}
export function voiceChoice(voice: SpeechSynthesisVoice): VoiceChoice {
  return {
    uri: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    local: voice.localService,
  };
}
export function voiceKey(voice: VoiceChoice): string {
  return JSON.stringify([voice.uri, voice.name, voice.lang, voice.local]);
}
export function resolveVoice(choice: VoiceChoice, voices = englishVoices()) {
  return voices.find(
    (voice) => voiceKey(voiceChoice(voice)) === voiceKey(choice),
  );
}
export function voiceLabel(voice: VoiceChoice): string {
  const lang = voice.lang.replace("_", "-");
  const accent = /^en-US$/i.test(lang)
    ? "美音"
    : /^en-GB$/i.test(lang)
      ? "英音"
      : lang;
  return `${voice.name} · ${accent} · ${voice.local ? "本地" : "在线"}`;
}
export function validVoiceChoice(value: unknown): value is VoiceChoice {
  if (!value || typeof value !== "object") return false;
  const voice = value as Record<string, unknown>;
  return (
    typeof voice.uri === "string" &&
    typeof voice.name === "string" &&
    !!voice.name &&
    typeof voice.lang === "string" &&
    /^en(?:[-_]|$)/i.test(voice.lang) &&
    typeof voice.local === "boolean"
  );
}
export function validPronunciation(
  value: unknown,
): value is PronunciationSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Record<string, unknown>;
  return (
    ["en-US", "en-GB", "en"].includes(String(settings.accent)) &&
    typeof settings.rate === "number" &&
    Number.isFinite(settings.rate) &&
    settings.rate >= 0.5 &&
    settings.rate <= 1.5 &&
    (settings.voice === null || validVoiceChoice(settings.voice)) &&
    (settings.backupVoice === null || validVoiceChoice(settings.backupVoice))
  );
}
