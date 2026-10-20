import { describe, expect, it } from "vitest";
import { signupUseCase, loginUseCase } from "@/application/authService";
import {
  cleanupExpiredUseCase,
  createTriviaUseCase,
  editTriviaUseCase,
  loadTrivia,
  playTriviaUseCase,
  rankingUseCase,
} from "@/application/triviaService";
import type { Viewer } from "@/domain/user/user";
import { openDb } from "@/infra/db/client";
import type { Db } from "@/infra/db/db";
import { draftInput, NOW } from "@/test/fixtures";

const DAY = 24 * 60 * 60 * 1000;

async function freshDb(): Promise<Db> {
  return (await openDb(":memory:"))._unsafeUnwrap();
}

async function signup(db: Db, email: string): Promise<Viewer> {
  const session = (await signupUseCase(db, { email, password: "segredo123", displayName: "Fulano" }, NOW))._unsafeUnwrap();
  return { type: "user", user: session.user };
}

describe("fluxo de trivias (SQLite em memória)", () => {
  it("anônima: cria com token de reivindicação, joga, fica fora do ranking e expira", async () => {
    const db = await freshDb();
    const created = (await createTriviaUseCase(db, { type: "anonymous" }, { ...draftInput, authorName: "Ana" }, NOW))._unsafeUnwrap();
    expect(created.claimToken.type).toBe("just");
    const id = created.trivia.id.value;

    const played = (
      await playTriviaUseCase(db, id, { answers: [{ questionId: "q1", choiceId: "c2" }, { questionId: "q2", choiceId: "c1" }] }, NOW)
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
    expect((await editTriviaUseCase(db, { type: "anonymous" }, id, edit, NOW))._unsafeUnwrapErr()).toEqual({ type: "unauthenticated" });
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
