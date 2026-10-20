import { okAsync, type ResultAsync } from "neverthrow";
import type { AppError } from "@/application/appError";
import { playDayOf } from "@/domain/trivia/playDay";
import type { Viewer } from "@/domain/user/user";
import { resolveVisitor, type Visitor } from "@/domain/visitor/visitor";
import { readVisitorId, writeVisitorId } from "@/infra/auth/cookies";
import { visitorSecret } from "@/infra/config";
import { newVisitorId } from "@/infra/random";
import { networkHash } from "@/infra/visitor/networkHash";
import { networkInfoFrom } from "@/server/clientNetwork";

export { ensureVisitorCookie, identifyVisitor };

/** Who is playing: session user, else visitor cookie, else HMAC of IP + user agent for today. */
function identifyVisitor(viewer: Viewer, headers: Headers, now: Date): ResultAsync<Visitor, AppError> {
  return readVisitorId().andThen((cookie) =>
    visitorSecret()
      .mapErr((error): AppError => error)
      .map(
        (secret): Visitor =>
          resolveVisitor(viewer, cookie, networkHash(secret, playDayOf(now), networkInfoFrom(headers))),
      ),
  );
}

/** Issues the visitor cookie when the browser has none, so its next plays are recognized by it. */
function ensureVisitorCookie(): ResultAsync<null, never> {
  return readVisitorId().andThen((cookie) => (cookie.type === "just" ? okAsync(null) : writeVisitorId(newVisitorId())));
}
