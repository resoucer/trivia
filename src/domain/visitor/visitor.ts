import { z } from "zod";
import type { UserId } from "@/domain/trivia/ids";
import type { Viewer } from "@/domain/user/user";
import type { Maybe } from "@/lib/maybe";

export type { Visitor };
export { NetworkHash, resolveVisitor, VisitorId, VisitorKey, visitorKey };

/** Random id kept in a long-lived httpOnly cookie to recognize a browser without login. */
class VisitorId {
  // @ts-expect-error _tag's existence prevents structural comparison
  private readonly _tag: null = null;
  constructor(public value: string) {}

  static schema = z
    .string()
    .regex(/^[A-Za-z0-9_-]{20,64}$/, { error: "Identificador de visitante inválido" })
    .transform((v): VisitorId => new VisitorId(v));
}

/** Keyed hash (HMAC) of network data (IP + user agent). The raw IP is never stored. */
class NetworkHash {
  // @ts-expect-error _tag's existence prevents structural comparison
  private readonly _tag: null = null;
  constructor(public value: string) {}

  static schema = z
    .string()
    .regex(/^[a-f0-9]{64}$/, { error: "Hash de rede inválido" })
    .transform((v): NetworkHash => new NetworkHash(v));
}

/** Stable text key of a visitor, used to deduplicate plays (e.g. "visitor:abc…"). */
class VisitorKey {
  // @ts-expect-error _tag's existence prevents structural comparison
  private readonly _tag: null = null;
  constructor(public value: string) {}
}

/**
 * Who is playing, from the most to the least reliable identity:
 * - user: logged in (same account on any device counts once);
 * - visitor: anonymous browser recognized by its cookie;
 * - network: no cookie yet (first request, cookies blocked): HMAC of IP + user agent.
 */
type Visitor =
  | { readonly type: "user"; readonly userId: UserId }
  | { readonly type: "visitor"; readonly visitorId: VisitorId }
  | { readonly type: "network"; readonly hash: NetworkHash };

/** Precedence: logged-in user, then visitor cookie, then network hash. */
function resolveVisitor(viewer: Viewer, cookie: Maybe<VisitorId>, network: NetworkHash): Visitor {
  switch (viewer.type) {
    case "user":
      return { type: "user", userId: viewer.user.id };
    case "anonymous":
      switch (cookie.type) {
        case "just":
          return { type: "visitor", visitorId: cookie.value };
        case "nothing":
          return { type: "network", hash: network };
        default: {
          const _exhaustiveCheck: never = cookie;
          throw new Error(`Unknown Maybe: ${JSON.stringify(_exhaustiveCheck)}`);
        }
      }
    default: {
      const _exhaustiveCheck: never = viewer;
      throw new Error(`Unknown viewer: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

/** Prefixing by type keeps the three identity spaces apart (a user id never collides with a cookie id). */
function visitorKey(visitor: Visitor): VisitorKey {
  switch (visitor.type) {
    case "user":
      return new VisitorKey(`user:${visitor.userId.value}`);
    case "visitor":
      return new VisitorKey(`visitor:${visitor.visitorId.value}`);
    case "network":
      return new VisitorKey(`network:${visitor.hash.value}`);
    default: {
      const _exhaustiveCheck: never = visitor;
      throw new Error(`Unknown visitor: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}
