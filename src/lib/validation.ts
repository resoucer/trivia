import { err, ok, type Result } from "neverthrow";
import type { z } from "zod";

export { parseWith, validationErrorFromZod };
export type { ValidationError, ValidationIssue };

type ValidationIssue = { readonly path: ReadonlyArray<string | number>; readonly message: string };

type ValidationError = {
  readonly type: "validation";
  readonly issues: ReadonlyArray<ValidationIssue>;
};

function validationErrorFromZod(error: z.ZodError): ValidationError {
  return {
    type: "validation",
    issues: error.issues.map((issue) => ({
      path: issue.path.map((segment) => (typeof segment === "number" ? segment : String(segment))),
      message: issue.message,
    })),
  };
}

/** `safeParse` converted to a Result, so expected validation failures never throw. */
function parseWith<S extends z.ZodType>(
  schema: S,
  input: unknown,
): Result<z.output<S>, ValidationError> {
  const parsed = schema.safeParse(input);
  return parsed.success ? ok(parsed.data) : err(validationErrorFromZod(parsed.error));
}
