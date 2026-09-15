import { describe, expect, it } from "vitest";
import {
  advanceCard,
  advanceSpelling,
  backup,
  cardKey,
  checkSpelling,
  createRound,
  enterSpelling,
  feedback,
  finishRound,
  importBackup,
  initialData,
  legacyKeys,
  loadData,
  MIGRATION_KEY,
  normalizeAnswer,
  repeatCard,
  resetBook,
  saveBook,
  saveData,
  STATE_KEY,
  statistics,
  validateBackup,
} from "../src/store/learning";
import { parseUnits } from "../src/features/library/parse";

function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    map,
  };
}
function roundData() {
  return createRound(initialData(), "core", 2);
}
function gateData() {
  let data = roundData();
  while (data.round?.stage === "cards")
    data = advanceCard(feedback(data, "remembered"));
  return data;
}

describe("existing learning behavior", () => {
  it("keeps all seed books including Viva La Vida", () => {
    expect(initialData().items).toHaveLength(5);
    expect(
      initialData().items.find((book) => book.id === "viva-la-vida")!.units
        .length,
    ).toBeGreaterThan(10);
  });
  it("normalizes capitalization, apostrophes and punctuation", () => {
    expect(normalizeAnswer(" Hold-something / dear! ")).toBe(
      "hold something dear",
    );
    expect(normalizeAnswer("WHAT’S  UP?")).toBe("whats up");
  });
  it("starts a fixed group and does not replace an active round", () => {
    const data = roundData();
    expect(data.round!.cards).toHaveLength(2);
    expect(createRound(data, "all", 5)).toBe(data);
  });
  it("does not advance before revealing the answer", () => {
    const data = roundData();
    expect(advanceCard(data)).toBe(data);
  });
  it("keeps forgotten answer visible and queues one later encounter", () => {
    let data = roundData();
    const first = data.round!.cards[0].prompt;
    data = feedback(data, "forgot");
    expect(data.round!.cardPhase).toBe("answer");
    expect(data.round!.cardQueue).toHaveLength(3);
    expect(feedback(data, "forgot")).toBe(data);
    expect(repeatCard(data)).toBe(data);
    data = advanceCard(data);
    data = advanceCard(feedback(data, "remembered"));
    expect(data.round!.cardQueue[data.round!.cardIndex].prompt).toBe(first);
    data = feedback(data, "forgot");
    expect(data.round!.cardQueue).toHaveLength(3);
    data = advanceCard(data);
    expect(data.round!.stage).toBe("gate");
  });
  it("allows remembered cards to be recalled again", () => {
    let data = feedback(roundData(), "remembered");
    data = repeatCard(data);
    expect(data.round!.cardPhase).toBe("prompt");
    expect(data.round!.cardIndex).toBe(0);
  });
  it("offers spelling for only the original cards, not repeated copies", () => {
    let data = feedback(roundData(), "forgot");
    while (data.round?.stage === "cards") {
      if (data.round.cardPhase === "prompt")
        data = feedback(data, "remembered");
      data = advanceCard(data);
    }
    data = enterSpelling(data);
    expect(data.round!.spellingQueue).toHaveLength(2);
  });
  it("puts each wrong spelling at the end until correct", () => {
    let data = enterSpelling(gateData());
    const first = data.round!.cards[0].prompt;
    data = checkSpelling(data, "wrong");
    expect(data.round!.spellingQueue).toHaveLength(3);
    expect(data.round!.spellingPhase).toBe("answer");
    expect(checkSpelling(data, "wrong")).toBe(data);
    data = advanceSpelling(data);
    expect(
      data.round!.spellingQueue[data.round!.spellingIndex].prompt,
    ).not.toBe(first);
    data = advanceSpelling(
      checkSpelling(data, data.round!.spellingQueue[1].prompt),
    );
    expect(data.round!.spellingQueue[2].prompt).toBe(first);
    data = advanceSpelling(checkSpelling(data, "still wrong"));
    expect(data.round!.spellingQueue).toHaveLength(4);
    data = advanceSpelling(checkSpelling(data, first.toUpperCase()));
    expect(data.round).toBeNull();
    expect(data.rounds[0].spellingWrong).toBe(2);
    expect(data.rounds[0].spellingCompleted).toBe(true);
  });
  it("allows skipping spelling with accurate history", () => {
    const data = finishRound(gateData(), false);
    expect(data.round).toBeNull();
    expect(data.rounds[0].spellingCompleted).toBe(false);
  });
  it("does not count an abandoned round as complete", () => {
    const data = { ...feedback(roundData(), "remembered"), round: null };
    expect(data.rounds).toHaveLength(0);
    expect(data.logs).toHaveLength(1);
  });
});
describe("migration and persistence", () => {
  it("migrates legacy answered cards, settings and logs without modifying legacy keys", () => {
    const storage = memory();
    const original = feedback(roundData(), "forgot");
    for (const [name, key] of Object.entries(legacyKeys)) {
      const value = original[name as keyof typeof original];
      storage.setItem(
        key,
        name === "practiceMode" ? String(value) : JSON.stringify(value),
      );
    }
    const loaded = loadData(storage);
    expect(loaded.warning).toBe("");
    expect(loaded.data.round!.cardPhase).toBe("answer");
    expect(loaded.data.logs).toHaveLength(1);
    expect(storage.getItem(MIGRATION_KEY)).not.toBeNull();
    saveData(storage, loaded.data);
    expect(JSON.parse(storage.getItem(legacyKeys.round)!)).toEqual(
      original.round,
    );
    expect(loadData(storage).data.round).toEqual(original.round);
  });
  it("resumes a wrong spelling answer and its queue after reload", () => {
    const storage = memory(),
      data = checkSpelling(enterSpelling(gateData()), "wrong");
    saveData(storage, data);
    const loaded = loadData(storage).data;
    expect(loaded.round).toEqual(data.round);
    expect(advanceSpelling(loaded).round!.spellingIndex).toBe(1);
  });
  it("preserves deliberately empty libraries", () => {
    const storage = memory();
    storage.setItem(legacyKeys.items, "[]");
    expect(loadData(storage).data.items).toEqual([]);
  });
  it("preserves invalid original data and surfaces a warning", () => {
    const storage = memory();
    storage.setItem(legacyKeys.round, "{broken");
    const loaded = loadData(storage);
    expect(loaded.warning).not.toBe("");
    expect(storage.getItem(legacyKeys.round)).toBe("{broken");
    expect(storage.getItem(STATE_KEY)).toBeNull();
  });
  it("never overwrites an earlier migration snapshot", () => {
    const storage = memory();
    storage.setItem(MIGRATION_KEY, "original");
    storage.setItem(legacyKeys.items, "[]");
    loadData(storage);
    expect(storage.getItem(MIGRATION_KEY)).toBe("original");
  });
  it("reports storage access failure without losing data", () => {
    expect(
      loadData({
        getItem() {
          throw new Error("blocked");
        },
        setItem() {},
      }).warning,
    ).not.toBe("");
  });
  it("exports a v1-compatible backup and deduplicates merged logs", () => {
    const data = feedback(roundData(), "remembered");
    const exported = backup(data);
    validateBackup(exported);
    expect(exported.version).toBe(1);
    const next = importBackup(data, exported, false);
    expect(next.logs).toHaveLength(1);
    expect(next.round!.id).toBe(data.round!.id);
  });
  it("replaces data only from a validated backup", () => {
    const data = initialData(),
      replacement = {
        ...backup(data),
        items: [],
        logs: [],
        rounds: [],
        round: null,
      };
    expect(importBackup(data, replacement, true).items).toHaveLength(0);
    expect(() =>
      importBackup(data, { ...replacement, items: [{ id: "bad" }] }, true),
    ).toThrow();
  });
  it("rejects future versions and malformed active indices", () => {
    expect(() =>
      validateBackup({ ...backup(initialData()), version: 2 }),
    ).toThrow();
    const payload = backup(roundData());
    payload.round!.cardIndex = 900;
    expect(() => validateBackup(payload)).toThrow();
  });
});
describe("content and statistics", () => {
  it("removes schedules for deleted units and invalidates affected rounds", () => {
    const data = feedback(roundData(), "remembered"),
      book = data.items.find((book) => book.id === "core")!;
    const next = saveBook(data, { ...book, units: book.units.slice(1) });
    expect(next.round).toBeNull();
    expect(next.schedule[cardKey(data.round!.cards[0])]).toBeUndefined();
  });
  it("deletes only the requested book and related records", () => {
    const data = feedback(roundData(), "remembered");
    const next = resetBook(data, "core", true);
    expect(next.items).toHaveLength(4);
    expect(next.items.some((book) => book.id === "viva-la-vida")).toBe(true);
    expect(next.logs).toHaveLength(0);
    expect(next.round).toBeNull();
  });
  it("parses editable units, quoted CSV, Markdown and subtitles", () => {
    expect(
      parseUnits("linger | 逗留 | The melody lingered. | note", "单词书")[0]
        .context,
    ).toBe("The melody lingered.");
    expect(
      parseUnits('"dear","亲爱的","Hello, dear!"', "单词书")[0].context,
    ).toBe("Hello, dear!");
    expect(parseUnits("# Words\n- glimmer：微光", "歌曲笔记")[0].prompt).toBe(
      "glimmer",
    );
    expect(
      parseUnits("1\n00:00:01,000 --> 00:00:02,000\nHello there!", "影视台词"),
    ).toHaveLength(1);
  });
  it("reports real feedback rather than seed progress", () => {
    const data = initialData();
    expect(statistics(data).mastered).toBe(0);
    const next = feedback(createRound(data, "core", 2), "remembered");
    expect(statistics(next).today).toBe(1);
    expect(statistics(next).mastered).toBe(1);
    expect(statistics(next).streak).toBe(1);
  });
});
