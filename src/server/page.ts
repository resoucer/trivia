import type { ResultAsync } from "neverthrow";
import { notFound, redirect } from "next/navigation";
import type { AppError } from "@/application/appError";
import { errorMessage } from "@/server/http";

export { unwrapForPage };

/**
 * Boundary between Result-based use cases and Next.js pages. Next's own control flow
 * (`notFound`, `redirect`, error boundaries) is exception-based, so this is the one place
 * where a Result is turned into a throw.
 */
function unwrapForPage<T>(result: ResultAsync<T, AppError>, loginRedirect: string): Promise<T> {
  return result.match(
    (value) => value,
    (error): never => {
      switch (error.type) {
        case "not-found":
          return notFound();
        case "unauthenticated":
          return redirect(`/entrar?next=${encodeURIComponent(loginRedirect)}`);
        default:
          throw new Error(errorMessage(error));
      }
    },
  );
}
