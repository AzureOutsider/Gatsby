// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import App from "../src/App";
import { LearningProvider } from "../src/store/LearningProvider";
import {
  audioSnapshot,
  playWord,
  stopAudio,
} from "../src/features/flashcards/audio";
import {
  defaultPronunciation,
  voiceChoice,
  voiceKey,
} from "../src/features/flashcards/voices";
import {
  backup,
  importBackup,
  initialData,
  loadData,
  STATE_KEY,
  validateBackup,
} from "../src/store/learning";

const online = {
  voiceURI: "online-us",
  name: "Online US",
  lang: "en-US",
  localService: false,
  default: false,
} as SpeechSynthesisVoice;
const local = {
  voiceURI: "local-us",
  name: "Local US",
  lang: "en-US",
  localService: true,
  default: true,
} as SpeechSynthesisVoice;
const british = {
  voiceURI: "local-gb",
  name: "Local GB",
  lang: "en-GB",
  localService: true,
  default: false,
} as SpeechSynthesisVoice;
const settings = {
  ...defaultPronunciation,
  voice: voiceChoice(online),
  backupVoice: voiceChoice(local),
  rate: 0.8,
};
class FakeUtterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = "";
  rate = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}
let voices: SpeechSynthesisVoice[];
let synth: EventTarget & {
  getVoices: ReturnType<typeof vi.fn>;
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
};
let fetchSpy: ReturnType<typeof vi.fn>;
function latest(): FakeUtterance {
  return synth.speak.mock.calls.at(-1)![0];
}
beforeEach(() => {
  vi.useFakeTimers();
  voices = [online, local, british];
  synth = Object.assign(new EventTarget(), {
    getVoices: vi.fn(() => voices),
    speak: vi.fn(),
    cancel: vi.fn(),
  });
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubGlobal("scrollTo", vi.fn());
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  stopAudio();
});
afterEach(() => {
  cleanup();
  stopAudio();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fixed voice playback", () => {
  it("uses the exact chosen online voice and rate for words, phrases and sentences without dictionary requests", () => {
    for (const text of [
      "beautiful",
      "take it for granted",
      "The melody lingered.",
    ]) {
      playWord(text, settings, "card");
      expect(audioSnapshot().phase).toBe("preparing");
      vi.advanceTimersByTime(0);
      const utterance = latest();
      expect(utterance).toMatchObject({
        text,
        voice: online,
        lang: "en-US",
        rate: 0.8,
      });
      utterance.onstart?.();
      expect(audioSnapshot().phase).toBe("playing");
      utterance.onend?.();
      expect(audioSnapshot().phase).toBe("idle");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("keeps only the newest click and ignores canceled utterance events", () => {
    playWord("old", settings, "card");
    vi.advanceTimersByTime(0);
    const old = latest();
    playWord("intermediate", settings, "card");
    playWord("new", settings, "card");
    vi.advanceTimersByTime(0);
    expect(synth.speak).toHaveBeenCalledTimes(2);
    expect(latest().text).toBe("new");
    old.onstart?.();
    old.onerror?.({ error: "canceled" });
    old.onend?.();
    expect(audioSnapshot().phase).toBe("preparing");
    latest().onstart?.();
    expect(audioSnapshot().phase).toBe("playing");
    stopAudio();
    latest().onerror?.({ error: "interrupted" });
    expect(audioSnapshot().phase).toBe("idle");
  });
  it("waits for asynchronously loaded voices, then cleans up a canceled wait", () => {
    voices = [];
    playWord("word", settings, "card");
    vi.advanceTimersByTime(1000);
    expect(synth.speak).not.toHaveBeenCalled();
    voices = [online];
    synth.dispatchEvent(new Event("voiceschanged"));
    vi.advanceTimersByTime(0);
    expect(latest().voice).toBe(online);
    voices = [];
    playWord("stopped", settings, "card");
    stopAudio();
    voices = [online];
    synth.dispatchEvent(new Event("voiceschanged"));
    vi.advanceTimersByTime(3000);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(audioSnapshot().phase).toBe("idle");
  });
  it("fails on missing or unselected voices and on unsupported browsers without choosing another voice", () => {
    playWord("word", defaultPronunciation, "card");
    expect(audioSnapshot().message).toContain("选择主声音");
    voices = [local];
    playWord("word", settings, "card");
    expect(audioSnapshot().message).toContain("当前浏览器不可用");
    expect(synth.speak).not.toHaveBeenCalled();
    voices = [];
    playWord("word", settings, "card");
    vi.advanceTimersByTime(3000);
    expect(audioSnapshot().phase).toBe("failed");
    vi.stubGlobal("speechSynthesis", undefined);
    playWord("word", settings, "card");
    expect(audioSnapshot().message).toContain("不支持");
  });
  it("reports network and start timeout failures, using backup only when explicitly requested", () => {
    playWord("word", settings, "card");
    vi.advanceTimersByTime(0);
    latest().onerror?.({ error: "network" });
    expect(audioSnapshot().message).toContain("连接失败");
    expect(synth.speak).toHaveBeenCalledTimes(1);
    playWord("word", settings, "card", true);
    vi.advanceTimersByTime(0);
    expect(latest().voice).toBe(local);
    expect(audioSnapshot().backup).toBe(true);
    latest().onstart?.();
    latest().onend?.();
    playWord("word", settings, "card");
    vi.advanceTimersByTime(10000);
    expect(latest().voice).toBe(online);
    expect(audioSnapshot().message).toContain("超过 10 秒");
    latest().onstart?.();
    expect(audioSnapshot().phase).toBe("failed");
  });
  it("turns synchronous engine failures into an actionable error", () => {
    synth.speak.mockImplementation(() => {
      throw new Error("engine");
    });
    playWord("word", settings, "card");
    vi.advanceTimersByTime(0);
    expect(audioSnapshot().message).toContain("无法启动");
  });
});

describe("pronunciation data and UI", () => {
  function mount() {
    return render(
      <LearningProvider>
        <App />
      </LearningProvider>,
    );
  }
  it("preserves choices in reloads and backups, accepts older backups and rejects invalid settings", () => {
    const data = { ...initialData(), pronunciation: settings };
    localStorage.setItem(STATE_KEY, JSON.stringify(backup(data)));
    expect(loadData(localStorage).data.pronunciation).toEqual(settings);
    expect(
      importBackup(initialData(), backup(data), true).pronunciation,
    ).toEqual(settings);
    const older = backup(initialData());
    delete older.pronunciation;
    expect(importBackup(initialData(), older, true).pronunciation).toEqual(
      defaultPronunciation,
    );
    expect(importBackup(data, older, false).pronunciation).toEqual(settings);
    for (const rate of [0, 2, NaN, "0.9"])
      expect(() =>
        validateBackup({
          ...backup(data),
          pronunciation: { ...settings, rate },
        }),
      ).toThrow(/pronunciation/);
    expect(() =>
      validateBackup({
        ...backup(data),
        pronunciation: {
          ...settings,
          voice: { ...settings.voice, lang: "zh-CN" },
        },
      }),
    ).toThrow(/pronunciation/);
  });
  it("loads delayed voices, filters accents, auditions drafts and saves the chosen source after a reload", () => {
    voices = [];
    const app = mount();
    fireEvent.click(screen.getByRole("button", { name: "发音设置" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText(/正在读取可用英语声音/)).toBeTruthy();
    voices = [online, local, british];
    act(() => synth.dispatchEvent(new Event("voiceschanged")));
    expect(
      within(dialog.getByLabelText("主声音")).getByRole("option", {
        name: /Online US · 美音 · 在线/,
      }),
    ).toBeTruthy();
    expect(
      dialog.queryByRole("option", { name: /Local GB · 英音 · 本地/ }),
    ).toBeTruthy(); // backup choices include all accents
    fireEvent.change(dialog.getByLabelText("口音筛选"), {
      target: { value: "en-GB" },
    });
    expect(
      within(dialog.getByLabelText("主声音")).queryByRole("option", {
        name: /Online US/,
      }),
    ).toBeNull();
    fireEvent.change(dialog.getByLabelText("主声音"), {
      target: { value: voiceKey(voiceChoice(british)) },
    });
    fireEvent.click(dialog.getByRole("button", { name: "句子" }));
    fireEvent.click(dialog.getByRole("button", { name: "播放试听" }));
    act(() => vi.advanceTimersByTime(0));
    expect(latest().voice).toBe(british);
    expect(latest().text).toContain("melody");
    expect(localStorage.getItem(STATE_KEY)).toBeNull();
    act(() => latest().onstart?.());
    expect(
      dialog.getByRole("button", { name: /播放中 · 重新试听/ }),
    ).toBeTruthy();
    fireEvent.click(dialog.getByRole("button", { name: "保存发音设置" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(audioSnapshot().phase).toBe("idle");
    app.unmount();
    mount();
    fireEvent.click(screen.getByRole("button", { name: "发音设置" }));
    expect((screen.getByLabelText("主声音") as HTMLSelectElement).value).toBe(
      voiceKey(voiceChoice(british)),
    );
  });
  it("keeps settings unchanged on cancel and retains drafts if saving fails", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "发音设置" }));
    fireEvent.change(screen.getByLabelText("主声音"), {
      target: { value: voiceKey(voiceChoice(online)) },
    });
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(localStorage.getItem(STATE_KEY)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "发音设置" }));
    fireEvent.click(screen.getByRole("button", { name: "保存发音设置" }));
    expect(screen.getByRole("alert").textContent).toContain("主声音");
    fireEvent.change(screen.getByLabelText("主声音"), {
      target: { value: voiceKey(voiceChoice(online)) },
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("", "QuotaExceededError");
    });
    fireEvent.click(screen.getByRole("button", { name: "保存发音设置" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("保存失败");
    expect((screen.getByLabelText("主声音") as HTMLSelectElement).value).toBe(
      voiceKey(voiceChoice(online)),
    );
  });
  it("displays playback phases and offers explicit backup, stopping when advancing or navigating", () => {
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify(backup({ ...initialData(), pronunciation: settings })),
    );
    mount();
    fireEvent.click(screen.getByRole("button", { name: "开始今天的学习" }));
    fireEvent.click(screen.getByRole("button", { name: "开始这一轮 Enter" }));
    fireEvent.click(screen.getByRole("button", { name: /的发音 · 播放发音/ }));
    expect(
      screen.getByRole("button", { name: /的发音 · 准备中/ }),
    ).toBeTruthy();
    act(() => vi.advanceTimersByTime(0));
    act(() => latest().onstart?.());
    expect(
      screen.getByRole("button", { name: /的发音 · 播放中/ }),
    ).toBeTruthy();
    act(() => latest().onerror?.({ error: "network" }));
    expect(
      screen.getByRole("button", { name: /的发音 · 播放失败/ }),
    ).toBeTruthy();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "使用备用声音播放" }));
    act(() => vi.advanceTimersByTime(0));
    expect(latest().voice).toBe(local);
    act(() => latest().onstart?.());
    fireEvent.click(screen.getByRole("button", { name: /记得 2/ }));
    expect(audioSnapshot().phase).toBe("playing");
    fireEvent.click(screen.getByRole("button", { name: /下一个 Enter/ }));
    expect(audioSnapshot().phase).toBe("idle");
    fireEvent.click(screen.getByRole("button", { name: /的发音 · 播放发音/ }));
    act(() => vi.advanceTimersByTime(0));
    expect(latest().voice).toBe(online);
    fireEvent.click(screen.getByRole("button", { name: "内容库" }));
    expect(audioSnapshot().phase).toBe("idle");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
