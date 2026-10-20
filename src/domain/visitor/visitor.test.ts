import { describe, expect, it } from "vitest";
import { NetworkHash, resolveVisitor, VisitorId, visitorKey } from "@/domain/visitor/visitor";
import { Just, Nothing } from "@/lib/maybe";
import { alice } from "@/test/fixtures";

const cookie = new VisitorId("cookie-visitor-0000000001");
const network = new NetworkHash("a".repeat(64));

describe("identidade de quem joga", () => {
  it("usuário logado tem precedência sobre cookie e rede", () => {
    const visitor = resolveVisitor({ type: "user", user: alice }, Just(cookie), network);
    expect(visitor).toEqual({ type: "user", userId: alice.id });
  });

  it("anônimo com cookie é identificado pelo cookie", () => {
    expect(resolveVisitor({ type: "anonymous" }, Just(cookie), network)).toEqual({
      type: "visitor",
      visitorId: cookie,
    });
  });

  it("anônimo sem cookie cai no hash de rede", () => {
    expect(resolveVisitor({ type: "anonymous" }, Nothing(), network)).toEqual({ type: "network", hash: network });
  });

  it("chaves são prefixadas pelo tipo de identidade", () => {
    expect(visitorKey({ type: "user", userId: alice.id }).value).toBe("user:user-alice");
    expect(visitorKey({ type: "visitor", visitorId: cookie }).value).toBe(`visitor:${cookie.value}`);
    expect(visitorKey({ type: "network", hash: network }).value).toBe(`network:${network.value}`);
  });

  it("valida o formato do cookie e do hash", () => {
    expect(VisitorId.schema.safeParse("curto").success).toBe(false);
    expect(VisitorId.schema.safeParse(cookie.value).success).toBe(true);
    expect(NetworkHash.schema.safeParse("xyz").success).toBe(false);
  });
});
