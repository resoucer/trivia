import { describe, expect, it } from "vitest";
import { loginUseCase, signupUseCase } from "@/application/authService";
import {
  checkAnswerUseCase,
  cleanupExpiredUseCase,
  createTriviaUseCase,
  editTriviaUseCase,
  loadTrivia,
  playTriviaUseCase,
  rankingUseCase,
} from "@/application/triviaService";
import type { Viewer } from "@/domain/user/user";
import { NetworkHash, type Visitor, VisitorId } from "@/domain/visitor/visitor";
import { openDb } from "@/infra/db/client";
import type { Db } from "@/infra/db/db";
import { draftInput, NOW } from "@/test/fixtures";

const DAY = 24 * 60 * 60 * 1000;
const visitorA: Visitor = { type: "visitor", visitorId: new VisitorId("visitor-a-000000000000001") };
const visitorB: Visitor = { type: "visitor", visitorId: new VisitorId("visitor-b-000000000000002") };
const network: Visitor = { type: "network", hash: new NetworkHash("b".repeat(64)) };
const answers = {
  answers: [
    { questionId: "q1", choiceId: "c2" },
    { questionId: "q2", choiceId: "c1" },
  ],
};

async function freshDb(): Promise<Db> {
  return (await openDb(":memory:"))._unsafeUnwrap();
}

async function signup(db: Db, email: string): Promise<Viewer> {
  const session = (
    await signupUseCase(db, { email, password: "segredo123", displayName: "Fulano" }, NOW)
  )._unsafeUnwrap();
  return { type: "user", user: session.user };
}

describe("fluxo de trivias (SQLite em memória)", () => {
  it("anônima: cria com token de reivindicação, joga, fica fora do ranking e expira", async () => {
    const db = await freshDb();
    const created = (
      await createTriviaUseCase(db, { type: "anonymous" }, { ...draftInput, authorName: "Ana" }, NOW)
    )._unsafeUnwrap();
    expect(created.claimToken.type).toBe("just");
    const id = created.trivia.id.value;

    const played = (
      await playTriviaUseCase(
        db,
        visitorA,
        id,
        {
          answers: [
            { questionId: "q1", choiceId: "c2" },
            { questionId: "q2", choiceId: "c1" },
          ],
        },
        NOW,
      )
    )._unsafeUnwrap();
    expect(played.score.correctCount).toBe(2);
    expect((await loadTrivia(db, id, NOW))._unsafeUnwrap().playCount).toBe(1);
    expect((await rankingUseCase(db, 10))._unsafeUnwrap()).toHaveLength(0);

    const later = new Date(NOW.getTime() + 31 * DAY);
    expect((await loadTrivia(db, id, later))._unsafeUnwrapErr()).toEqual({ type: "not-found" });
    // Lazy deletion already removed it, even for "now" again.
    expect((await loadTrivia(db, id, NOW))._unsafeUnwrapErr()).toEqual({ type: "not-found" });
  });

  it("anônima exige nome do autor", async () => {
    const db = await freshDb();
    const error = (await createTriviaUseCase(db, { type: "anonymous" }, draftInput, NOW))._unsafeUnwrapErr();
    expect(error.type).toBe("validation");
  });

  it("cleanup remove só anônimas inativas", async () => {
    const db = await freshDb();
    const owner = await signup(db, "dono@x.com");
    const old = new Date(NOW.getTime() - 40 * DAY);
    await createTriviaUseCase(db, { type: "anonymous" }, { ...draftInput, authorName: "Ana" }, old);
    await createTriviaUseCase(db, { type: "anonymous" }, { ...draftInput, authorName: "Ana" }, NOW);
    await createTriviaUseCase(db, owner, draftInput, old);
    const removed = (await cleanupExpiredUseCase(db, NOW))._unsafeUnwrap();
    expect(removed).toHaveLength(1);
  });

  it("de conta: entra no ranking e só o dono edita", async () => {
    const db = await freshDb();
    const owner = await signup(db, "dono@x.com");
    const other = await signup(db, "outro@x.com");
    const created = (await createTriviaUseCase(db, owner, draftInput, NOW))._unsafeUnwrap();
    expect(created.claimToken.type).toBe("nothing");
    const id = created.trivia.id.value;

    expect((await rankingUseCase(db, 10))._unsafeUnwrap().map((r) => r.trivia.id.value)).toEqual([id]);
    const edit = { ...draftInput, title: "Editada" };
    expect((await editTriviaUseCase(db, other, id, edit, NOW))._unsafeUnwrapErr()).toEqual({ type: "forbidden" });
    expect((await editTriviaUseCase(db, { type: "anonymous" }, id, edit, NOW))._unsafeUnwrapErr()).toEqual({
      type: "unauthenticated",
    });
    expect((await editTriviaUseCase(db, owner, id, edit, NOW))._unsafeUnwrap().title).toBe("Editada");
  });

  it("login valida a senha", async () => {
    const db = await freshDb();
    await signup(db, "dono@x.com");
    expect((await loginUseCase(db, { email: "DONO@x.com", password: "segredo123" }, NOW)).isOk()).toBe(true);
    expect((await loginUseCase(db, { email: "dono@x.com", password: "errada" }, NOW))._unsafeUnwrapErr()).toEqual({
      type: "invalid-credentials",
    });
  });
});

describe("contagem única de partidas por pessoa por dia", () => {
  async function ownedTriviaId(db: Db): Promise<{ readonly id: string; readonly owner: Viewer }> {
    const owner = await signup(db, "dono@x.com");
    const created = (await createTriviaUseCase(db, owner, draftInput, NOW))._unsafeUnwrap();
    return { id: created.trivia.id.value, owner };
  }

  async function play(db: Db, visitor: Visitor, id: string, at: Date): Promise<{ counted: string; playCount: number }> {
    const outcome = (await playTriviaUseCase(db, visitor, id, answers, at))._unsafeUnwrap();
    expect(outcome.score.correctCount).toBe(2);
    return { counted: outcome.counting.type, playCount: outcome.trivia.playCount };
  }

  it("mesmo visitante no mesmo dia conta uma vez, mas sempre recebe a pontuação", async () => {
    const db = await freshDb();
    const { id } = await ownedTriviaId(db);
    expect(await play(db, visitorA, id, NOW)).toEqual({ counted: "counted", playCount: 1 });
    expect(await play(db, visitorA, id, new Date(NOW.getTime() + 60_000))).toEqual({
      counted: "already-counted-today",
      playCount: 1,
    });
    expect((await loadTrivia(db, id, NOW))._unsafeUnwrap().playCount).toBe(1);
  });

  it("visitantes diferentes contam separadamente (cookie, rede, usuário)", async () => {
    const db = await freshDb();
    const { id, owner } = await ownedTriviaId(db);
    if (owner.type !== "user") throw new Error("fixture: owner must be a user");
    const user: Visitor = { type: "user", userId: owner.user.id };
    await play(db, visitorA, id, NOW);
    expect((await play(db, visitorB, id, NOW)).playCount).toBe(2);
    expect((await play(db, network, id, NOW)).playCount).toBe(3);
    expect((await play(db, user, id, NOW)).playCount).toBe(4);
    expect(await play(db, user, id, NOW)).toEqual({ counted: "already-counted-today", playCount: 4 });
    expect((await rankingUseCase(db, 10))._unsafeUnwrap()[0]?.trivia.playCount).toBe(4);
  });

  it("vale por trivia: o mesmo visitante conta em outra trivia", async () => {
    const db = await freshDb();
    const { id, owner } = await ownedTriviaId(db);
    const other = (await createTriviaUseCase(db, owner, draftInput, NOW))._unsafeUnwrap().trivia.id.value;
    await play(db, visitorA, id, NOW);
    expect(await play(db, visitorA, other, NOW)).toEqual({ counted: "counted", playCount: 1 });
  });

  it("vira o dia à meia-noite de São Paulo, não à meia-noite UTC", async () => {
    const db = await freshDb();
    const { id } = await ownedTriviaId(db);
    const lateNightSp = new Date("2026-10-19T23:30:00.000-03:00");
    const afterUtcMidnight = new Date("2026-10-19T23:59:00.000-03:00"); // já é dia 20 em UTC
    const nextDaySp = new Date("2026-10-20T00:00:00.000-03:00");
    expect((await play(db, visitorA, id, lateNightSp)).counted).toBe("counted");
    expect((await play(db, visitorA, id, afterUtcMidnight)).counted).toBe("already-counted-today");
    expect(await play(db, visitorA, id, nextDaySp)).toEqual({ counted: "counted", playCount: 2 });
  });
});

describe("verificação de uma resposta (pergunta por pergunta)", () => {
  it("responde se acertou e a correta, sem registrar partida", async () => {
    const db = await freshDb();
    const owner = await signup(db, "dono@x.com");
    const id = (await createTriviaUseCase(db, owner, draftInput, NOW))._unsafeUnwrap().trivia.id.value;
    const right = (await checkAnswerUseCase(db, id, "q1", { choiceId: "c2" }, NOW))._unsafeUnwrap();
    expect(right.isCorrect).toBe(true);
    const wrong = (await checkAnswerUseCase(db, id, "q2", { choiceId: "c2" }, NOW))._unsafeUnwrap();
    expect({ isCorrect: wrong.isCorrect, correct: wrong.correctChoiceId.value }).toEqual({
      isCorrect: false,
      correct: "c1",
    });
    expect((await loadTrivia(db, id, NOW))._unsafeUnwrap().playCount).toBe(0);
  });

  it("erros: trivia inexistente, pergunta inválida, corpo inválido", async () => {
    const db = await freshDb();
    const owner = await signup(db, "dono@x.com");
    const id = (await createTriviaUseCase(db, owner, draftInput, NOW))._unsafeUnwrap().trivia.id.value;
    expect((await checkAnswerUseCase(db, "nao-existe", "q1", { choiceId: "c1" }, NOW))._unsafeUnwrapErr().type).toBe(
      "not-found",
    );
    expect((await checkAnswerUseCase(db, id, "q9", { choiceId: "c1" }, NOW))._unsafeUnwrapErr().type).toBe("scoring");
    expect((await checkAnswerUseCase(db, id, "../x", { choiceId: "c1" }, NOW))._unsafeUnwrapErr().type).toBe(
      "validation",
    );
    expect((await checkAnswerUseCase(db, id, "q1", {}, NOW))._unsafeUnwrapErr().type).toBe("validation");
  });

  it("trivia anônima expirada some também na verificação", async () => {
    const db = await freshDb();
    const old = new Date(NOW.getTime() - 31 * DAY);
    const created = (
      await createTriviaUseCase(db, { type: "anonymous" }, { ...draftInput, authorName: "Ana" }, old)
    )._unsafeUnwrap();
    expect(
      (await checkAnswerUseCase(db, created.trivia.id.value, "q1", { choiceId: "c1" }, NOW))._unsafeUnwrapErr(),
    ).toEqual({
      type: "not-found",
    });
  });
});
