import { lt, sql } from "drizzle-orm";
import { ResultAsync } from "neverthrow";
import type { Db } from "@/infra/db/db";
import { type DbError, dbFailure } from "@/infra/db/dbError";
import { authAttempts } from "@/infra/db/tables";

export { countAttempt, deleteAttemptsBefore };

/** Atomically adds one attempt to the (key, window) counter and returns the new total. */
function countAttempt(db: Db, key: string, windowStart: Date): ResultAsync<number, DbError> {
  return ResultAsync.fromPromise(
    db
      .insert(authAttempts)
      .values({ key, windowStart: windowStart.toISOString(), count: 1 })
      .onConflictDoUpdate({
        target: [authAttempts.key, authAttempts.windowStart],
        set: { count: sql`${authAttempts.count} + 1` },
      })
      .returning({ count: authAttempts.count }),
    dbFailure,
  ).map((rows): number => rows[0]?.count ?? 1);
}

function deleteAttemptsBefore(db: Db, cutoff: Date): ResultAsync<number, DbError> {
  return ResultAsync.fromPromise(
    db.delete(authAttempts).where(lt(authAttempts.windowStart, cutoff.toISOString())),
    dbFailure,
  ).map((result): number => result.rowsAffected);
}
