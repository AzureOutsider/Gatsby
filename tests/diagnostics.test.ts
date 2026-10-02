import { expect, it } from "vitest";
import {
  initialData,
  legacyKeys,
  loadData,
  resetLearningData,
  MIGRATION_KEY,
  STATE_KEY,
} from "../src/store/learning";
import { diagnoseData } from "../src/store/diagnostics";

function storage(values: Record<string, string>) {
  return {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => {
      values[key] = value;
    },
  };
}
it("identifies invalid JSON without disclosing its contents", () => {
  const loaded = loadData(storage({ [legacyKeys.round]: "{private-fragment" }));
  expect(loaded.warning).toContain("当前轮次");
  expect(loaded.warning).toContain("JSON");
  expect(loaded.warning).not.toContain("private-fragment");
});
it("identifies the exact incompatible field in the content library", () => {
  const data = initialData();
  delete (data.items[0].units[0] as Partial<(typeof data.items)[0]["units"][0]>)
    .note;
  expect(
    loadData(storage({ [STATE_KEY]: JSON.stringify(data) })).warning,
  ).toContain("items[0].units[0].note");
});
it("distinguishes browser access restrictions from corrupted data", () => {
  const loaded = loadData({
    getItem() {
      throw new DOMException("secret", "SecurityError");
    },
    setItem() {},
  });
  expect(loaded.warning).toContain("浏览器禁止");
  expect(loaded.warning).not.toContain("secret");
});
it("reports source key and field for malformed legacy entries", () => {
  const loaded = loadData(
    storage({
      [legacyKeys.logs]: JSON.stringify([
        { itemId: "x", prompt: "private", at: "today", rating: "bad" },
      ]),
    }),
  );
  expect(loaded.diagnostic).toMatchObject({
    code: "INVALID_SCHEMA",
    storageKey: legacyKeys.logs,
    field: "logs[0].rating",
    section: "复习记录",
  });
  expect(JSON.stringify(loaded.diagnostic)).not.toContain("private");
});
it("classifies storage quota errors without exposing native exception text", () => {
  const diagnostic = diagnoseData(
    new DOMException("private text", "QuotaExceededError"),
    "Gatsby 数据",
    STATE_KEY,
    "state",
    "save",
  );
  expect(diagnostic.code).toBe("STORAGE_QUOTA_EXCEEDED");
  expect(JSON.stringify(diagnostic)).not.toContain("private text");
});
it("resets only the known application keys and reloads cleanly", () => {
  const values: Record<string, string> = {
    [STATE_KEY]: "{broken",
    [MIGRATION_KEY]: "old snapshot",
    unrelated: "untouched",
    "english-study-unrelated": "also untouched",
  };
  for (const key of Object.values(legacyKeys)) values[key] = "old";
  const port = {
    ...storage(values),
    removeItem: (key: string) => {
      delete values[key];
    },
  };
  const result = resetLearningData(port);
  expect(result.remainingKeys).toEqual([]);
  expect(result.data.items).toEqual(initialData().items);
  expect(result.data.round).toBeNull();
  expect(result.data.logs).toEqual([]);
  for (const key of [...Object.values(legacyKeys), MIGRATION_KEY])
    expect(values[key]).toBeUndefined();
  expect(values.unrelated).toBe("untouched");
  expect(values["english-study-unrelated"]).toBe("also untouched");
  expect(loadData(port).warning).toBe("");
  expect(loadData(port).data).toMatchObject({
    round: null,
    rounds: [],
    logs: [],
    schedule: {},
  });
});
it("does not delete anything if fresh state cannot be saved", () => {
  const values: Record<string, string> = {
    [legacyKeys.items]: "old",
    [STATE_KEY]: "{broken",
  };
  const before = JSON.stringify(values);
  expect(() =>
    resetLearningData({
      ...storage(values),
      setItem() {
        throw new DOMException("", "QuotaExceededError");
      },
      removeItem(key) {
        delete values[key];
      },
    }),
  ).toThrow();
  expect(JSON.stringify(values)).toBe(before);
});
it("reports incomplete cleanup but keeps a usable fresh state", () => {
  const values = { [legacyKeys.items]: "old" };
  const port = {
    ...storage(values),
    removeItem() {
      throw new DOMException("", "SecurityError");
    },
  };
  expect(resetLearningData(port).remainingKeys).toContain(legacyKeys.items);
  expect(loadData(port).warning).toBe("");
});
