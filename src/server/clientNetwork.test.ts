import { describe, expect, it } from "vitest";
import { networkInfoFrom, UNKNOWN_IP } from "@/server/clientNetwork";

describe("IP e user agent da requisição", () => {
  it("usa a primeira entrada de x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.7 , 10.0.0.1",
      "x-real-ip": "198.51.100.1",
      "user-agent": "UA",
    });
    expect(networkInfoFrom(headers)).toEqual({ ip: "203.0.113.7", userAgent: "UA" });
  });

  it("cai para x-real-ip e depois para um valor fixo", () => {
    expect(networkInfoFrom(new Headers({ "x-real-ip": "2001:db8::1" })).ip).toBe("2001:db8::1");
    expect(networkInfoFrom(new Headers({ "x-forwarded-for": "lixo" })).ip).toBe(UNKNOWN_IP);
    expect(networkInfoFrom(new Headers()).ip).toBe(UNKNOWN_IP);
  });
});
