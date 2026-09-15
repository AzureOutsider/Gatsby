import seed from "../data/seed.json";
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
  if (!object(value) || Number(value.version || 1) > 1)
    throw new Error("备份版本不支持，请使用兼容的学习数据备份。");
  if (
    !Array.isArray(value.items) ||
    !value.items.every(
      (item) =>
        object(item) &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.type === "string" &&
        typeof item.author === "string" &&
        typeof item.description === "string" &&
        Array.isArray(item.units) &&
        item.units.every(validUnit),
    )
  )
    throw new Error("备份中的内容库格式不完整。");
  if (
    !Array.isArray(value.logs) ||
    !value.logs.every(
      (log) =>
        object(log) &&
        typeof log.itemId === "string" &&
        typeof log.prompt === "string" &&
        ["again", "know", "hard"].includes(String(log.rating)) &&
        typeof log.at === "string",
    )
  )
    throw new Error("备份中的学习记录无效。");
  if (
    !object(value.schedule) ||
    !Object.values(value.schedule).every(
      (entry) =>
        object(entry) &&
        ["dueAt", "interval", "ease", "reviews", "lapses"].every(
          (key) =>
            typeof entry[key] === "number" &&
            Number.isFinite(entry[key]) &&
            Number(entry[key]) >= 0,
        ),
    )
  )
    throw new Error("备份中的复习计划无效。");
  if (
    !Array.isArray(value.rounds) ||
    !value.rounds.every(
      (round) =>
        object(round) &&
        typeof round.id === "string" &&
        typeof round.sourceTitle === "string" &&
        typeof round.completedAt === "string" &&
        typeof round.cardCount === "number",
    )
  )
    throw new Error("备份中的轮次记录无效。");
  if (value.round != null && !validRound(value.round))
    throw new Error("备份中的当前轮次不完整，未导入任何数据。");
}
function normalizeData(data: LearningData): LearningData {
  return {
    ...data,
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
export function loadData(storage: StoragePort): {
  data: LearningData;
  warning: string;
  notice?: string;
} {
  try {
    const current = storage.getItem(STATE_KEY);
    if (current) {
      const value: unknown = JSON.parse(current);
      validateBackup(value);
      return { data: normalizeData(value), warning: "" };
    }
    const raw = Object.fromEntries(
      Object.entries(legacyKeys).map(([name, key]) => [
        name,
        storage.getItem(key),
      ]),
    );
    const hasLegacy = Object.values(raw).some((value) => value !== null);
    let notice = "";
    if (hasLegacy && !storage.getItem(MIGRATION_KEY)) {
      try {
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
    for (const name of Object.keys(legacyKeys) as (keyof LearningData)[]) {
      if (raw[name] !== null)
        Object.assign(data, {
          [name]: name === "practiceMode" ? raw[name] : JSON.parse(raw[name]!),
        });
    }
    const payload = {
      ...data,
      version: 1,
      exportedAt: new Date().toISOString(),
    };
    validateBackup(payload);
    return { data: normalizeData(data), warning: "", notice };
  } catch {
    return {
      data: initialData(),
      warning:
        "本地数据读取失败。原始数据未覆盖；请先导出已有备份或恢复数据，再继续学习。",
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
  if (remove) next.items = next.items.filter((book) => book.id !== id);
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
