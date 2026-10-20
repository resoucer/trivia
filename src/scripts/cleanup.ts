import type { Result } from "neverthrow";
import type { AppError } from "@/application/appError";
import { type CleanupReport, cleanupUseCase } from "@/application/cleanupService";
import { ANONYMOUS_TTL_DAYS } from "@/domain/trivia/lifecycle";
import { PLAY_DEDUP_RETENTION_DAYS } from "@/domain/trivia/playDay";
import { databaseUrl, openDb } from "@/infra/db/client";

/**
 * `npm run cleanup` (meant for a daily cron): deletes anonymous trivias inactive for more than
 * ANONYMOUS_TTL_DAYS, play dedup rows older than PLAY_DEDUP_RETENTION_DAYS, expired sessions and
 * old login rate-limit counters.
 */
const outcome: Result<CleanupReport, AppError> = await openDb(databaseUrl()).andThen((db) =>
  cleanupUseCase(db, new Date()),
);

outcome.match(
  (report) => {
    console.log(
      `Limpeza concluída: ${report.expiredTrivias.length} trivia(s) anônima(s) com mais de ${ANONYMOUS_TTL_DAYS} dias sem atividade removida(s).`,
    );
    for (const id of report.expiredTrivias) console.log(`  - ${id.value}`);
    console.log(
      `${report.prunedPlayDedupRows} registro(s) de contagem única com mais de ${PLAY_DEDUP_RETENTION_DAYS} dias removido(s).`,
    );
    console.log(`${report.expiredSessions} sessão(ões) expirada(s) removida(s).`);
    console.log(`${report.prunedAuthAttempts} contador(es) de tentativas de login antigo(s) removido(s).`);
  },
  (error) => {
    console.error("Falha na limpeza:", error);
    process.exitCode = 1;
  },
);
