import { describe, expect, it } from "vitest";
import { rankByPlays, recentFirst } from "@/domain/trivia/ranking";
import { summarizeTrivia } from "@/domain/trivia/trivia";
import { alice, anonymousTrivia, bob, NOW, ownedTrivia } from "@/test/fixtures";

const minutesAgo = (n: number): Date => new Date(NOW.getTime() - n * 60_000);

describe("rankByPlays", () => {
  it("ordena por partidas, desempata pela mais recente e compartilha posição em empate", () => {
    const ranked = rankByPlays(
      [
        ownedTrivia(alice, { playCount: 5, createdAt: minutesAgo(10) }, "t-five"),
        ownedTrivia(bob, { playCount: 9, createdAt: minutesAgo(10) }, "t-nine"),
        ownedTrivia(alice, { playCount: 5, createdAt: minutesAgo(1) }, "t-five-new"),
        ownedTrivia(bob, { playCount: 1, createdAt: minutesAgo(1) }, "t-one"),
      ].map(summarizeTrivia),
    );
    expect(ranked.map((r) => [r.position, r.trivia.id.value])).toEqual([
      [1, "t-nine"],
      [2, "t-five-new"],
      [2, "t-five"],
      [4, "t-one"],
    ]);
  });

  it("exclui trivias anônimas mesmo que sejam as mais jogadas", () => {
    const popularAnonymous = { ...anonymousTrivia(NOW, "anon-hot"), playCount: 1000 };
    const ranked = rankByPlays([popularAnonymous, ownedTrivia(alice, { playCount: 1 }, "t-owned")].map(summarizeTrivia));
    expect(ranked.map((r) => r.trivia.id.value)).toEqual(["t-owned"]);
  });
});

describe("recentFirst", () => {
  it("lista só trivias de conta, mais novas primeiro", () => {
    const list = recentFirst(
      [
        ownedTrivia(alice, { createdAt: minutesAgo(30) }, "t-old"),
        anonymousTrivia(NOW, "anon-new"),
        ownedTrivia(bob, { createdAt: minutesAgo(2) }, "t-new"),
      ].map(summarizeTrivia),
    );
    expect(list.map((t) => t.id.value)).toEqual(["t-new", "t-old"]);
  });
});
