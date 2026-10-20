import type { Result } from "neverthrow";
import { openDb } from "@/infra/db/client";
import type { DbError } from "@/infra/db/dbError";
import { SEED_DEMO_USER, seedIfEmpty } from "@/infra/db/seed";

/** `npm run db:seed`: creates the schema and example data if the database is empty. */
const outcome: Result<null, DbError> = await openDb(process.env.DATABASE_URL ?? "file:data/trivia.db").andThen((db) =>
  seedIfEmpty(db, new Date()),
);

outcome.match(
  () => console.log(`Banco pronto. Usuário de demonstração: ${SEED_DEMO_USER.email} / ${SEED_DEMO_USER.password}`),
  (error) => {
    console.error("Falha no seed:", error);
    process.exitCode = 1;
  },
);
