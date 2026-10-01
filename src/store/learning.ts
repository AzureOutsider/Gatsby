import seed from "../data/seed.json";
import {
  DataValidationError,
  diagnoseData,
  type DataDiagnostic,
} from "./diagnostics";
import type {
  Backup,
  Book,
  Card,
  Feedback,
  LearningData,
  Log,
  Rating,
  Round,
  Schedule,
} from "../types";

export const STATE_KEY = "gatsby-learning-state-v1";
export const MIGRATION_KEY = "gatsby-before-redesign-v1";
export const SEED_MIGRATION_KEY = "gatsby-seed-the-line-v1";
export const SHOTS_SEED_MIGRATION_KEY = "gatsby-seed-shots-v1";
export const DEMONS_SEED_MIGRATION_KEY = "gatsby-seed-demons-v1";
export const ENEMY_SEED_MIGRATION_KEY = "gatsby-seed-enemy-v1";
export const SEED_CATALOG_MIGRATION_KEY = "gatsby-seed-catalog-v1";
// Books present before automatic catalog synchronization was introduced.
// New books added to seed.json after this baseline are migrated automatically.
const SEED_CATALOG_BASELINE_IDS = new Set([
  "duvet",
  "paradise",
  "core",
  "office",
  "viva-la-vida",
  "the-line",
  "shots",
  "demons",
  "enemy",
]);
export const legacyKeys = {
  items: "english-study-library-v1",
  logs: "english-study-logs-v1",
  schedule: "english-study-schedule-v1",
  round: "english-study-round-v1",
  rounds: "english-study-rounds-v1",
  roundSize: "english-study-round-size-v1",
  dailyGoal: "english-study-daily-goal-v1",
  practiceMode: "english-study-practice-mode-v1",
} as const;
export type StoragePort = Pick<Storage, "getItem" | "setItem">;
const clone = <T>(value: T): T => structuredClone(value);
export function initialData(): LearningData {
  return {
    items: clone(seed) as Book[],
    logs: [],
    schedule: {},
    round: null,
    rounds: [],
    roundSize: 10,
    dailyGoal: 10,
    practiceMode: "cards",
  };
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function validUnit(value: unknown): boolean {
  return (
    object(value) &&
    ["prompt", "answer", "context", "note", "kind"].every(
      (key) => typeof value[key] === "string",
    ) &&
    !!value.prompt
  );
}
function validCard(value: unknown): boolean {
  return (
    validUnit(value) &&
    object(value) &&
    typeof value.itemId === "string" &&
    typeof value.itemTitle === "string"
  );
}
export function validRound(value: unknown): value is Round {
  if (
    !object(value) ||
    !Array.isArray(value.cards) ||
    !value.cards.length ||
    !value.cards.every(validCard) ||
    !Array.isArray(value.cardQueue) ||
    !value.cardQueue.length ||
    !value.cardQueue.every(validCard)
  )
    return false;
  if (
    !["cards", "gate", "spelling"].includes(String(value.stage)) ||
    typeof value.id !== "string" ||
    typeof value.sourceTitle !== "string" ||
    typeof value.startedAt !== "string"
  )
    return false;
  if (
    !Number.isInteger(value.cardIndex) ||
    Number(value.cardIndex) < 0 ||
    Number(value.cardIndex) > value.cardQueue.length
  )
    return false;
  if (
    value.stage === "cards" &&
    Number(value.cardIndex) >= value.cardQueue.length
  )
    return false;
  if (!["prompt", "answer"].includes(String(value.cardPhase))) return false;
  if (
    value.stage === "spelling" &&
    value.spellingQueue !== undefined &&
    (!Array.isArray(value.spellingQueue) ||
      !value.spellingQueue.length ||
      !value.spellingQueue.every(validCard) ||
      !Number.isInteger(value.spellingIndex) ||
      Number(value.spellingIndex) < 0 ||
      Number(value.spellingIndex) >= value.spellingQueue.length)
  )
    return false;
  return true;
}
function normalizeRound(round: Round | null): Round | null {
  if (!validRound(round)) return null;
  return {
    ...round,
    cardRepeats: object(round.cardRepeats) ? round.cardRepeats : {},
    spellingQueue: round.spellingQueue?.length
      ? round.spellingQueue
      : round.cards.slice(),
    spellingIndex: round.spellingIndex || 0,
    spellingAttempts: object(round.spellingAttempts)
      ? round.spellingAttempts
      : {},
    spellingWrong: round.spellingWrong || 0,
    spellingPhase: round.spellingPhase === "answer" ? "answer" : "prompt",
    typedAnswer: round.typedAnswer || "",
  };
}
export function validateBackup(value: unknown): asserts value is Backup {
  function requireField(
    ok: unknown,
    field: string,
    message: string,
  ): asserts ok {
    if (!ok) throw new DataValidationError(field, message);
  }
  requireField(object(value), "state", "应为对象");
  if (value.version !== undefined && value.version !== 1)
    throw new DataValidationError(
      "version",
      "不支持此版本",
      "UNSUPPORTED_VERSION",
    );
  requireField(Array.isArray(value.items), "items", "应为数组");
  value.items.forEach((item, index) => {
    const path = `items[${index}]`;
    requireField(object(item), path, "应为对象");
    for (const key of ["id", "title", "type", "author", "description"])
      requireField(typeof item[key] === "string", `${path}.${key}`, "应为文字");
    requireField(Array.isArray(item.units), `${path}.units`, "应为数组");
    item.units.forEach((unit, unitIndex) => {
      const unitPath = `${path}.units[${unitIndex}]`;
      requireField(object(unit), unitPath, "应为对象");
      for (const key of ["prompt", "answer", "context", "note", "kind"])
        requireField(
          typeof unit[key] === "string",
          `${unitPath}.${key}`,
          "应为文字",
        );
      requireField(unit.prompt, `${unitPath}.prompt`, "不能为空");
    });
  });
  requireField(Array.isArray(value.logs), "logs", "应为数组");
  value.logs.forEach((log, index) => {
    const path = `logs[${index}]`;
    requireField(object(log), path, "应为对象");
    for (const key of ["itemId", "prompt", "at"])
      requireField(typeof log[key] === "string", `${path}.${key}`, "应为文字");
    requireField(
      ["again", "know", "hard"].includes(String(log.rating)),
      `${path}.rating`,
      "复习反馈类型不支持",
    );
  });
  requireField(object(value.schedule), "schedule", "应为对象");
  Object.values(value.schedule).forEach((entry, index) => {
    const path = `schedule[${index}]`;
    requireField(object(entry), path, "应为对象");
    for (const key of ["dueAt", "interval", "ease", "reviews", "lapses"])
      requireField(
        typeof entry[key] === "number" &&
          Number.isFinite(entry[key]) &&
          Number(entry[key]) >= 0,
        `${path}.${key}`,
        "应为非负有限数值",
      );
  });
  requireField(Array.isArray(value.rounds), "rounds", "应为数组");
  value.rounds.forEach((round, index) => {
    const path = `rounds[${index}]`;
    requireField(object(round), path, "应为对象");
    for (const key of ["id", "sourceTitle", "completedAt"])
      requireField(
        typeof round[key] === "string",
        `${path}.${key}`,
        "应为文字",
      );
    requireField(
      typeof round.cardCount === "number",
      `${path}.cardCount`,
      "应为数值",
    );
  });
  requireField(
    value.round == null || validRound(value.round),
    "round",
    "轮次卡片、阶段或队列位置无效",
  );
  if (value.homeBookIds !== undefined)
    requireField(
      Array.isArray(value.homeBookIds) &&
        value.homeBookIds.every((id) => typeof id === "string"),
      "homeBookIds",
      "应为词书 ID 数组",
    );
}
function validHomeBookIds(data: LearningData): string[] {
  const available = new Set(data.items.map((book) => book.id));
  return [...new Set(data.homeBookIds || [])]
    .filter((id) => available.has(id))
    .slice(0, 3);
}
export function homeBooks(data: LearningData): Book[] {
  const selected = validHomeBookIds(data);
  return selected.length
    ? selected.map((id) => data.items.find((book) => book.id === id)!)
    : data.items.slice(0, 3);
}
function normalizeData(data: LearningData): LearningData {
  return {
    ...data,
    homeBookIds: validHomeBookIds(data),
    round: normalizeRound(data.round),
    roundSize: [5, 10, 15, 20].includes(Number(data.roundSize))
      ? Number(data.roundSize)
      : 10,
    dailyGoal: [5, 10, 20, 30].includes(Number(data.dailyGoal))
      ? Number(data.dailyGoal)
      : 10,
    practiceMode: ["cards", "spelling", "cloze"].includes(data.practiceMode)
      ? data.practiceMode
      : "cards",
  };
}
function migrateSeedBook(
  storage: StoragePort,
  data: LearningData,
  id: string,
  migrationKey: string,
) {
  let next = data;
  if (!storage.getItem(migrationKey)) {
    const book = (seed as Book[]).find((item) => item.id === id);
    if (book && data.items.length && !data.items.some((item) => item.id === id)) {
      next = { ...data, items: [...data.items, clone(book)] };
      saveData(storage, next);
    }
    try {
      storage.setItem(migrationKey, new Date().toISOString());
    } catch {
      // The added seed remains usable in memory and will retry on the next load.
    }
  }
  return next;
}
function migrateSeedCatalog(storage: StoragePort, data: LearningData) {
  const currentIds = (seed as Book[]).map((book) => book.id);
  const snapshot = storage.getItem(SEED_CATALOG_MIGRATION_KEY);
  if (!snapshot) {
    const introduced = (seed as Book[]).filter(
      (book) => !SEED_CATALOG_BASELINE_IDS.has(book.id),
    );
    let next = data;
    if (data.items.length && introduced.length) {
      const missing = introduced.filter(
        (book) => !data.items.some((item) => item.id === book.id),
      );
      if (missing.length) {
        next = {
          ...data,
          items: [...data.items, ...missing.map((book) => clone(book))],
        };
        saveData(storage, next);
      }
    }
    try {
      storage.setItem(SEED_CATALOG_MIGRATION_KEY, JSON.stringify(currentIds));
    } catch {
      // Catalog markers are optional; readable learning data takes priority.
    }
    return next;
  }
  let knownIds: string[];
  try {
    const parsed: unknown = JSON.parse(snapshot);
    knownIds = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    knownIds = [];
  }
  const known = new Set(knownIds);
  const introduced = (seed as Book[]).filter((book) => !known.has(book.id));
  let next = data;
  if (data.items.length && introduced.length) {
    const missing = introduced.filter(
      (book) => !data.items.some((item) => item.id === book.id),
    );
    if (missing.length) {
      next = {
        ...data,
        items: [...data.items, ...missing.map((book) => clone(book))],
      };
      saveData(storage, next);
    }
  }
  try {
    storage.setItem(SEED_CATALOG_MIGRATION_KEY, JSON.stringify(currentIds));
  } catch {
    // The next load can retry the marker without changing learning data.
  }
  return next;
}
function migrateSeedBooks(storage: StoragePort, data: LearningData) {
  const legacyMigrated = migrateSeedBook(
    storage,
    migrateSeedBook(
      storage,
      migrateSeedBook(
        storage,
        migrateSeedBook(storage, data, "the-line", SEED_MIGRATION_KEY),
        "shots",
        SHOTS_SEED_MIGRATION_KEY,
      ),
      "demons",
      DEMONS_SEED_MIGRATION_KEY,
    ),
    "enemy",
    ENEMY_SEED_MIGRATION_KEY,
  );
  return migrateSeedCatalog(storage, legacyMigrated);
}
export function loadData(storage: StoragePort): {
  data: LearningData;
  warning: string;
  notice?: string;
  diagnostic?: DataDiagnostic;
} {
  let source = "Gatsby 数据",
    storageKey = STATE_KEY,
    field = "state";
  try {
    const current = storage.getItem(STATE_KEY);
    if (current) {
      const value: unknown = JSON.parse(current);
      validateBackup(value);
      return { data: migrateSeedBooks(storage, normalizeData(value)), warning: "" };
    }
    source = "旧版 English Study 数据";
    const raw: Record<string, string | null> = {};
    for (const [name, key] of Object.entries(legacyKeys)) {
      storageKey = key;
      field = name;
      raw[name] = storage.getItem(key);
    }
    const hasLegacy = Object.values(raw).some((value) => value !== null);
    let notice = "";
    if (hasLegacy) {
      try {
        if (!storage.getItem(MIGRATION_KEY))
          storage.setItem(
            MIGRATION_KEY,
            JSON.stringify({ savedAt: new Date().toISOString(), raw }),
          );
      } catch {
        notice =
          "原有学习数据已读取，但空间不足，未能创建升级快照。请先导出 JSON 备份；旧数据未改动。";
      }
    }
    const data = initialData();
    for (const name of Object.keys(legacyKeys) as (keyof typeof legacyKeys)[]) {
      storageKey = legacyKeys[name];
      field = name;
      if (raw[name] !== null)
        Object.assign(data, {
          [name]: name === "practiceMode" ? raw[name] : JSON.parse(raw[name]!),
        });
    }
    const migrated = migrateSeedBooks(storage, data);
    const payload = {
      ...migrated,
      version: 1,
      exportedAt: new Date().toISOString(),
    };
    validateBackup(payload);
    return { data: normalizeData(migrated), warning: "", notice };
  } catch (error) {
    if (error instanceof DataValidationError) {
      field = error.field;
      const group = field.split(/[.[]/)[0] as keyof typeof legacyKeys;
      if (source === "旧版 English Study 数据")
        storageKey = legacyKeys[group] || storageKey;
    }
    const diagnostic = diagnoseData(error, source, storageKey, field);
    return {
      data: initialData(),
      warning: `${source} · ${diagnostic.message} 原始数据未覆盖。`,
      diagnostic,
    };
  }
}
export function backup(data: LearningData): Backup {
  return { ...clone(data), version: 1, exportedAt: new Date().toISOString() };
}
export function saveData(storage: StoragePort, data: LearningData) {
  // One authoritative atomic write; legacy keys remain intact for rollback.
  storage.setItem(STATE_KEY, JSON.stringify(backup(data)));
}
export function resetLearningData(
  storage: StoragePort & Pick<Storage, "removeItem">,
) {
  const data = initialData();
  // Commit fresh state before cleanup. If this write fails, no old key is removed.
  saveData(storage, data);
  const remainingKeys: string[] = [];
  for (const key of [
    ...Object.values(legacyKeys),
    MIGRATION_KEY,
    SEED_MIGRATION_KEY,
    SHOTS_SEED_MIGRATION_KEY,
    DEMONS_SEED_MIGRATION_KEY,
    ENEMY_SEED_MIGRATION_KEY,
    SEED_CATALOG_MIGRATION_KEY,
  ]) {
    try {
      storage.removeItem(key);
    } catch {
      remainingKeys.push(key);
    }
  }
  return { data, remainingKeys };
}
export function importBackup(
  data: LearningData,
  value: unknown,
  replace: boolean,
): LearningData {
  validateBackup(value);
  if (replace) return normalizeData(clone(value));
  const byId = <T extends { id: string }>(a: T[], b: T[]) => [
    ...new Map([...a, ...b].map((item) => [item.id, item])).values(),
  ];
  const logs = [
    ...new Map(
      [...data.logs, ...value.logs].map((log) => [
        [
          log.at,
          log.itemId,
          log.prompt,
          log.roundId,
          log.phase,
          log.rating,
        ].join("|"),
        log,
      ]),
    ).values(),
  ];
  return normalizeData({
    ...data,
    items: byId(data.items, value.items),
    logs,
    schedule: { ...data.schedule, ...value.schedule },
    rounds: byId(data.rounds, value.rounds)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, 100),
    round: data.round || value.round,
    roundSize: value.roundSize ?? data.roundSize,
    dailyGoal: value.dailyGoal ?? data.dailyGoal,
    practiceMode: value.practiceMode ?? data.practiceMode,
    homeBookIds: value.homeBookIds ?? data.homeBookIds,
  });
}
export function units(data: LearningData, source = "all"): Card[] {
  return data.items
    .filter((item) => source === "all" || item.id === source)
    .flatMap((item) =>
      item.units.map((unit, index) => ({
        ...unit,
        itemId: item.id,
        itemTitle: item.title,
        unitIndex: index,
      })),
    );
}
export const cardKey = (card: Pick<Card, "itemId" | "prompt">) =>
  card.itemId + "::" + card.prompt;
export const scheduleOf = (
  data: LearningData,
  card: Pick<Card, "itemId" | "prompt">,
): Schedule =>
  data.schedule[cardKey(card)] || {
    dueAt: 0,
    interval: 0,
    ease: 2.5,
    reviews: 0,
    lapses: 0,
  };
export const isMastered = (data: LearningData, card: Card) => {
  const s = scheduleOf(data, card);
  return s.reviews > 0 && s.lastRating === "know" && s.interval >= 1440;
};
export const bookProgress = (data: LearningData, id: string) => {
  const cards = units(data, id);
  return cards.length
    ? Math.round(
        (cards.filter((card) => isMastered(data, card)).length / cards.length) *
          100,
      )
    : 0;
};
export function record(
  data: LearningData,
  card: Card,
  rating: Rating,
  phase = "cards",
  roundId?: string,
): void {
  const current = scheduleOf(data, card);
  const interval =
    rating === "again"
      ? 10
      : rating === "hard"
        ? current.interval
          ? Math.max(60, Math.round(current.interval * 1.4))
          : 720
        : current.interval
          ? Math.max(1440, Math.round(current.interval * current.ease))
          : 1440;
  data.schedule[cardKey(card)] = {
    dueAt: Date.now() + interval * 60000,
    interval,
    ease:
      rating === "hard"
        ? Math.max(1.8, current.ease - 0.15)
        : rating === "know"
          ? Math.min(3.2, current.ease + 0.05)
          : current.ease,
    reviews: current.reviews + 1,
    lapses: current.lapses + (rating === "again" ? 1 : 0),
    lastRating: rating,
    lastReviewedAt: Date.now(),
  };
  data.logs.push({
    itemId: card.itemId,
    prompt: card.prompt,
    rating,
    phase,
    roundId,
    at: new Date().toISOString(),
  });
}
export function createRound(
  data: LearningData,
  source: string,
  size: number,
): LearningData {
  if (data.round) return data;
  const next = clone(data),
    now = Date.now();
  const sourceCards = units(next, source);
  const cards = [
    ...sourceCards.filter((card) => scheduleOf(next, card).dueAt <= now),
    ...sourceCards
      .filter((card) => scheduleOf(next, card).dueAt > now)
      .sort((a, b) => scheduleOf(next, a).dueAt - scheduleOf(next, b).dueAt),
  ].slice(0, Math.max(1, size));
  if (!cards.length) return data;
  next.roundSize = [5, 10, 15, 20].includes(size) ? size : next.roundSize;
  next.round = {
    id: "round-" + Date.now(),
    itemId: source === "all" ? null : source,
    sourceTitle:
      next.items.find((item) => item.id === source)?.title || "全部内容",
    requestedSize: size,
    cards,
    cardQueue: cards.slice(),
    cardIndex: 0,
    cardPhase: "prompt",
    cardFeedback: null,
    cardRepeats: {},
    stage: "cards",
    spellingQueue: cards.slice(),
    spellingIndex: 0,
    spellingPhase: "prompt",
    typedAnswer: "",
    typingCorrect: null,
    spellingAttempts: {},
    spellingWrong: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
  return next;
}
export function feedback(data: LearningData, value: Feedback): LearningData {
  if (data.round?.stage !== "cards" || data.round.cardPhase !== "prompt")
    return data;
  const next = clone(data),
    round = next.round!,
    card = round.cardQueue[round.cardIndex];
  record(next, card, value === "forgot" ? "again" : "know", "cards", round.id);
  round.cardPhase = "answer";
  round.cardFeedback = value;
  if (value === "forgot" && !round.cardRepeats[cardKey(card)]) {
    round.cardRepeats[cardKey(card)] = 1;
    round.cardQueue.push(clone(card));
  }
  return next;
}
export function advanceCard(data: LearningData): LearningData {
  if (data.round?.stage !== "cards" || data.round.cardPhase !== "answer")
    return data;
  const next = clone(data),
    round = next.round!;
  round.cardIndex++;
  round.cardPhase = "prompt";
  round.cardFeedback = null;
  if (round.cardIndex >= round.cardQueue.length) round.stage = "gate";
  return next;
}
export function repeatCard(data: LearningData): LearningData {
  if (
    data.round?.stage !== "cards" ||
    data.round.cardPhase !== "answer" ||
    data.round.cardFeedback !== "remembered"
  )
    return data;
  const next = clone(data);
  next.round!.cardPhase = "prompt";
  next.round!.cardFeedback = null;
  return next;
}
export function enterSpelling(data: LearningData): LearningData {
  if (data.round?.stage !== "gate") return data;
  const next = clone(data),
    round = next.round!;
  round.stage = "spelling";
  round.spellingQueue = round.cards.slice();
  round.spellingIndex = 0;
  round.spellingPhase = "prompt";
  round.typedAnswer = "";
  round.typingCorrect = null;
  return next;
}
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘'`]/g, "")
    .replace(/[-–—_/]/g, " ")
    .replace(/[.!?,;:()[\]{}"“”]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function maskPrompt(context: string, prompt: string) {
  return context.replace(
    new RegExp(prompt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
    "______",
  );
}
export function checkSpelling(data: LearningData, input: string): LearningData {
  if (
    data.round?.stage !== "spelling" ||
    data.round.spellingPhase !== "prompt" ||
    !input.trim()
  )
    return data;
  const next = clone(data),
    round = next.round!,
    card = round.spellingQueue[round.spellingIndex];
  const correct = normalizeAnswer(input) === normalizeAnswer(card.prompt);
  round.typedAnswer = input.trim();
  round.typingCorrect = correct;
  round.spellingPhase = "answer";
  round.spellingAttempts[cardKey(card)] =
    (round.spellingAttempts[cardKey(card)] || 0) + 1;
  if (!correct) {
    round.spellingWrong++;
    round.spellingQueue.push(clone(card));
  }
  record(next, card, correct ? "know" : "again", "spelling", round.id);
  return next;
}
export function finishRound(
  data: LearningData,
  spellingCompleted: boolean,
): LearningData {
  if (!data.round) return data;
  const next = clone(data),
    round = next.round!;
  next.rounds = [
    {
      id: round.id,
      sourceTitle: round.sourceTitle,
      requestedSize: round.requestedSize,
      cardCount: round.cards.length,
      spellingCompleted,
      spellingWrong: round.spellingWrong,
      startedAt: round.startedAt,
      completedAt: new Date().toISOString(),
    },
    ...next.rounds,
  ].slice(0, 100);
  next.round = null;
  return next;
}
export function advanceSpelling(data: LearningData): LearningData {
  if (data.round?.stage !== "spelling" || data.round.spellingPhase !== "answer")
    return data;
  const next = clone(data),
    round = next.round!;
  round.spellingIndex++;
  round.spellingPhase = "prompt";
  round.typedAnswer = "";
  round.typingCorrect = null;
  return round.spellingIndex >= round.spellingQueue.length
    ? finishRound(next, true)
    : next;
}
export function resetBook(
  data: LearningData,
  id: string,
  remove = false,
): LearningData {
  const next = clone(data);
  if (remove) {
    next.items = next.items.filter((book) => book.id !== id);
    next.homeBookIds = validHomeBookIds(next);
  }
  next.logs = next.logs.filter((log) => log.itemId !== id);
  Object.keys(next.schedule)
    .filter((key) => key.startsWith(id + "::"))
    .forEach((key) => delete next.schedule[key]);
  if (next.round?.cards.some((card) => card.itemId === id)) next.round = null;
  return next;
}
export function saveBook(data: LearningData, book: Book): LearningData {
  const next = clone(data),
    index = next.items.findIndex((item) => item.id === book.id);
  if (index < 0) next.items.unshift(book);
  else next.items[index] = book;
  const prompts = new Set(book.units.map((unit) => unit.prompt));
  Object.keys(next.schedule)
    .filter(
      (key) =>
        key.startsWith(book.id + "::") &&
        !prompts.has(key.slice(book.id.length + 2)),
    )
    .forEach((key) => delete next.schedule[key]);
  if (next.round?.cards.some((card) => card.itemId === book.id))
    next.round = null;
  return next;
}
export function dayKey(date: Date | string | number) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function statistics(data: LearningData) {
  const now = new Date(),
    dates = new Set(data.logs.map((log) => dayKey(log.at)));
  const days = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(now);
    d.setDate(d.getDate() - 6 + index);
    return {
      label: ["日", "一", "二", "三", "四", "五", "六"][d.getDay()],
      key: dayKey(d),
      count: data.logs.filter((log) => dayKey(log.at) === dayKey(d)).length,
    };
  });
  const cursor = new Date(now);
  if (!dates.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const cards = units(data);
  return {
    days,
    streak,
    today: data.logs.filter((log) => dayKey(log.at) === dayKey(now)).length,
    week: days.reduce((a, day) => a + day.count, 0),
    total: data.logs.length,
    mastered: cards.filter((card) => isMastered(data, card)).length,
    due: cards.filter((card) => scheduleOf(data, card).dueAt <= Date.now())
      .length,
    remembered: data.logs.filter((log) => log.rating === "know").length,
    weak: cards
      .filter((card) => scheduleOf(data, card).lapses > 0)
      .sort((a, b) => scheduleOf(data, b).lapses - scheduleOf(data, a).lapses)
      .slice(0, 8),
  };
}
