import { describe, expect, it } from "vitest";
import { rankingUseCase } from "@/application/triviaService";
import { openDb } from "@/infra/db/client";
import { DEFAULT_TRIVIAS } from "@/infra/db/defaultTrivias";
import { seedDefaults } from "@/infra/db/seed";
import { NOW } from "@/test/fixtures";

describe("seed", () => {
  it("é idempotente: a segunda execução não insere nada", async () => {
    const db = (await openDb(":memory:"))._unsafeUnwrap();
    const first = (await seedDefaults(db, NOW))._unsafeUnwrap();
    expect(first).toBeGreaterThan(0);
    expect((await seedDefaults(db, NOW))._unsafeUnwrap()).toBe(0);
  });

  it("os questionários padrão são do usuário demo e aparecem no ranking", async () => {
    const db = (await openDb(":memory:"))._unsafeUnwrap();
    (await seedDefaults(db, NOW))._unsafeUnwrap();
    const ranking = (await rankingUseCase(db, 50))._unsafeUnwrap();
    const ids = ranking.map((r) => r.trivia.id.value);
    for (const seed of DEFAULT_TRIVIAS) expect(ids).toContain(seed.id);
    expect(ranking[0]?.trivia.id.value).toBe("seed-futebol");
  });
});
