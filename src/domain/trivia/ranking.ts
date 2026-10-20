import { isListedPublicly } from "@/domain/trivia/lifecycle";
import type { TriviaSummary } from "@/domain/trivia/trivia";

export type { RankedTrivia };
export { rankByPlays, recentFirst };

type RankedTrivia = { readonly position: number; readonly trivia: TriviaSummary };

function byPlaysThenRecency(a: TriviaSummary, b: TriviaSummary): number {
  return b.playCount - a.playCount || b.createdAt.getTime() - a.createdAt.getTime();
}

/**
 * Ranking of publicly listed trivias by play count (most played first).
 * Ties share a position ("1, 1, 3" competition ranking); anonymous trivias are excluded.
 */
function rankByPlays(trivias: ReadonlyArray<TriviaSummary>): ReadonlyArray<RankedTrivia> {
  const sorted = trivias.filter(isListedPublicly).toSorted(byPlaysThenRecency);
  return sorted.map((trivia): RankedTrivia => {
    const firstWithSameCount = sorted.findIndex((t) => t.playCount === trivia.playCount);
    return { position: firstWithSameCount + 1, trivia };
  });
}

/** Publicly listed trivias, newest first. */
function recentFirst(trivias: ReadonlyArray<TriviaSummary>): ReadonlyArray<TriviaSummary> {
  return trivias.filter(isListedPublicly).toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
