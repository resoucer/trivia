import { describe, expect, it } from "vitest";
import { guardAuthAttempt, signupUseCase } from "@/application/authService";
import { cleanupUseCase } from "@/application/cleanupService";
import { createTriviaUseCase, playTriviaUseCase } from "@/application/triviaService";
import { AuthAction } from "@/domain/auth/rateLimit";
import { NetworkHash, type Visitor, VisitorId } from "@/domain/visitor/visitor";
import { openDb } from "@/infra/db/client";
import type { Db } from "@/infra/db/db";
import { draftInput, NOW } from "@/test/fixtures";

const DAY = 24 * 60 * 60 * 1000;
const visitor: Visitor = { type: "visitor", visitorId: new VisitorId("visitor-cleanup-000000001") };
const answers = {
  answers: [
    { questionId: "q1", choiceId: "c2" },
    { questionId: "q2", choiceId: "c1" },
  ],
};

async function freshDb(): Promise<Db> {
  return (await openDb(":memory:"))._unsafeUnwrap();
}

describe("limpeza periódica", () => {
  it("remove registros de contagem única antigos e mantém hoje e ontem", async () => {
    const db = await freshDb();
    const session = (
      await signupUseCase(db, { email: "dono@x.com", password: "segredo123", displayName: "Fulano" }, NOW)
    )._unsafeUnwrap();
    const owner = { type: "user", user: session.user } as const;
    const id = (await createTriviaUseCase(db, owner, draftInput, NOW))._unsafeUnwrap().trivia.id.value;
    for (const daysAgo of [3, 2, 1, 0]) {
      (await playTriviaUseCase(db, visitor, id, answers, new Date(NOW.getTime() - daysAgo * DAY)))._unsafeUnwrap();
    }

    const report = (await cleanupUseCase(db, NOW))._unsafeUnwrap();
    expect(report.prunedPlayDedupRows).toBe(2);
    expect(report.expiredTrivias).toHaveLength(0);

    // Today's slot survived: replaying today still does not count again.
    const replay = (await playTriviaUseCase(db, visitor, id, answers, NOW))._unsafeUnwrap();
    expect(replay.counting.type).toBe("already-counted-today");
    expect(replay.trivia.playCount).toBe(4);
  });

  it("remove sessões expiradas e contadores de login antigos", async () => {
    const db = await freshDb();
    // Signup 31 days ago: its 30-day session is expired now.
    const old = new Date(NOW.getTime() - 31 * DAY);
    (
      await signupUseCase(db, { email: "velho@x.com", password: "segredo123", displayName: "Velho" }, old)
    )._unsafeUnwrap();
    (
      await signupUseCase(db, { email: "novo@x.com", password: "segredo123", displayName: "Novo" }, NOW)
    )._unsafeUnwrap();
    const client = new NetworkHash("e".repeat(64));
    (await guardAuthAttempt(db, AuthAction.Login, client, new Date(NOW.getTime() - 2 * DAY)))._unsafeUnwrap();
    (await guardAuthAttempt(db, AuthAction.Login, client, NOW))._unsafeUnwrap();

    const report = (await cleanupUseCase(db, NOW))._unsafeUnwrap();
    expect(report.expiredSessions).toBe(1);
    expect(report.prunedAuthAttempts).toBe(1);
  });
});
