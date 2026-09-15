// No request is allowed to block a click. Fetch and preload dictionary audio only as an enhancement.
const readyAudio = new Map<string, HTMLAudioElement>();
const fetching = new Set<string>();
let currentAudio: HTMLAudioElement | null = null;
let speechTimer: ReturnType<typeof setTimeout> | undefined;
let generation = 0;
export function stopAudio() {
  generation++;
  clearTimeout(speechTimer);
  currentAudio?.pause();
  currentAudio = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
function speak(text: string, notify: (message: string) => void, token: number) {
  if (!("speechSynthesis" in window)) {
    notify("此浏览器没有语音功能，请使用 Edge 或 Chrome 并启用英语语音。");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const voice =
    voices.find((v) => /^en[-_]US$/i.test(v.lang) && v.localService) ||
    voices.find((v) => /^en/i.test(v.lang));
  if (voice) utterance.voice = voice;
  utterance.onerror = (event) => {
    if (
      token === generation &&
      !["interrupted", "canceled"].includes(event.error)
    )
      notify("英语语音暂不可用，请检查系统英语语音包或网络。");
  };
  speechTimer = setTimeout(() => {
    if (token === generation) window.speechSynthesis.speak(utterance);
  }, 0);
}
export async function warmWord(text: string) {
  const word = text.trim().toLowerCase();
  if (!/^[a-z'-]+$/.test(word) || readyAudio.has(word) || fetching.has(word))
    return;
  fetching.add(word);
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(3500), cache: "force-cache" },
    );
    if (!response.ok) return;
    const data = await response.json();
    const url = data?.[0]?.phonetics?.find((entry: { audio?: string }) =>
      entry.audio?.startsWith("https://"),
    )?.audio;
    if (!url) return;
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = url;
    audio.addEventListener(
      "canplaythrough",
      () => readyAudio.set(word, audio),
      { once: true },
    );
    audio.load();
  } catch {
    /* Optional enhancement: speech synthesis remains available. */
  }
}
export function playWord(text: string, notify: (message: string) => void) {
  stopAudio();
  const token = generation,
    audio = readyAudio.get(text.trim().toLowerCase());
  if (audio && audio.readyState >= 3) {
    currentAudio = audio;
    audio.currentTime = 0;
    let started = false;
    const fallback = () => {
      if (token === generation && !started) {
        clearTimeout(timeout);
        audio.pause();
        speak(text, notify, token);
      }
    };
    const timeout = setTimeout(fallback, 700);
    audio.onplaying = () => {
      started = true;
      clearTimeout(timeout);
    };
    audio.onerror = fallback;
    void audio.play().catch(fallback);
  } else speak(text, notify, token);
  void warmWord(text);
}
