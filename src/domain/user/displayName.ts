import { z } from "zod";

export { DisplayName };

class DisplayName {
  // @ts-expect-error _tag's existence prevents structural comparison
  private readonly _tag: null = null;
  constructor(public value: string) {}

  static schema = z
    .string({ error: "Informe um nome" })
    .trim()
    .min(2, { error: "O nome precisa ter pelo menos 2 caracteres" })
    .max(40, { error: "O nome pode ter no máximo 40 caracteres" })
    .transform((v): DisplayName => new DisplayName(v));
}
