import { and, eq, gt } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type { UserId } from "@/domain/trivia/ids";
import { type Email, schema_User, type User } from "@/domain/user/user";
import type { Db } from "@/infra/db/db";
import { corruptData, type DbError, dbFailure } from "@/infra/db/dbError";
import { passwordCredentials, sessions, users } from "@/infra/db/tables";
import { Just, type Maybe, Nothing } from "@/lib/maybe";
import { parseWith } from "@/lib/validation";

export type { InsertUserError, UserWithPasswordHash };
export {
  deleteSession,
  findUserBySessionTokenHash,
  findUserWithPasswordByEmail,
  insertSession,
  insertUserWithPassword,
};

type UserRow = typeof users.$inferSelect;
type UserWithPasswordHash = { readonly user: User; readonly passwordHash: string };
type InsertUserError = DbError | { readonly type: "email-taken" };

function decodeUser(row: UserRow): ResultAsync<User, DbError> {
  return parseWith(schema_User, { id: row.id, email: row.email, displayName: row.displayName }).match(
    (user) => okAsync(user),
    (e) => errAsync(corruptData(e.issues)),
  );
}

function insertUserWithPassword(
  db: Db,
  user: User,
  passwordHash: string,
  now: Date,
): ResultAsync<User, InsertUserError> {
  return ResultAsync.fromPromise(
    db.select({ id: users.id }).from(users).where(eq(users.email, user.email.value)).limit(1),
    dbFailure,
  ).andThen((existing): ResultAsync<User, InsertUserError> => {
    if (existing.length > 0) return errAsync({ type: "email-taken" });
    return ResultAsync.fromPromise(
      db.batch([
        db.insert(users).values({
          id: user.id.value,
          email: user.email.value,
          displayName: user.displayName.value,
          createdAt: now.toISOString(),
        }),
        db.insert(passwordCredentials).values({ userId: user.id.value, passwordHash }),
      ]),
      dbFailure,
    ).map((): User => user);
  });
}

function findUserWithPasswordByEmail(db: Db, email: Email): ResultAsync<Maybe<UserWithPasswordHash>, DbError> {
  return ResultAsync.fromPromise(
    db
      .select({ user: users, passwordHash: passwordCredentials.passwordHash })
      .from(users)
      .innerJoin(passwordCredentials, eq(passwordCredentials.userId, users.id))
      .where(eq(users.email, email.value))
      .limit(1),
    dbFailure,
  ).andThen((rows) => {
    const row = rows[0];
    return row === undefined
      ? okAsync(Nothing<UserWithPasswordHash>())
      : decodeUser(row.user).map((user) => Just({ user, passwordHash: row.passwordHash }));
  });
}

function insertSession(
  db: Db,
  tokenHash: string,
  userId: UserId,
  now: Date,
  expiresAt: Date,
): ResultAsync<null, DbError> {
  return ResultAsync.fromPromise(
    db.insert(sessions).values({
      tokenHash,
      userId: userId.value,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }),
    dbFailure,
  ).map((): null => null);
}

function findUserBySessionTokenHash(db: Db, tokenHash: string, now: Date): ResultAsync<Maybe<User>, DbError> {
  return ResultAsync.fromPromise(
    db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now.toISOString())))
      .limit(1),
    dbFailure,
  ).andThen((rows) => {
    const row = rows[0];
    return row === undefined ? okAsync(Nothing<User>()) : decodeUser(row.user).map((user) => Just(user));
  });
}

function deleteSession(db: Db, tokenHash: string): ResultAsync<null, DbError> {
  return ResultAsync.fromPromise(db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)), dbFailure).map(
    (): null => null,
  );
}
