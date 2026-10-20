export type { RateDecision, RateLimit };
export { AuthAction, authRateLimitCutoff, authRateLimitOf, decideAttempt, windowStart };

/** Endpoints protected against brute force / mass sign-ups. */
const AuthAction = { Login: "login", Signup: "signup" } as const;
type AuthAction = (typeof AuthAction)[keyof typeof AuthAction];

type RateLimit = { readonly maxAttempts: number; readonly windowMs: number };

const MINUTE_MS = 60 * 1000;

const LOGIN_LIMIT: RateLimit = { maxAttempts: 10, windowMs: 15 * MINUTE_MS };
const SIGNUP_LIMIT: RateLimit = { maxAttempts: 5, windowMs: 60 * MINUTE_MS };

/** Counters older than this are useless (longest window) and can be pruned. */
const RETENTION_MS: number = 24 * 60 * MINUTE_MS;

type RateDecision = { readonly type: "allowed" } | { readonly type: "limited"; readonly retryAfterSeconds: number };

function authRateLimitOf(action: AuthAction): RateLimit {
  switch (action) {
    case AuthAction.Login:
      return LOGIN_LIMIT;
    case AuthAction.Signup:
      return SIGNUP_LIMIT;
    default: {
      const _exhaustiveCheck: never = action;
      throw new Error(`Unknown auth action: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

/** Fixed windows aligned to the epoch: every attempt in the same window shares one counter. */
function windowStart(limit: RateLimit, now: Date): Date {
  return new Date(Math.floor(now.getTime() / limit.windowMs) * limit.windowMs);
}

/** `attemptsInWindow` already includes the current attempt. */
function decideAttempt(limit: RateLimit, attemptsInWindow: number, now: Date): RateDecision {
  if (attemptsInWindow <= limit.maxAttempts) return { type: "allowed" };
  const windowEnd = windowStart(limit, now).getTime() + limit.windowMs;
  return { type: "limited", retryAfterSeconds: Math.max(1, Math.ceil((windowEnd - now.getTime()) / 1000)) };
}

function authRateLimitCutoff(now: Date): Date {
  return new Date(now.getTime() - RETENTION_MS);
}
