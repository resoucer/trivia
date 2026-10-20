import { cleanupExpiredUseCase } from "@/application/triviaService";
import { ANONYMOUS_TTL_DAYS } from "@/domain/trivia/lifecycle";
import { openDb } from "@/infra/db/client";

/** `npm run cleanup`: deletes anonymous trivias inactive for more than ANONYMOUS_TTL_DAYS. Meant for cron. */
const outcome = await openDb(process.env["DATABASE_URL"] ?? "file:data/trivia.db").andThen((db) =>
  cleanupExpiredUseCase(db, new Date()),
);

outcome.match(
  (ids) => {
    console.log(`Limpeza concluída: ${ids.length} trivia(s) anônima(s) com mais de ${ANONYMOUS_TTL_DAYS} dias sem atividade removida(s).`);
    ids.forEach((id) => console.log(`  - ${id.value}`));
  },
  (error) => {
    console.error("Falha na limpeza:", error);
    process.exitCode = 1;
  },
);
