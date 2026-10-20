import { randomBytes, scrypt, timingSafeEqual, type BinaryLike, type ScryptOptions } from "node:crypto";
import { ResultAsync, errAsync } from "neverthrow";
import { z } from "zod";
import { jsonString } from "@/lib/json";
import { parseWith } from "@/lib/validation";

export { hashPassword, verifyPassword };
export type { PasswordHashError };

type PasswordHashError =
  | { readonly type: "crypto-failure"; readonly message: string }
  | { readonly type: "corrupt-hash" };

/** Stored as JSON so it is decoded with a schema, never with string splitting. */
const schema_StoredHash = jsonString(
  z.object({
    algorithm: z.literal("scrypt"),
    N: z.number().int().positive(),
    r: z.number().int().positive(),
    p: z.number().int().positive(),
    keyLength: z.number().int().positive(),
    salt: z.base64(),
    hash: z.base64(),
  }),
);

type StoredHash = z.output<typeof schema_StoredHash>;

const PARAMS = { N: 16384, r: 8, p: 1, keyLength: 64 } as const;

function deriveKey(password: BinaryLike, salt: BinaryLike, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) => (error === null ? resolve(key) : reject(error)));
  });
}

function cryptoFailure(cause: unknown): PasswordHashError {
  return { type: "crypto-failure", message: cause instanceof Error ? cause.message : String(cause) };
}

function hashPassword(password: string): ResultAsync<string, PasswordHashError> {
  const salt = randomBytes(16);
  return ResultAsync.fromPromise(
    deriveKey(password, salt, PARAMS.keyLength, { N: PARAMS.N, r: PARAMS.r, p: PARAMS.p }),
    cryptoFailure,
  ).map((key): string => {
    const stored: StoredHash = {
      algorithm: "scrypt",
      ...PARAMS,
      salt: salt.toString("base64"),
      hash: key.toString("base64"),
    };
    return JSON.stringify(stored);
  });
}

function verifyPassword(password: string, storedHash: string): ResultAsync<boolean, PasswordHashError> {
  return parseWith(schema_StoredHash, storedHash).match(
    (stored) => {
      const expected = Buffer.from(stored.hash, "base64");
      return ResultAsync.fromPromise(
        deriveKey(password, Buffer.from(stored.salt, "base64"), stored.keyLength, { N: stored.N, r: stored.r, p: stored.p }),
        cryptoFailure,
      ).map((key): boolean => key.length === expected.length && timingSafeEqual(key, expected));
    },
    () => errAsync<boolean, PasswordHashError>({ type: "corrupt-hash" }),
  );
}
