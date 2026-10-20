import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { ResultAsync, errAsync } from "neverthrow";
import type { Db } from "@/infra/db/db";
import { DDL } from "@/infra/db/ddl";
import { dbFailure, type DbError } from "@/infra/db/dbError";
import { seedIfEmpty } from "@/infra/db/seed";
import * as tables from "@/infra/db/tables";

export { getDb, openDb };

const DEFAULT_DATABASE_URL = "file:data/trivia.db";

/** Opens a database and makes sure the schema exists. Used by scripts and tests. */
function openDb(url: string): ResultAsync<Db, DbError> {
  const client = createClient({ url });
  const db = drizzle(client, { schema: tables });
  return ResultAsync.fromPromise(client.executeMultiple(DDL), dbFailure).map((): Db => db);
}

const globalForDb = globalThis as typeof globalThis & {
  __triviaDb?: ResultAsync<Db, DbError>;
};

/** Process-wide database (kept on globalThis so Next dev hot reloads reuse it). Seeds example data once. */
function getDb(): ResultAsync<Db, DbError> {
  const cached = globalForDb.__triviaDb;
  if (cached !== undefined) return cached;
  const opened = openDb(process.env["DATABASE_URL"] ?? DEFAULT_DATABASE_URL)
    .andThen((db) => seedIfEmpty(db, new Date()).map((): Db => db))
    .orElse((error) => {
      // Do not cache failures: the next request retries.
      delete globalForDb.__triviaDb;
      return errAsync(error);
    });
  globalForDb.__triviaDb = opened;
  return opened;
}
