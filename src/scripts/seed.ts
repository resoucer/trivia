import type { Result } from "neverthrow";
import { databaseUrl, openDb } from "@/infra/db/client";
import type { DbError } from "@/infra/db/dbError";
import { SEED_DEMO_USER, seedDefaults } from "@/infra/db/seed";

/** `npm run db:seed`: applies migrations and inserts missing example data (idempotent). */
const outcome: Result<number, DbError> = await openDb(databaseUrl()).andThen((db) => seedDefaults(db, new Date()));

outcome.match(
  (inserted) =>
    console.log(
      `Banco pronto (${inserted} trivia(s) de exemplo inserida(s)). Usuário de demonstração: ${SEED_DEMO_USER.email} / ${SEED_DEMO_USER.password}`,
    ),
  (error) => {
    console.error("Falha no seed:", error);
    process.exitCode = 1;
  },
);
