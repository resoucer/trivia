import { describe, expect, it } from "vitest";
import {
  ANONYMOUS_TTL_DAYS,
  canEditTrivia,
  claimTrivia,
  expirationCutoff,
  expiresAt,
  isExpired,
  isListedPublicly,
} from "@/domain/trivia/lifecycle";
import { userOwner } from "@/domain/trivia/owner";
import { alice, anonymousTrivia, bob, NOW, ownedTrivia } from "@/test/fixtures";

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number): Date => new Date(NOW.getTime() - n * DAY);

describe("expiração de trivias anônimas", () => {
  it(`não expira com até ${ANONYMOUS_TTL_DAYS} dias sem atividade`, () => {
    expect(isExpired(anonymousTrivia(daysAgo(29)), NOW)).toBe(false);
    expect(isExpired(anonymousTrivia(daysAgo(30)), NOW)).toBe(false);
  });

  it("expira depois de 30 dias sem atividade", () => {
    expect(isExpired(anonymousTrivia(new Date(daysAgo(30).getTime() - 1)), NOW)).toBe(true);
    expect(isExpired(anonymousTrivia(daysAgo(45)), NOW)).toBe(true);
  });

  it("trivias de conta nunca expiram", () => {
    const old = ownedTrivia(alice, { lastActivityAt: daysAgo(400) }, "owned-old");
    expect(isExpired(old, NOW)).toBe(false);
    expect(expiresAt(old)).toEqual({ type: "nothing" });
  });

  it("expiresAt e expirationCutoff são consistentes com isExpired", () => {
    const trivia = anonymousTrivia(daysAgo(10));
    expect(expiresAt(trivia)).toEqual({ type: "just", value: new Date(daysAgo(10).getTime() + 30 * DAY) });
    expect(expirationCutoff(NOW)).toEqual(daysAgo(30));
  });
});

describe("elegibilidade para listas públicas e ranking", () => {
  it("só trivias de conta são listadas", () => {
    expect(isListedPublicly(ownedTrivia(alice, {}, "owned-1"))).toBe(true);
    expect(isListedPublicly(anonymousTrivia(NOW))).toBe(false);
  });
});

describe("edição e reivindicação", () => {
  it("só o dono logado pode editar", () => {
    const trivia = ownedTrivia(alice, {}, "owned-1");
    expect(canEditTrivia(trivia, { type: "user", user: alice })).toBe(true);
    expect(canEditTrivia(trivia, { type: "user", user: bob })).toBe(false);
    expect(canEditTrivia(trivia, { type: "anonymous" })).toBe(false);
    expect(canEditTrivia(anonymousTrivia(NOW), { type: "user", user: alice })).toBe(false);
  });

  it("reivindicar move a trivia anônima para a conta", () => {
    const claimed = claimTrivia(anonymousTrivia(daysAgo(5)), alice, NOW)._unsafeUnwrap();
    expect(claimed.owner).toEqual(userOwner(alice.id));
    expect(claimed.authorName).toEqual(alice.displayName);
    expect(isListedPublicly(claimed)).toBe(true);
    expect(isExpired(claimed, new Date(NOW.getTime() + 365 * DAY))).toBe(false);
  });

  it("não reivindica trivia que já tem dono", () => {
    expect(claimTrivia(ownedTrivia(bob, {}, "owned-b"), alice, NOW)._unsafeUnwrapErr()).toEqual({ type: "already-owned" });
  });
});
