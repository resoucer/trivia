import { describe, expect, it } from "vitest";
import { openDb } from "@/infra/db/client";
import { seedDefaults } from "@/infra/db/seed";
import { NOW } from "@/test/fixtures";

describe("seed", () => {
  it("é idempotente: a segunda execução não insere nada", async () => {
    const db = (await openDb(":memory:"))._unsafeUnwrap();
    const first = (await seedDefaults(db, NOW))._unsafeUnwrap();
    expect(first).toBeGreaterThan(0);
    expect((await seedDefaults(db, NOW))._unsafeUnwrap()).toBe(0);
  });
});
