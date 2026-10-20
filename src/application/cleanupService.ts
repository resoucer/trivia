import type { ResultAsync } from "neverthrow";
import type { AppError } from "@/application/appError";
import { cleanupExpiredUseCase } from "@/application/triviaService";
import type { TriviaId } from "@/domain/trivia/ids";
import { playDedupCutoff } from "@/domain/trivia/playDay";
import type { Db } from "@/infra/db/db";
import { deletePlayDedupBefore } from "@/infra/repositories/triviaRepository";

export type { CleanupReport };
export { cleanupUseCase };

type CleanupReport = {
  readonly expiredTrivias: ReadonlyArray<TriviaId>;
  readonly prunedPlayDedupRows: number;
};

/** Periodic maintenance (`npm run cleanup`): expired anonymous trivias and stale play dedup rows. */
function cleanupUseCase(db: Db, now: Date): ResultAsync<CleanupReport, AppError> {
  return cleanupExpiredUseCase(db, now).andThen((expiredTrivias) =>
    deletePlayDedupBefore(db, playDedupCutoff(now)).map(
      (prunedPlayDedupRows): CleanupReport => ({ expiredTrivias, prunedPlayDedupRows }),
    ),
  );
}
