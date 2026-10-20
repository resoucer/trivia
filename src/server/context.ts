import { ResultAsync } from "neverthrow";
import type { AppError } from "@/application/appError";
import { viewerFromSessionToken } from "@/application/authService";
import type { Viewer } from "@/domain/user/user";
import { readSessionToken } from "@/infra/auth/cookies";
import { getDb } from "@/infra/db/client";
import type { Db } from "@/infra/db/db";

export { requestContext };
export type { RequestContext };

type RequestContext = { readonly db: Db; readonly viewer: Viewer; readonly now: Date };

/** Everything a request needs, resolved once: database, who is asking (via session cookie) and the clock. */
function requestContext(): ResultAsync<RequestContext, AppError> {
  const now = new Date();
  return getDb()
    .mapErr((e): AppError => e)
    .andThen((db) =>
      readSessionToken()
        .andThen((token) => viewerFromSessionToken(db, token, now))
        .map((viewer): RequestContext => ({ db, viewer, now })),
    );
}
