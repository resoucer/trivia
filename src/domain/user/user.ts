import { z } from "zod";
import { UserId } from "@/domain/trivia/ids";
import { DisplayName } from "@/domain/user/displayName";

export type { LoginInput, SignupInput, User, Viewer };
export { Email, PASSWORD_LIMITS, schema_LoginInput, schema_SignupInput, schema_User };

const PASSWORD_LIMITS = { min: 8, max: 200 } as const;

class Email {
  // @ts-expect-error _tag's existence prevents structural comparison
  private readonly _tag: null = null;
  constructor(public value: string) {}

  static schema = z
    .string({ error: "Informe um e-mail" })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "E-mail inválido" }))
    .transform((v): Email => new Email(v));
}

const schema_User = z.object({
  id: UserId.schema,
  email: Email.schema,
  displayName: DisplayName.schema,
});

type User = z.infer<typeof schema_User>;

const schema_Password = z
  .string({ error: "Informe uma senha" })
  .min(PASSWORD_LIMITS.min, { error: `A senha precisa ter pelo menos ${PASSWORD_LIMITS.min} caracteres` })
  .max(PASSWORD_LIMITS.max, { error: `A senha pode ter no máximo ${PASSWORD_LIMITS.max} caracteres` });

const schema_SignupInput = z.object({
  email: Email.schema,
  displayName: DisplayName.schema,
  password: schema_Password,
});

const schema_LoginInput = z.object({
  email: Email.schema,
  password: z.string({ error: "Informe a senha" }).min(1, { error: "Informe a senha" }),
});

type SignupInput = z.infer<typeof schema_SignupInput>;
type LoginInput = z.infer<typeof schema_LoginInput>;

/** Who is looking at / acting on the app right now. Login is optional. */
type Viewer = { readonly type: "anonymous" } | { readonly type: "user"; readonly user: User };
