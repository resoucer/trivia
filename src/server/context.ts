import type { ResultAsync } from "neverthrow";
import type { AppError } from "@/application/appError";
import { viewerFromSessionToken } from "@/application/authService";
import type { Viewer } from "@/domain/user/user";
import { readSessionToken } from "@/infra/auth/cookies";
import { getDb } from "@/infra/db/client";
import type { Db } from "@/infra/db/db";

export type { RequestContext };
export { requestContext };

type RequestContext = { readonly db: Db; readonly viewer: Viewer; readonly now: Date };

/**
 * Everything a request needs, resolved once: who is asking (session cookie), database and the clock.
 * Cookies are read first on purpose: that marks pages as request-time rendered before any database
 * access, so `next build` never touches the database (it may not be migrated yet).
 */
function requestContext(): ResultAsync<RequestContext, AppError> {
  const now = new Date();
  return readSessionToken().andThen((token) =>
    getDb()
      .mapErr((e): AppError => e)
      .andThen((db) => viewerFromSessionToken(db, token, now).map((viewer): RequestContext => ({ db, viewer, now }))),
  );
}
