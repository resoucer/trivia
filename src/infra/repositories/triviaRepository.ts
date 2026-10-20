import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { z } from "zod";
import { TriviaId, type UserId } from "@/domain/trivia/ids";
import type { Play, PlayCounting, UniquePlaySlot } from "@/domain/trivia/play";
import {
  encodeTrivia,
  schema_Question,
  schema_Trivia,
  summarizeTrivia,
  type Trivia,
  type TriviaSummary,
} from "@/domain/trivia/trivia";
import type { Db } from "@/infra/db/db";
import { corruptData, type DbError, dbFailure } from "@/infra/db/dbError";
import { playDedup, plays, triviaClaims, trivias } from "@/infra/db/tables";
import { jsonString } from "@/lib/json";
import { Just, type Maybe, Nothing } from "@/lib/maybe";
import { parseWith } from "@/lib/validation";

export type { RecordedPlay };
export {
  claimTriviaRecord,
  deleteAnonymousInactiveBefore,
  deleteTrivia,
  findClaimTokenHash,
  findTrivia,
  insertTrivia,
  listPublicTrivias,
  listTriviasOwnedBy,
  PublicListOrder,
  recordPlay,
  saveTrivia,
};

const PublicListOrder = { Popular: "popular", Recent: "recent" } as const;
type PublicListOrder = (typeof PublicListOrder)[keyof typeof PublicListOrder];

type TriviaRow = typeof trivias.$inferSelect;
type TriviaInsert = typeof trivias.$inferInsert;

/** Stored shape: like the domain schema, but questions live in a JSON text column. */
const schema_StoredTrivia = schema_Trivia.extend({
  questions: jsonString(z.array(schema_Question).min(1)),
});

function decodeRow(row: TriviaRow): ResultAsync<Trivia, DbError> {
  const result = parseWith(schema_StoredTrivia, {
    id: row.id,
    title: row.title,
    description: row.description,
    owner: { type: row.ownerType, userId: row.ownerUserId },
    authorName: row.authorName,
    questions: row.questionsJson,
    playCount: row.playCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastActivityAt: row.lastActivityAt,
  }).mapErr((e) => corruptData(e.issues));
  return result.match(
    (trivia) => okAsync(trivia),
    (error) => errAsync(error),
  );
}

function decodeRows(rows: ReadonlyArray<TriviaRow>): ResultAsync<ReadonlyArray<Trivia>, DbError> {
  return ResultAsync.combine(rows.map(decodeRow));
}

function toRow(trivia: Trivia): TriviaInsert {
  const encoded = encodeTrivia(trivia);
  return {
    id: encoded.id,
    title: encoded.title,
    description: encoded.description,
    ownerType: encoded.owner.type,
    ownerUserId: encoded.owner.type === "user" ? encoded.owner.userId : null,
    authorName: encoded.authorName,
    questionsJson: JSON.stringify(encoded.questions),
    playCount: encoded.playCount,
    createdAt: encoded.createdAt,
    updatedAt: encoded.updatedAt,
    lastActivityAt: encoded.lastActivityAt,
  };
}

function insertTrivia(db: Db, trivia: Trivia, claimTokenHash: Maybe<string>): ResultAsync<Trivia, DbError> {
  const insert = db.insert(trivias).values(toRow(trivia));
  const run: Promise<unknown> =
    claimTokenHash.type === "just"
      ? db.batch([
          insert,
          db.insert(triviaClaims).values({ triviaId: trivia.id.value, tokenHash: claimTokenHash.value }),
        ])
      : insert.then((r) => r);
  return ResultAsync.fromPromise(run, dbFailure).map((): Trivia => trivia);
}

function findTrivia(db: Db, id: TriviaId): ResultAsync<Maybe<Trivia>, DbError> {
  return ResultAsync.fromPromise(db.select().from(trivias).where(eq(trivias.id, id.value)).limit(1), dbFailure).andThen(
    (rows) => {
      const row = rows[0];
      return row === undefined ? okAsync(Nothing<Trivia>()) : decodeRow(row).map((t) => Just(t));
    },
  );
}

/** Persists content, ownership and timestamps of an existing trivia (counters are left to `recordPlay`). */
function saveTrivia(db: Db, trivia: Trivia): ResultAsync<Trivia, DbError> {
  const row = toRow(trivia);
  return ResultAsync.fromPromise(
    db
      .update(trivias)
      .set({
        title: row.title,
        description: row.description,
        ownerType: row.ownerType,
        ownerUserId: row.ownerUserId,
        authorName: row.authorName,
        questionsJson: row.questionsJson,
        updatedAt: row.updatedAt,
        lastActivityAt: row.lastActivityAt,
      })
      .where(eq(trivias.id, row.id)),
    dbFailure,
  ).map((): Trivia => trivia);
}

/** What happened to the counter: decided inside the batch, so concurrent plays cannot double count. */
type RecordedPlay = { readonly counting: PlayCounting; readonly playCount: number };

/**
 * Stores a play and, in one atomic batch:
 * 1. tries to claim the (trivia, visitor, day) slot with this play's id (`ON CONFLICT DO NOTHING`);
 * 2. increments the play count only if the slot now holds this play's id (i.e. the insert happened);
 * 3. always refreshes the activity timestamp (replays keep anonymous trivias alive).
 */
function recordPlay(db: Db, play: Play, slot: UniquePlaySlot): ResultAsync<RecordedPlay, DbError> {
  const slotIsThisPlay = and(
    eq(playDedup.triviaId, slot.triviaId.value),
    eq(playDedup.visitorKey, slot.visitorKey.value),
    eq(playDedup.day, slot.day.value),
    eq(playDedup.playId, play.id.value),
  );
  return ResultAsync.fromPromise(
    db.batch([
      db.insert(plays).values({
        id: play.id.value,
        triviaId: play.triviaId.value,
        correctCount: play.correctCount,
        totalCount: play.totalCount,
        playedAt: play.playedAt.toISOString(),
      }),
      db
        .insert(playDedup)
        .values({
          triviaId: slot.triviaId.value,
          visitorKey: slot.visitorKey.value,
          day: slot.day.value,
          playId: play.id.value,
        })
        .onConflictDoNothing(),
      db
        .update(trivias)
        .set({
          playCount: sql`${trivias.playCount} + (SELECT count(*) FROM ${playDedup} WHERE ${slotIsThisPlay})`,
          lastActivityAt: play.playedAt.toISOString(),
        })
        .where(eq(trivias.id, play.triviaId.value)),
      db.select({ playCount: trivias.playCount }).from(trivias).where(eq(trivias.id, play.triviaId.value)),
      db.select({ playId: playDedup.playId }).from(playDedup).where(slotIsThisPlay),
    ]),
    dbFailure,
  ).map(
    ([, , , counter, claimed]): RecordedPlay => ({
      counting: claimed.length > 0 ? { type: "counted" } : { type: "already-counted-today" },
      playCount: counter[0]?.playCount ?? 0,
    }),
  );
}

function orderColumns(order: PublicListOrder): ReadonlyArray<ReturnType<typeof desc>> {
  switch (order) {
    case PublicListOrder.Popular:
      return [desc(trivias.playCount), desc(trivias.createdAt)];
    case PublicListOrder.Recent:
      return [desc(trivias.createdAt)];
    default: {
      const _exhaustiveCheck: never = order;
      throw new Error(`Unknown order: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

/** Only trivias owned by a user are public (see `isListedPublicly`); the SQL filter mirrors that rule. */
function listPublicTrivias(
  db: Db,
  order: PublicListOrder,
  limit: number,
): ResultAsync<ReadonlyArray<TriviaSummary>, DbError> {
  return ResultAsync.fromPromise(
    db
      .select()
      .from(trivias)
      .where(eq(trivias.ownerType, "user"))
      .orderBy(...orderColumns(order))
      .limit(limit),
    dbFailure,
  )
    .andThen(decodeRows)
    .map((list) => list.map(summarizeTrivia));
}

function listTriviasOwnedBy(db: Db, userId: UserId): ResultAsync<ReadonlyArray<TriviaSummary>, DbError> {
  return ResultAsync.fromPromise(
    db
      .select()
      .from(trivias)
      .where(and(eq(trivias.ownerType, "user"), eq(trivias.ownerUserId, userId.value)))
      .orderBy(desc(trivias.createdAt)),
    dbFailure,
  )
    .andThen(decodeRows)
    .map((list) => list.map(summarizeTrivia));
}

function deleteTrivia(db: Db, id: TriviaId): ResultAsync<null, DbError> {
  return ResultAsync.fromPromise(
    db.batch([
      db.delete(plays).where(eq(plays.triviaId, id.value)),
      db.delete(playDedup).where(eq(playDedup.triviaId, id.value)),
      db.delete(triviaClaims).where(eq(triviaClaims.triviaId, id.value)),
      db.delete(trivias).where(eq(trivias.id, id.value)),
    ]),
    dbFailure,
  ).map((): null => null);
}

/**
 * Deletes anonymous trivias whose last activity is before `cutoff` (from `expirationCutoff`).
 * Returns the ids that were removed.
 */
function deleteAnonymousInactiveBefore(db: Db, cutoff: Date): ResultAsync<ReadonlyArray<TriviaId>, DbError> {
  const expired = and(eq(trivias.ownerType, "anonymous"), lt(trivias.lastActivityAt, cutoff.toISOString()));
  return ResultAsync.fromPromise(db.select({ id: trivias.id }).from(trivias).where(expired), dbFailure).andThen(
    (rows) => {
      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return okAsync<ReadonlyArray<TriviaId>, DbError>([]);
      return ResultAsync.fromPromise(
        db.batch([
          db.delete(plays).where(inArray(plays.triviaId, ids)),
          db.delete(playDedup).where(inArray(playDedup.triviaId, ids)),
          db.delete(triviaClaims).where(inArray(triviaClaims.triviaId, ids)),
          db.delete(trivias).where(and(inArray(trivias.id, ids), expired)),
        ]),
        dbFailure,
      ).map((): ReadonlyArray<TriviaId> => ids.map((id) => new TriviaId(id)));
    },
  );
}

function findClaimTokenHash(db: Db, id: TriviaId): ResultAsync<Maybe<string>, DbError> {
  return ResultAsync.fromPromise(
    db
      .select({ tokenHash: triviaClaims.tokenHash })
      .from(triviaClaims)
      .where(eq(triviaClaims.triviaId, id.value))
      .limit(1),
    dbFailure,
  ).map((rows): Maybe<string> => {
    const row = rows[0];
    return row === undefined ? Nothing() : Just(row.tokenHash);
  });
}

/** Saves a claimed trivia and burns its claim token in one batch. */
function claimTriviaRecord(db: Db, trivia: Trivia): ResultAsync<Trivia, DbError> {
  const row = toRow(trivia);
  return ResultAsync.fromPromise(
    db.batch([
      db
        .update(trivias)
        .set({
          ownerType: row.ownerType,
          ownerUserId: row.ownerUserId,
          authorName: row.authorName,
          updatedAt: row.updatedAt,
          lastActivityAt: row.lastActivityAt,
        })
        .where(and(eq(trivias.id, row.id), eq(trivias.ownerType, "anonymous"))),
      db.delete(triviaClaims).where(eq(triviaClaims.triviaId, row.id)),
    ]),
    dbFailure,
  ).map((): Trivia => trivia);
}
