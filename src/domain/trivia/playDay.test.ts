import { describe, expect, it } from "vitest";
import { PlayDay, playDayOf, playDedupCutoff } from "@/domain/trivia/playDay";

describe("dia da partida em America/Sao_Paulo (UTC-3)", () => {
  it("usa o dia local, não o dia UTC", () => {
    // 02:59 UTC do dia 20 ainda é 23:59 do dia 19 em São Paulo.
    expect(playDayOf(new Date("2026-10-20T02:59:59.999Z")).value).toBe("2026-10-19");
    expect(playDayOf(new Date("2026-10-20T03:00:00.000Z")).value).toBe("2026-10-20");
  });

  it("meia-noite local separa os dias", () => {
    expect(playDayOf(new Date("2026-10-19T03:00:00.000Z")).value).toBe("2026-10-19");
    expect(playDayOf(new Date("2026-10-19T02:59:59.999Z")).value).toBe("2026-10-18");
  });

  it("vira o ano no horário local", () => {
    expect(playDayOf(new Date("2027-01-01T02:00:00.000Z")).value).toBe("2026-12-31");
  });

  it("mantém o dia anterior e o atual na retenção", () => {
    expect(playDedupCutoff(new Date("2026-10-19T15:00:00.000Z")).value).toBe("2026-10-18");
  });

  it("valida o formato", () => {
    expect(PlayDay.schema.safeParse("2026-13-01").success).toBe(false);
    expect(PlayDay.schema.safeParse("2026-10-19").success).toBe(true);
  });
});
