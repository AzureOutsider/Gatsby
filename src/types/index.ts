export type View = "home" | "library" | "review" | "stats";
export type Mode = "cards" | "spelling" | "cloze";
export type Feedback = "forgot" | "remembered";
export type Phase = "prompt" | "answer";
export type Rating = "again" | "hard" | "know";
export interface Unit {
  kind: string;
  prompt: string;
  answer: string;
  context: string;
  note: string;
}
export interface Card extends Unit {
  itemId: string;
  itemTitle: string;
  unitIndex: number;
}
export interface Book {
  id: string;
  type: string;
  title: string;
  author: string;
  description: string;
  level?: string;
  progress?: number;
  units: Unit[];
}
export interface Schedule {
  dueAt: number;
  interval: number;
  ease: number;
  reviews: number;
  lapses: number;
  lastRating?: Rating;
  lastReviewedAt?: number;
}
export interface Log {
  itemId: string;
  prompt: string;
  rating: Rating;
  at: string;
  roundId?: string;
  phase?: string;
}
export interface Round {
  id: string;
  itemId: string | null;
  sourceTitle: string;
  requestedSize: number;
  cards: Card[];
  cardQueue: Card[];
  cardIndex: number;
  cardPhase: Phase;
  cardFeedback: Feedback | null;
  cardRepeats: Record<string, number>;
  stage: "cards" | "gate" | "spelling" | "complete";
  spellingQueue: Card[];
  spellingIndex: number;
  spellingPhase: Phase;
  typedAnswer: string;
  typingCorrect: boolean | null;
  spellingAttempts: Record<string, number>;
  spellingWrong: number;
  startedAt: string;
  completedAt: string | null;
}
export interface RoundHistory {
  id: string;
  sourceTitle: string;
  requestedSize: number;
  cardCount: number;
  spellingCompleted: boolean;
  spellingWrong: number;
  startedAt: string;
  completedAt: string;
}
export interface LearningData {
  items: Book[];
  logs: Log[];
  schedule: Record<string, Schedule>;
  round: Round | null;
  rounds: RoundHistory[];
  roundSize: number;
  dailyGoal: number;
  practiceMode: Mode;
  homeBookIds?: string[];
}
export interface Backup extends LearningData {
  version: number;
  exportedAt: string;
}
export interface FreeSession {
  queue: Card[];
  baseQueue: Card[];
  index: number;
  phase: Phase;
  feedback: Feedback | null;
  repeats: Card[];
  repeatPass: boolean;
  typedAnswer: string;
  typingCorrect: boolean | null;
}
