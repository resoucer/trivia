import { describe, expect, it } from "vitest";
import { guardAuthAttempt } from "@/application/authService";
import { AuthAction, authRateLimitOf } from "@/domain/auth/rateLimit";
import { NetworkHash } from "@/domain/visitor/visitor";
import { openDb } from "@/infra/db/client";
import { NOW } from "@/test/fixtures";

const clientA = new NetworkHash("c".repeat(64));
const clientB = new NetworkHash("d".repeat(64));

describe("limite de tentativas no banco", () => {
  it("bloqueia o cliente que passa do limite, sem afetar outros clientes ou ações", async () => {
    const db = (await openDb(":memory:"))._unsafeUnwrap();
    const { maxAttempts } = authRateLimitOf(AuthAction.Login);
    for (let i = 0; i < maxAttempts; i++) {
      expect((await guardAuthAttempt(db, AuthAction.Login, clientA, NOW)).isOk()).toBe(true);
    }
    const blocked = (await guardAuthAttempt(db, AuthAction.Login, clientA, NOW))._unsafeUnwrapErr();
    expect(blocked.type).toBe("rate-limited");
    expect((await guardAuthAttempt(db, AuthAction.Login, clientB, NOW)).isOk()).toBe(true);
    expect((await guardAuthAttempt(db, AuthAction.Signup, clientA, NOW)).isOk()).toBe(true);
  });

  it("libera de novo na janela seguinte", async () => {
    const db = (await openDb(":memory:"))._unsafeUnwrap();
    const limit = authRateLimitOf(AuthAction.Login);
    for (let i = 0; i <= limit.maxAttempts; i++) await guardAuthAttempt(db, AuthAction.Login, clientA, NOW);
    const nextWindow = new Date(NOW.getTime() + limit.windowMs);
    expect((await guardAuthAttempt(db, AuthAction.Login, clientA, nextWindow)).isOk()).toBe(true);
  });
});
