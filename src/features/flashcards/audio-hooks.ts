import { useEffect, useState, useSyncExternalStore } from "react";
import { audioSnapshot, subscribeAudio } from "./audio";
import { englishVoices, supportedSpeech } from "./voices";

export function useAudio() {
  return useSyncExternalStore(subscribeAudio, audioSnapshot, audioSnapshot);
}
export function useVoices() {
  const [voices, setVoices] = useState(englishVoices);
  const [loading, setLoading] = useState(supportedSpeech() && !voices.length);
  useEffect(() => {
    if (!supportedSpeech()) return;
    const synth = window.speechSynthesis;
    function refresh() {
      const next = englishVoices();
      setVoices(next);
      if (next.length) setLoading(false);
    }
    synth.addEventListener("voiceschanged", refresh);
    refresh();
    const timeout = setTimeout(() => {
      refresh();
      setLoading(false);
    }, 3000);
    return () => {
      synth.removeEventListener("voiceschanged", refresh);
      clearTimeout(timeout);
    };
  }, []);
  return { voices, loading, supported: supportedSpeech() };
}
