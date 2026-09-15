// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import App from "../src/App";
import { LearningProvider } from "../src/store/LearningProvider";
import {
  backup,
  createRound,
  feedback,
  advanceCard,
  initialData,
  STATE_KEY,
} from "../src/store/learning";

vi.mock("../src/features/flashcards/audio", () => ({
  warmWord: vi.fn(),
  stopAudio: vi.fn(),
  playWord: vi.fn(),
}));
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function mount() {
  return render(
    <LearningProvider>
      <App />
    </LearningProvider>,
  );
}

it("replacing a backup resets free practice before old cards can write into restored data", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "开始今天的学习" }));
  fireEvent.click(screen.getByRole("button", { name: "进入自由练习" }));
  expect(document.querySelector(".study-card")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "备份我的学习" }));
  const payload = {
    ...backup(initialData()),
    items: [],
    logs: [],
    schedule: {},
    round: null,
    rounds: [],
  };
  fireEvent.change(screen.getByLabelText("选择备份文件"), {
    target: {
      files: [
        {
          name: "empty.json",
          size: 200,
          text: async () => JSON.stringify(payload),
        },
      ],
    },
  });
  await waitFor(() => expect(screen.getByText("empty.json")).toBeTruthy());
  fireEvent.change(screen.getByLabelText("导入方式"), {
    target: { value: "replace" },
  });
  fireEvent.click(screen.getByRole("button", { name: "导入选中的备份" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(document.querySelector(".study-card")).toBeNull();
  expect(
    screen.getByRole("heading", { name: "开始一轮，专注一小组" }),
  ).toBeTruthy();
  expect(JSON.parse(localStorage.getItem(STATE_KEY)!).items).toHaveLength(0);
  expect(JSON.parse(localStorage.getItem(STATE_KEY)!).logs).toHaveLength(0);
});

it("Enter at the completed-card gate enters spelling", () => {
  let data = createRound(initialData(), "core", 1);
  data = advanceCard(feedback(data, "remembered"));
  localStorage.setItem(STATE_KEY, JSON.stringify(backup(data)));
  mount();
  fireEvent.click(screen.getByRole("button", { name: "继续当前轮次" }));
  fireEvent.keyDown(screen.getByRole("main"), { key: "Enter" });
  expect(screen.getByRole("textbox", { name: "英文答案" })).toBeTruthy();
});

it("does not show success or advance the learning state when persistence fails", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "开始今天的学习" }));
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  fireEvent.click(screen.getByRole("button", { name: "开始这一轮 Enter" }));
  expect(document.querySelector(".study-card")).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("保存失败");
});
