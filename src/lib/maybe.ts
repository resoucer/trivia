export { Just, Nothing, fromNullable, mapMaybe, withDefault, matchMaybe, isJust, toNullable };
export type { Maybe };

type Maybe<T> =
  | { readonly type: "just"; readonly value: T }
  | { readonly type: "nothing" };

function Just<T>(value: T): Maybe<T> {
  return { type: "just", value };
}

function Nothing<T>(): Maybe<T> {
  return { type: "nothing" };
}

function fromNullable<T>(value: T | null | undefined): Maybe<T> {
  return value === null || value === undefined ? Nothing() : Just(value);
}

function isJust<T>(maybe: Maybe<T>): maybe is { readonly type: "just"; readonly value: T } {
  return maybe.type === "just";
}

function matchMaybe<T, R>(
  maybe: Maybe<T>,
  cases: { readonly just: (value: T) => R; readonly nothing: () => R },
): R {
  switch (maybe.type) {
    case "just":
      return cases.just(maybe.value);
    case "nothing":
      return cases.nothing();
    default: {
      const _exhaustiveCheck: never = maybe;
      throw new Error(`Unknown Maybe: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function mapMaybe<T, R>(maybe: Maybe<T>, f: (value: T) => R): Maybe<R> {
  return matchMaybe(maybe, { just: (value) => Just(f(value)), nothing: () => Nothing<R>() });
}

function withDefault<T>(maybe: Maybe<T>, fallback: T): T {
  return matchMaybe(maybe, { just: (value) => value, nothing: () => fallback });
}

/** Encoding boundary only (DB columns, JSON DTOs). Domain code stays on Maybe. */
function toNullable<T>(maybe: Maybe<T>): T | null {
  return matchMaybe<T, T | null>(maybe, { just: (value) => value, nothing: () => null });
}
