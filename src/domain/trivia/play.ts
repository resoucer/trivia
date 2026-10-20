import type { PlayId, TriviaId } from "@/domain/trivia/ids";
import { type PlayDay, playDayOf } from "@/domain/trivia/playDay";
import type { Score } from "@/domain/trivia/scoring";
import { type Visitor, type VisitorKey, visitorKey } from "@/domain/visitor/visitor";

export type { Play, PlayCounting, UniquePlaySlot };
export { createPlay, isCounted, uniquePlaySlot };

type Play = {
  readonly id: PlayId;
  readonly triviaId: TriviaId;
  readonly correctCount: number;
  readonly totalCount: number;
  readonly playedAt: Date;
};

/** Whether a play incremented the trivia's play count. Every play is scored either way. */
type PlayCounting = { readonly type: "counted" } | { readonly type: "already-counted-today" };

/** A trivia's play count goes up at most once per slot: one per visitor per day. */
type UniquePlaySlot = { readonly triviaId: TriviaId; readonly visitorKey: VisitorKey; readonly day: PlayDay };

function createPlay(id: PlayId, triviaId: TriviaId, score: Score, now: Date): Play {
  return { id, triviaId, correctCount: score.correctCount, totalCount: score.totalCount, playedAt: now };
}

function uniquePlaySlot(triviaId: TriviaId, visitor: Visitor, now: Date): UniquePlaySlot {
  return { triviaId, visitorKey: visitorKey(visitor), day: playDayOf(now) };
}

function isCounted(counting: PlayCounting): boolean {
  switch (counting.type) {
    case "counted":
      return true;
    case "already-counted-today":
      return false;
    default: {
      const _exhaustiveCheck: never = counting;
      throw new Error(`Unknown play counting: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}
