import { describe, expect, it } from "vitest";
import { AuthAction, authRateLimitOf, decideAttempt, windowStart } from "@/domain/auth/rateLimit";

const login = authRateLimitOf(AuthAction.Login);
const at = (iso: string): Date => new Date(iso);

describe("limite de tentativas de login/cadastro", () => {
  it("janelas fixas de 15 minutos para login", () => {
    expect(windowStart(login, at("2026-10-19T12:14:59.000Z")).toISOString()).toBe("2026-10-19T12:00:00.000Z");
    expect(windowStart(login, at("2026-10-19T12:15:00.000Z")).toISOString()).toBe("2026-10-19T12:15:00.000Z");
  });

  it("permite até o máximo e bloqueia a seguinte com Retry-After até o fim da janela", () => {
    const now = at("2026-10-19T12:10:00.000Z");
    expect(decideAttempt(login, login.maxAttempts, now)).toEqual({ type: "allowed" });
    expect(decideAttempt(login, login.maxAttempts + 1, now)).toEqual({ type: "limited", retryAfterSeconds: 300 });
  });

  it("cadastro tem limite mais baixo", () => {
    expect(authRateLimitOf(AuthAction.Signup).maxAttempts).toBeLessThan(login.maxAttempts);
  });
});
