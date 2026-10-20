import { z } from "zod";
import type { NetworkInfo } from "@/infra/visitor/networkHash";

export { networkInfoFrom, UNKNOWN_IP };

/** Shared bucket for requests whose address cannot be determined. */
const UNKNOWN_IP = "unknown";

const schema_Ip = z
  .string()
  .trim()
  .pipe(z.union([z.ipv4(), z.ipv6()]));

/** `x-forwarded-for: client, proxy1, proxy2`: the first entry is the original client. */
const schema_ForwardedFor = z
  .string()
  .transform((header): string => header.split(",")[0] ?? "")
  .pipe(schema_Ip);

/**
 * Client IP from the proxy headers, then the user agent. Only trustworthy behind a proxy that
 * overwrites these headers (Vercel, nginx, Cloudflare); directly exposed, clients can spoof them,
 * which at worst lets them inflate plays from cookie-less requests.
 */
function networkInfoFrom(headers: Headers): NetworkInfo {
  const forwarded = schema_ForwardedFor.safeParse(headers.get("x-forwarded-for"));
  const realIp = schema_Ip.safeParse(headers.get("x-real-ip"));
  const ip = forwarded.success ? forwarded.data : realIp.success ? realIp.data : UNKNOWN_IP;
  return { ip, userAgent: headers.get("user-agent") ?? "" };
}
