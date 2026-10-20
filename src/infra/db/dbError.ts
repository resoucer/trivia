import type { ValidationIssue } from "@/lib/validation";

export { dbFailure, corruptData };
export type { DbError };

/** Infrastructure failures, kept apart from domain errors such as "not found". */
type DbError =
  | { readonly type: "db-failure"; readonly message: string }
  | { readonly type: "corrupt-data"; readonly issues: ReadonlyArray<ValidationIssue> };

function dbFailure(cause: unknown): DbError {
  return { type: "db-failure", message: cause instanceof Error ? cause.message : String(cause) };
}

function corruptData(issues: ReadonlyArray<ValidationIssue>): DbError {
  return { type: "corrupt-data", issues };
}
