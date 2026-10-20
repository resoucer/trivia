import { ResultAsync } from "neverthrow";
import { cookies } from "next/headers";
import type { TriviaId } from "@/domain/trivia/ids";
import { fromNullable, type Maybe } from "@/lib/maybe";

export {
  clearClaimToken,
  clearSessionToken,
  readClaimToken,
  readSessionToken,
  SESSION_TTL_DAYS,
  writeClaimToken,
  writeSessionToken,
};

const SESSION_COOKIE = "trivia_session";
const SESSION_TTL_DAYS = 30;
const CLAIM_TTL_DAYS = 30;
const DAY_SECONDS = 24 * 60 * 60;

function claimCookieName(id: TriviaId): string {
  return `trivia_claim_${id.value}`;
}

const baseOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env["NODE_ENV"] === "production",
} as const;

function readCookie(name: string): ResultAsync<Maybe<string>, never> {
  return ResultAsync.fromSafePromise(cookies()).map((store) => fromNullable(store.get(name)?.value));
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): ResultAsync<null, never> {
  return ResultAsync.fromSafePromise(cookies()).map((store): null => {
    store.set(name, value, { ...baseOptions, maxAge: maxAgeSeconds });
    return null;
  });
}

function deleteCookie(name: string): ResultAsync<null, never> {
  return ResultAsync.fromSafePromise(cookies()).map((store): null => {
    store.delete(name);
    return null;
  });
}

function readSessionToken(): ResultAsync<Maybe<string>, never> {
  return readCookie(SESSION_COOKIE);
}

function writeSessionToken(token: string): ResultAsync<null, never> {
  return writeCookie(SESSION_COOKIE, token, SESSION_TTL_DAYS * DAY_SECONDS);
}

function clearSessionToken(): ResultAsync<null, never> {
  return deleteCookie(SESSION_COOKIE);
}

function readClaimToken(id: TriviaId): ResultAsync<Maybe<string>, never> {
  return readCookie(claimCookieName(id));
}

function writeClaimToken(id: TriviaId, token: string): ResultAsync<null, never> {
  return writeCookie(claimCookieName(id), token, CLAIM_TTL_DAYS * DAY_SECONDS);
}

function clearClaimToken(id: TriviaId): ResultAsync<null, never> {
  return deleteCookie(claimCookieName(id));
}
