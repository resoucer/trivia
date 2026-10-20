import type { PlayId, TriviaId } from "@/domain/trivia/ids";
import type { Score } from "@/domain/trivia/scoring";

export { createPlay };
export type { Play };

type Play = {
  readonly id: PlayId;
  readonly triviaId: TriviaId;
  readonly correctCount: number;
  readonly totalCount: number;
  readonly playedAt: Date;
};

function createPlay(id: PlayId, triviaId: TriviaId, score: Score, now: Date): Play {
  return { id, triviaId, correctCount: score.correctCount, totalCount: score.totalCount, playedAt: now };
}
