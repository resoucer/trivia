import type { Result } from "neverthrow";
import { databaseUrl, openDb } from "@/infra/db/client";
import type { Db } from "@/infra/db/db";
import type { DbError } from "@/infra/db/dbError";

/** `npm run db:migrate`: applies pending drizzle-kit migrations to DATABASE_URL. Release step in production. */
const outcome: Result<Db, DbError> = await openDb(databaseUrl());

outcome.match(
  () => console.log(`Migrações aplicadas em ${databaseUrl()}.`),
  (error) => {
    console.error("Falha ao migrar:", error);
    process.exitCode = 1;
  },
);
