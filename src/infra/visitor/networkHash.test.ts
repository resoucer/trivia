import { describe, expect, it } from "vitest";
import { PlayDay } from "@/domain/trivia/playDay";
import { networkHash } from "@/infra/visitor/networkHash";

const day = new PlayDay("2026-10-19");
const network = { ip: "203.0.113.7", userAgent: "curl/8" };

describe("hash de rede", () => {
  it("é determinístico e não contém o IP", () => {
    const hash = networkHash("segredo", day, network);
    expect(hash.value).toMatch(/^[a-f0-9]{64}$/);
    expect(hash.value).toBe(networkHash("segredo", day, network).value);
    expect(hash.value).not.toContain("203.0.113.7");
  });

  it("muda com segredo, dia, IP ou user agent", () => {
    const base = networkHash("segredo", day, network).value;
    expect(networkHash("outro", day, network).value).not.toBe(base);
    expect(networkHash("segredo", new PlayDay("2026-10-20"), network).value).not.toBe(base);
    expect(networkHash("segredo", day, { ...network, ip: "203.0.113.8" }).value).not.toBe(base);
    expect(networkHash("segredo", day, { ...network, userAgent: "Firefox" }).value).not.toBe(base);
  });
});
