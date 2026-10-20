import type { ResultAsync } from "neverthrow";
import type { AppError } from "@/application/appError";
import { cleanupExpiredUseCase } from "@/application/triviaService";
import { authRateLimitCutoff } from "@/domain/auth/rateLimit";
import type { TriviaId } from "@/domain/trivia/ids";
import { playDedupCutoff } from "@/domain/trivia/playDay";
import type { Db } from "@/infra/db/db";
import { deleteAttemptsBefore } from "@/infra/repositories/rateLimitRepository";
import { deletePlayDedupBefore } from "@/infra/repositories/triviaRepository";
import { deleteExpiredSessions } from "@/infra/repositories/userRepository";

export type { CleanupReport };
export { cleanupUseCase };

type CleanupReport = {
  readonly expiredTrivias: ReadonlyArray<TriviaId>;
  readonly prunedPlayDedupRows: number;
  readonly expiredSessions: number;
  readonly prunedAuthAttempts: number;
};

/** Periodic maintenance (`npm run cleanup`): expired trivias and sessions, stale dedup and rate-limit rows. */
function cleanupUseCase(db: Db, now: Date): ResultAsync<CleanupReport, AppError> {
  return cleanupExpiredUseCase(db, now).andThen((expiredTrivias) =>
    deletePlayDedupBefore(db, playDedupCutoff(now)).andThen((prunedPlayDedupRows) =>
      deleteExpiredSessions(db, now).andThen((expiredSessions) =>
        deleteAttemptsBefore(db, authRateLimitCutoff(now)).map(
          (prunedAuthAttempts): CleanupReport => ({
            expiredTrivias,
            prunedPlayDedupRows,
            expiredSessions,
            prunedAuthAttempts,
          }),
        ),
      ),
    ),
  );
}
