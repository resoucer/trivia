import { err, ok, type Result } from "neverthrow";

export type { ConfigError };
export { DEV_VISITOR_SECRET, visitorSecret };

type ConfigError = { readonly type: "config"; readonly message: string };

/** Only for development and tests. Production must set TRIVIA_VISITOR_SECRET (see `.env.example`). */
const DEV_VISITOR_SECRET = "trivia-dev-visitor-secret-not-for-production";

/** Server secret used to HMAC network identities; rotating it only resets same-day dedup. */
function visitorSecret(): Result<string, ConfigError> {
  const configured = process.env.TRIVIA_VISITOR_SECRET;
  if (configured !== undefined && configured.length > 0) return ok(configured);
  return process.env.NODE_ENV === "production"
    ? err({ type: "config", message: "TRIVIA_VISITOR_SECRET is required in production" })
    : ok(DEV_VISITOR_SECRET);
}
