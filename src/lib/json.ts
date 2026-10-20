import { Result } from "neverthrow";
import { z } from "zod";

export { jsonString };

const safeJsonParse = Result.fromThrowable(
  (text: string): unknown => JSON.parse(text),
  () => "JSON inválido",
);

/** Zod combinator: a string containing JSON, decoded with `inner`. No ad-hoc parsing at call sites. */
function jsonString<S extends z.ZodType>(inner: S): z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<unknown, string>>, S> {
  return z
    .string()
    .transform((text, ctx): unknown =>
      safeJsonParse(text).match(
        (value) => value,
        (message) => {
          ctx.issues.push({ code: "custom", message, input: text });
          return z.NEVER;
        },
      ),
    )
    .pipe(inner);
}
