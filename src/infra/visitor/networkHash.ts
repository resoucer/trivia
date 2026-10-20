import { createHmac } from "node:crypto";
import type { PlayDay } from "@/domain/trivia/playDay";
import { NetworkHash } from "@/domain/visitor/visitor";

export type { NetworkInfo };
export { networkHash };

/** What the server sees about the connection. Lives only in memory during the request. */
type NetworkInfo = { readonly ip: string; readonly userAgent: string };

/**
 * HMAC-SHA256(secret, [day, ip, userAgent]). The day is part of the input, so hashes of the same
 * connection cannot be linked across days, and without the secret the IP cannot be brute-forced back.
 * JSON encoding avoids ambiguity between fields.
 */
function networkHash(secret: string, day: PlayDay, network: NetworkInfo): NetworkHash {
  const digest = createHmac("sha256", secret)
    .update(JSON.stringify([day.value, network.ip, network.userAgent]))
    .digest("hex");
  return new NetworkHash(digest);
}
