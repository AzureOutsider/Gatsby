// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
  legacyKeys,
  MIGRATION_KEY,
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

function homeTitles() {
  return Array.from(
    document.querySelectorAll(".home-books h3"),
    (node) => node.textContent,
  );
}

it("selects and reorders homepage books, then keeps them after reload", () => {
  const app = mount();
  const defaults = initialData().items.slice(0, 3);
  expect(homeTitles()).toEqual(defaults.map((book) => book.title));
  fireEvent.click(screen.getByRole("button", { name: "选择展示词书" }));
  const dialog = within(screen.getByRole("dialog"));
  expect(
    (dialog.getByRole("checkbox", { name: /Shots/ }) as HTMLInputElement)
      .disabled,
  ).toBe(true);
  defaults.forEach((book) => {
    fireEvent.click(
      dialog.getByRole("checkbox", { name: new RegExp(book.title) }),
    );
  });
  ["Shots", "Demons", "Enemy"].forEach((title) => {
    fireEvent.click(dialog.getByRole("checkbox", { name: new RegExp(title) }));
  });
  fireEvent.click(dialog.getByRole("button", { name: "上移 Enemy" }));
  fireEvent.click(dialog.getByRole("button", { name: "保存选择" }));
  expect(homeTitles()).toEqual(["Shots", "Enemy", "Demons"]);
  expect(JSON.parse(localStorage.getItem(STATE_KEY)!).homeBookIds).toEqual([
    "shots",
    "enemy",
    "demons",
  ]);
  app.unmount();
  mount();
  expect(homeTitles()).toEqual(["Shots", "Enemy", "Demons"]);
  fireEvent.click(screen.getByRole("button", { name: /^Enemy$/ }));
  expect(
    (screen.getByRole("combobox", { name: "学习来源" }) as HTMLSelectElement)
      .value,
  ).toBe("enemy");
});

it("cancels homepage edits and only restores defaults after saving", () => {
  saveHomeSelection();
  mount();
  fireEvent.click(screen.getByRole("button", { name: "选择展示词书" }));
  fireEvent.click(screen.getByRole("button", { name: "恢复默认" }));
  fireEvent.click(screen.getByRole("button", { name: /^取消$/ }));
  expect(homeTitles()).toEqual(["Shots"]);
  fireEvent.click(screen.getByRole("button", { name: "选择展示词书" }));
  fireEvent.click(screen.getByRole("button", { name: "恢复默认" }));
  fireEvent.click(screen.getByRole("button", { name: "保存选择" }));
  expect(homeTitles()).toEqual(
    initialData()
      .items.slice(0, 3)
      .map((book) => book.title),
  );
});

function saveHomeSelection() {
  localStorage.setItem(
    STATE_KEY,
    JSON.stringify(backup({ ...initialData(), homeBookIds: ["shots"] })),
  );
}

it("rejects an empty homepage selection and keeps the dialog open on save failure", () => {
  saveHomeSelection();
  mount();
  fireEvent.click(screen.getByRole("button", { name: "选择展示词书" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Shots/ }));
  fireEvent.click(screen.getByRole("button", { name: "保存选择" }));
  expect(screen.getByRole("alert").textContent).toContain("请至少选择一本");
  fireEvent.click(screen.getByRole("checkbox", { name: /Enemy/ }));
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  fireEvent.click(screen.getByRole("button", { name: "保存选择" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(homeTitles()).toEqual(["Shots"]);
  expect(screen.getByRole("status").textContent).toContain("保存失败");
});

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

it("shows specific diagnostic information and can reset corrupt testing data", () => {
  localStorage.setItem(legacyKeys.round, "{secret-broken");
  localStorage.setItem("another-app", "preserve");
  mount();
  expect(screen.getByRole("alert").textContent).toContain("当前轮次");
  fireEvent.click(screen.getByRole("button", { name: "查看诊断与处理" }));
  expect(screen.getByText("INVALID_JSON")).toBeTruthy();
  expect(screen.getByText(legacyKeys.round)).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "清除旧测试数据，重新开始" }),
  );
  expect(window.confirm).toHaveBeenCalledOnce();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(localStorage.getItem(legacyKeys.round)).toBeNull();
  expect(localStorage.getItem(MIGRATION_KEY)).toBeNull();
  expect(localStorage.getItem("another-app")).toBe("preserve");
  fireEvent.click(screen.getByRole("button", { name: "开始今天的学习" }));
  fireEvent.click(screen.getByRole("button", { name: "开始这一轮 Enter" }));
  expect(document.querySelector(".study-card")).not.toBeNull();
});
it("cancelling reset leaves test data intact", () => {
  localStorage.setItem(legacyKeys.round, "{broken");
  vi.mocked(window.confirm).mockReturnValue(false);
  mount();
  fireEvent.click(screen.getByRole("button", { name: "查看诊断与处理" }));
  fireEvent.click(
    screen.getByRole("button", { name: "清除旧测试数据，重新开始" }),
  );
  expect(localStorage.getItem(legacyKeys.round)).toBe("{broken");
  expect(localStorage.getItem(STATE_KEY)).toBeNull();
});
it("handles access denied on the localStorage getter without crashing", () => {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("private", "SecurityError");
  });
  mount();
  expect(screen.getByRole("alert").textContent).toContain("浏览器禁止");
  fireEvent.click(screen.getByRole("button", { name: "查看诊断与处理" }));
  expect(screen.getByText("STORAGE_ACCESS_DENIED")).toBeTruthy();
});

it("keeps the last valid in-memory data exportable after a failed reread", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "开始今天的学习" }));
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("", "QuotaExceededError");
  });
  fireEvent.click(screen.getByRole("button", { name: "开始这一轮 Enter" }));
  fireEvent.click(screen.getByRole("button", { name: "备份我的学习" }));
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("", "SecurityError");
  });
  fireEvent.click(screen.getByRole("button", { name: "重新读取" }));
  expect(
    (
      screen.getByRole("button", {
        name: "导出 JSON 备份",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
});
