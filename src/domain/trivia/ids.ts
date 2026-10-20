import { z } from "zod";

export { TriviaId, QuestionId, ChoiceId, PlayId, UserId };

const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{6,32}$/;
const LOCAL_ID_PATTERN = /^[a-z][0-9]{1,3}$/;

/** Public, URL-safe identifier of a trivia. Also used in the share link. */
class TriviaId {
  // @ts-expect-error _tag's existence prevents structural comparison
  private readonly _tag: null = null;
  constructor(public value: string) {}

  static schema = z
    .string()
    .regex(PUBLIC_ID_PATTERN, { error: "Identificador de trivia inválido" })
    .transform((v): TriviaId => new TriviaId(v));

  equals(other: TriviaId): boolean {
    return this.value === other.value;
  }
}

/** Identifier of a question, unique inside its trivia (e.g. "q1"). */
class QuestionId {
  // @ts-expect-error _tag's existence prevents structural comparison
  private readonly _tag: null = null;
  constructor(public value: string) {}

  static schema = z
    .string()
    .regex(LOCAL_ID_PATTERN, { error: "Identificador de pergunta inválido" })
    .transform((v): QuestionId => new QuestionId(v));

  static fromPosition(index: number): QuestionId {
    return new QuestionId(`q${index + 1}`);
  }

  equals(other: QuestionId): boolean {
    return this.value === other.value;
  }
}

/** Identifier of a choice, unique inside its question (e.g. "c2"). */
class ChoiceId {
  // @ts-expect-error _tag's existence prevents structural comparison
  private readonly _tag: null = null;
  constructor(public value: string) {}

  static schema = z
    .string()
    .regex(LOCAL_ID_PATTERN, { error: "Identificador de alternativa inválido" })
    .transform((v): ChoiceId => new ChoiceId(v));

  static fromPosition(index: number): ChoiceId {
    return new ChoiceId(`c${index + 1}`);
  }

  equals(other: ChoiceId): boolean {
    return this.value === other.value;
  }
}

class PlayId {
  // @ts-expect-error _tag's existence prevents structural comparison
  private readonly _tag: null = null;
  constructor(public value: string) {}

  static schema = z
    .string()
    .regex(PUBLIC_ID_PATTERN, { error: "Identificador de partida inválido" })
    .transform((v): PlayId => new PlayId(v));
}

/** Identity of a registered user (independent of how they authenticate: password today, OAuth later). */
class UserId {
  // @ts-expect-error _tag's existence prevents structural comparison
  private readonly _tag: null = null;
  constructor(public value: string) {}

  static schema = z
    .string()
    .regex(PUBLIC_ID_PATTERN, { error: "Identificador de usuário inválido" })
    .transform((v): UserId => new UserId(v));

  equals(other: UserId): boolean {
    return this.value === other.value;
  }
}
