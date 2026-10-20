import { err, ok, type Result } from "neverthrow";
import { isOwnedBy, userOwner } from "@/domain/trivia/owner";
import type { Trivia } from "@/domain/trivia/trivia";
import type { User, Viewer } from "@/domain/user/user";
import { Just, type Maybe, Nothing } from "@/lib/maybe";

export type { ClaimError };
export { ANONYMOUS_TTL_DAYS, canEditTrivia, claimTrivia, expirationCutoff, expiresAt, isExpired, isListedPublicly };

const ANONYMOUS_TTL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const ANONYMOUS_TTL_MS = ANONYMOUS_TTL_DAYS * DAY_MS;

/** Anonymous trivias whose last activity is strictly before this instant are expired. */
function expirationCutoff(now: Date): Date {
  return new Date(now.getTime() - ANONYMOUS_TTL_MS);
}

/** When the trivia will expire if nothing happens. Owned trivias never expire. */
function expiresAt(trivia: Pick<Trivia, "owner" | "lastActivityAt">): Maybe<Date> {
  switch (trivia.owner.type) {
    case "anonymous":
      return Just(new Date(trivia.lastActivityAt.getTime() + ANONYMOUS_TTL_MS));
    case "user":
      return Nothing();
    default: {
      const _exhaustiveCheck: never = trivia.owner;
      throw new Error(`Unknown owner: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function isExpired(trivia: Pick<Trivia, "owner" | "lastActivityAt">, now: Date): boolean {
  switch (trivia.owner.type) {
    case "anonymous":
      return trivia.lastActivityAt.getTime() < expirationCutoff(now).getTime();
    case "user":
      return false;
    default: {
      const _exhaustiveCheck: never = trivia.owner;
      throw new Error(`Unknown owner: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

/** Only trivias saved to an account show up in public lists and the ranking. */
function isListedPublicly(trivia: Pick<Trivia, "owner">): boolean {
  switch (trivia.owner.type) {
    case "anonymous":
      return false;
    case "user":
      return true;
    default: {
      const _exhaustiveCheck: never = trivia.owner;
      throw new Error(`Unknown owner: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function canEditTrivia(trivia: Pick<Trivia, "owner">, viewer: Viewer): boolean {
  return isOwnedBy(trivia.owner, viewer);
}

type ClaimError = { readonly type: "already-owned" };

/**
 * Moves an anonymous trivia into a user's account (it stops expiring and becomes public).
 * Proof that the user created it (the claim token) is checked by the caller.
 */
function claimTrivia(trivia: Trivia, user: User, now: Date): Result<Trivia, ClaimError> {
  switch (trivia.owner.type) {
    case "anonymous":
      return ok({
        ...trivia,
        owner: userOwner(user.id),
        authorName: user.displayName,
        updatedAt: now,
        lastActivityAt: now,
      });
    case "user":
      return err({ type: "already-owned" });
    default: {
      const _exhaustiveCheck: never = trivia.owner;
      throw new Error(`Unknown owner: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}
