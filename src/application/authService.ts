import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import type { AppError } from "@/application/appError";
import { type AuthAction, authRateLimitOf, decideAttempt, windowStart } from "@/domain/auth/rateLimit";
import { schema_LoginInput, schema_SignupInput, type User, type Viewer } from "@/domain/user/user";
import type { NetworkHash } from "@/domain/visitor/visitor";
import { hashPassword, verifyPassword } from "@/infra/auth/password";
import type { Db } from "@/infra/db/db";
import { newSecretToken, newUserId, sha256 } from "@/infra/random";
import { countAttempt } from "@/infra/repositories/rateLimitRepository";
import {
  deleteSession,
  findUserBySessionTokenHash,
  findUserWithPasswordByEmail,
  insertSession,
  insertUserWithPassword,
} from "@/infra/repositories/userRepository";
import type { Maybe } from "@/lib/maybe";
import { parseWith } from "@/lib/validation";

export type { StartedSession };
export { guardAuthAttempt, loginUseCase, logoutUseCase, signupUseCase, viewerFromSessionToken };

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** A freshly created session: the raw token goes to the cookie, only its hash is stored. */
type StartedSession = { readonly user: User; readonly token: string };

function startSession(db: Db, user: User, now: Date): ResultAsync<StartedSession, AppError> {
  const token = newSecretToken();
  return insertSession(db, sha256(token), user.id, now, new Date(now.getTime() + SESSION_TTL_MS)).map(
    (): StartedSession => ({ user, token }),
  );
}

function signupUseCase(db: Db, input: unknown, now: Date): ResultAsync<StartedSession, AppError> {
  return parseWith(schema_SignupInput, input).match(
    (signup) =>
      hashPassword(signup.password)
        .mapErr((e): AppError => e)
        .andThen((hash) =>
          insertUserWithPassword(
            db,
            { id: newUserId(), email: signup.email, displayName: signup.displayName },
            hash,
            now,
          ),
        )
        .andThen((user) => startSession(db, user, now)),
    (error) => errAsync<StartedSession, AppError>(error),
  );
}

function loginUseCase(db: Db, input: unknown, now: Date): ResultAsync<StartedSession, AppError> {
  return parseWith(schema_LoginInput, input).match(
    (login) =>
      findUserWithPasswordByEmail(db, login.email).andThen((found): ResultAsync<StartedSession, AppError> => {
        if (found.type === "nothing") return errAsync({ type: "invalid-credentials" });
        return verifyPassword(login.password, found.value.passwordHash).andThen(
          (valid): ResultAsync<StartedSession, AppError> =>
            valid ? startSession(db, found.value.user, now) : errAsync({ type: "invalid-credentials" }),
        );
      }),
    (error) => errAsync<StartedSession, AppError>(error),
  );
}

function logoutUseCase(db: Db, token: Maybe<string>): ResultAsync<null, AppError> {
  return token.type === "just" ? deleteSession(db, sha256(token.value)) : okAsync(null);
}

function viewerFromSessionToken(db: Db, token: Maybe<string>, now: Date): ResultAsync<Viewer, AppError> {
  if (token.type === "nothing") return okAsync({ type: "anonymous" });
  return findUserBySessionTokenHash(db, sha256(token.value), now).map(
    (user): Viewer => (user.type === "just" ? { type: "user", user: user.value } : { type: "anonymous" }),
  );
}

/**
 * Counts this attempt for the client (HMAC of its IP) and rejects it once the action's fixed-window
 * limit is exceeded. Every attempt counts, successful or not, which also caps mass sign-ups.
 */
function guardAuthAttempt(db: Db, action: AuthAction, client: NetworkHash, now: Date): ResultAsync<null, AppError> {
  const limit = authRateLimitOf(action);
  return countAttempt(db, `${action}:${client.value}`, windowStart(limit, now)).andThen(
    (attempts): ResultAsync<null, AppError> => {
      const decision = decideAttempt(limit, attempts, now);
      switch (decision.type) {
        case "allowed":
          return okAsync(null);
        case "limited":
          return errAsync({ type: "rate-limited", retryAfterSeconds: decision.retryAfterSeconds });
        default: {
          const _exhaustiveCheck: never = decision;
          throw new Error(`Unknown rate decision: ${JSON.stringify(_exhaustiveCheck)}`);
        }
      }
    },
  );
}
