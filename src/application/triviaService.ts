import { ResultAsync, errAsync, okAsync, type Result } from "neverthrow";
import { z } from "zod";
import { forbidden, notFound, unauthenticated, type AppError } from "@/application/appError";
import { TriviaId } from "@/domain/trivia/ids";
import { canEditTrivia, claimTrivia, expirationCutoff, isExpired } from "@/domain/trivia/lifecycle";
import { createPlay } from "@/domain/trivia/play";
import { rankByPlays, recentFirst, type RankedTrivia } from "@/domain/trivia/ranking";
import { schema_Submission, scoreSubmission, type Score } from "@/domain/trivia/scoring";
import {
  createTrivia,
  editTrivia,
  schema_TriviaDraft,
  touchTrivia,
  type Creator,
  type Trivia,
  type TriviaSummary,
} from "@/domain/trivia/trivia";
import { anonymousOwner, userOwner } from "@/domain/trivia/owner";
import { DisplayName } from "@/domain/user/displayName";
import type { Viewer } from "@/domain/user/user";
import type { Db } from "@/infra/db/db";
import { newPlayId, newSecretToken, newTriviaId, sha256 } from "@/infra/random";
import {
  PublicListOrder,
  claimTriviaRecord,
  deleteAnonymousInactiveBefore,
  deleteTrivia,
  findClaimTokenHash,
  findTrivia,
  insertTrivia,
  listPublicTrivias,
  listTriviasOwnedBy,
  recordPlay,
  saveTrivia,
} from "@/infra/repositories/triviaRepository";
import { Just, Nothing, type Maybe } from "@/lib/maybe";
import { parseWith, type ValidationError } from "@/lib/validation";

export {
  createTriviaUseCase,
  loadTrivia,
  playTriviaUseCase,
  editTriviaUseCase,
  claimTriviaUseCase,
  rankingUseCase,
  recentUseCase,
  myTriviasUseCase,
  cleanupExpiredUseCase,
};
export type { CreatedTrivia, PlayOutcome };

type CreatedTrivia = {
  readonly trivia: Trivia;
  /** Only for anonymous trivias: secret the creator keeps (cookie) to claim it after logging in. */
  readonly claimToken: Maybe<string>;
};

type PlayOutcome = { readonly trivia: Trivia; readonly score: Score };

function fromParse<T>(result: Result<T, ValidationError>): ResultAsync<T, AppError> {
  return result.match(
    (value) => okAsync<T, AppError>(value),
    (error) => errAsync<T, AppError>(error),
  );
}

const schema_AnonymousCreator = z.object({ authorName: DisplayName.schema });

function resolveCreator(viewer: Viewer, input: unknown): ResultAsync<Creator, AppError> {
  switch (viewer.type) {
    case "anonymous":
      return fromParse(parseWith(schema_AnonymousCreator, input)).map(
        (c): Creator => ({ owner: anonymousOwner(), displayName: c.authorName }),
      );
    case "user":
      return okAsync({ owner: userOwner(viewer.user.id), displayName: viewer.user.displayName });
    default: {
      const _exhaustiveCheck: never = viewer;
      throw new Error(`Unknown viewer: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function createTriviaUseCase(db: Db, viewer: Viewer, input: unknown, now: Date): ResultAsync<CreatedTrivia, AppError> {
  return fromParse(parseWith(schema_TriviaDraft, input)).andThen((draft) =>
    resolveCreator(viewer, input).andThen((creator) => {
      const trivia = createTrivia(draft, creator, newTriviaId(), now);
      const claimToken: Maybe<string> = creator.owner.type === "anonymous" ? Just(newSecretToken()) : Nothing();
      const claimHash: Maybe<string> = claimToken.type === "just" ? Just(sha256(claimToken.value)) : Nothing();
      return insertTrivia(db, trivia, claimHash).map((saved): CreatedTrivia => ({ trivia: saved, claimToken }));
    }),
  );
}

/**
 * Loads a trivia by its (untrusted) id. Expired anonymous trivias are deleted lazily
 * and reported as not found, so they disappear even before the cleanup job runs.
 */
function loadTrivia(db: Db, rawId: string, now: Date): ResultAsync<Trivia, AppError> {
  return parseWith(TriviaId.schema, rawId).match(
    (id) =>
      findTrivia(db, id).andThen((found): ResultAsync<Trivia, AppError> => {
        if (found.type === "nothing") return errAsync(notFound());
        if (isExpired(found.value, now)) {
          return deleteTrivia(db, found.value.id).andThen(() => errAsync<Trivia, AppError>(notFound()));
        }
        return okAsync(found.value);
      }),
    () => errAsync<Trivia, AppError>(notFound()),
  );
}

function playTriviaUseCase(db: Db, rawId: string, input: unknown, now: Date): ResultAsync<PlayOutcome, AppError> {
  return loadTrivia(db, rawId, now).andThen((trivia) =>
    fromParse(parseWith(schema_Submission, input)).andThen((submission) =>
      scoreSubmission(trivia, submission).match(
        (score) =>
          recordPlay(db, createPlay(newPlayId(), trivia.id, score, now)).map(
            (): PlayOutcome => ({ trivia: touchTrivia(trivia, now), score }),
          ),
        (error) => errAsync<PlayOutcome, AppError>({ type: "scoring", error }),
      ),
    ),
  );
}

function editTriviaUseCase(db: Db, viewer: Viewer, rawId: string, input: unknown, now: Date): ResultAsync<Trivia, AppError> {
  if (viewer.type === "anonymous") return errAsync(unauthenticated());
  return loadTrivia(db, rawId, now).andThen((trivia) => {
    if (!canEditTrivia(trivia, viewer)) return errAsync<Trivia, AppError>(forbidden());
    return fromParse(parseWith(schema_TriviaDraft, input)).andThen((draft) =>
      saveTrivia(db, editTrivia(trivia, draft, now)),
    );
  });
}

/** Moves an anonymous trivia into the viewer's account, given the claim token its creator received. */
function claimTriviaUseCase(
  db: Db,
  viewer: Viewer,
  rawId: string,
  claimToken: Maybe<string>,
  now: Date,
): ResultAsync<Trivia, AppError> {
  switch (viewer.type) {
    case "anonymous":
      return errAsync(unauthenticated());
    case "user":
      return loadTrivia(db, rawId, now).andThen((trivia) =>
        findClaimTokenHash(db, trivia.id).andThen((storedHash): ResultAsync<Trivia, AppError> => {
          const matches =
            storedHash.type === "just" && claimToken.type === "just" && sha256(claimToken.value) === storedHash.value;
          if (!matches) return errAsync(forbidden());
          return claimTrivia(trivia, viewer.user, now).match(
            (claimed) => claimTriviaRecord(db, claimed),
            (error) => errAsync<Trivia, AppError>(error),
          );
        }),
      );
    default: {
      const _exhaustiveCheck: never = viewer;
      throw new Error(`Unknown viewer: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function rankingUseCase(db: Db, limit: number): ResultAsync<ReadonlyArray<RankedTrivia>, AppError> {
  return listPublicTrivias(db, PublicListOrder.Popular, limit).map(rankByPlays);
}

function recentUseCase(db: Db, limit: number): ResultAsync<ReadonlyArray<TriviaSummary>, AppError> {
  return listPublicTrivias(db, PublicListOrder.Recent, limit).map(recentFirst);
}

function myTriviasUseCase(db: Db, viewer: Viewer): ResultAsync<ReadonlyArray<TriviaSummary>, AppError> {
  switch (viewer.type) {
    case "anonymous":
      return errAsync(unauthenticated());
    case "user":
      return listTriviasOwnedBy(db, viewer.user.id);
    default: {
      const _exhaustiveCheck: never = viewer;
      throw new Error(`Unknown viewer: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function cleanupExpiredUseCase(db: Db, now: Date): ResultAsync<ReadonlyArray<TriviaId>, AppError> {
  return deleteAnonymousInactiveBefore(db, expirationCutoff(now));
}
