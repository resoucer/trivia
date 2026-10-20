import type { ScoringError } from "@/domain/trivia/scoring";
import type { PasswordHashError } from "@/infra/auth/password";
import type { ConfigError } from "@/infra/config";
import type { DbError } from "@/infra/db/dbError";
import type { ValidationError } from "@/lib/validation";

export type { AppError };
export { forbidden, notFound, unauthenticated };

/** Every failure a use case can produce. The HTTP layer maps each variant exhaustively. */
type AppError =
  | ValidationError
  | DbError
  | PasswordHashError
  | ConfigError
  | { readonly type: "scoring"; readonly error: ScoringError }
  | { readonly type: "not-found" }
  | { readonly type: "forbidden" }
  | { readonly type: "unauthenticated" }
  | { readonly type: "email-taken" }
  | { readonly type: "invalid-credentials" }
  | { readonly type: "already-owned" };

function notFound(): AppError {
  return { type: "not-found" };
}

function forbidden(): AppError {
  return { type: "forbidden" };
}

function unauthenticated(): AppError {
  return { type: "unauthenticated" };
}
