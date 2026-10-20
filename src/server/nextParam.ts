import { z } from "zod";

export { safeNext };

/** Only same-site relative paths are accepted as post-login destinations (avoids open redirects). */
const schema_NextParam = z.object({
  next: z
    .string()
    .regex(/^\/(?!\/)[\w\-/?=&%.]*$/)
    .catch("/")
    .default("/"),
});

function safeNext(searchParams: Readonly<Record<string, string | Array<string> | undefined>>): string {
  const parsed = schema_NextParam.safeParse(searchParams);
  return parsed.success ? parsed.data.next : "/";
}
