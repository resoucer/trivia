import type { Result } from "neverthrow";
import type { AppError } from "@/application/appError";
import { cleanupExpiredUseCase } from "@/application/triviaService";
import type { TriviaId } from "@/domain/trivia/ids";
import { ANONYMOUS_TTL_DAYS } from "@/domain/trivia/lifecycle";
import { databaseUrl, openDb } from "@/infra/db/client";

/** `npm run cleanup`: deletes anonymous trivias inactive for more than ANONYMOUS_TTL_DAYS. Meant for cron. */
const outcome: Result<ReadonlyArray<TriviaId>, AppError> = await openDb(databaseUrl()).andThen((db) =>
  cleanupExpiredUseCase(db, new Date()),
);

outcome.match(
  (ids) => {
    console.log(
      `Limpeza concluída: ${ids.length} trivia(s) anônima(s) com mais de ${ANONYMOUS_TTL_DAYS} dias sem atividade removida(s).`,
    );
    for (const id of ids) console.log(`  - ${id.value}`);
  },
  (error) => {
    console.error("Falha na limpeza:", error);
    process.exitCode = 1;
  },
);
