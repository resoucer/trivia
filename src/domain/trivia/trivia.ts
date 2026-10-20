import { z } from "zod";
import { ChoiceId, QuestionId, TriviaId } from "@/domain/trivia/ids";
import { expiresAt } from "@/domain/trivia/lifecycle";
import { encodeOwner, type Owner, schema_Owner } from "@/domain/trivia/owner";
import { DisplayName } from "@/domain/user/displayName";
import { fromNullable, Just, type Maybe, Nothing, toNullable } from "@/lib/maybe";

export type {
  Choice,
  Creator,
  PublicQuestion,
  PublicTrivia,
  Question,
  QuestionDraft,
  Trivia,
  TriviaDraft,
  TriviaEncoded,
  TriviaSummary,
};
export {
  createTrivia,
  editTrivia,
  encodeTrivia,
  schema_Question,
  schema_QuestionDraft,
  schema_Trivia,
  schema_TriviaDraft,
  summarizeTrivia,
  TRIVIA_LIMITS,
  toPublicTrivia,
  touchTrivia,
};

const TRIVIA_LIMITS = {
  titleMin: 3,
  titleMax: 120,
  descriptionMax: 500,
  promptMax: 300,
  choiceMax: 150,
  choicesMin: 2,
  choicesMax: 6,
  questionsMin: 1,
  questionsMax: 50,
} as const;

// ---------- Draft: what a creator submits ----------

const schema_QuestionDraft = z
  .object({
    prompt: z
      .string({ error: "Informe o enunciado" })
      .trim()
      .min(1, { error: "O enunciado não pode ficar vazio" })
      .max(TRIVIA_LIMITS.promptMax, { error: `O enunciado pode ter no máximo ${TRIVIA_LIMITS.promptMax} caracteres` }),
    choices: z
      .array(
        z
          .string({ error: "Informe a alternativa" })
          .trim()
          .min(1, { error: "A alternativa não pode ficar vazia" })
          .max(TRIVIA_LIMITS.choiceMax, {
            error: `A alternativa pode ter no máximo ${TRIVIA_LIMITS.choiceMax} caracteres`,
          }),
      )
      .min(TRIVIA_LIMITS.choicesMin, {
        error: `Cada pergunta precisa de pelo menos ${TRIVIA_LIMITS.choicesMin} alternativas`,
      })
      .max(TRIVIA_LIMITS.choicesMax, {
        error: `Cada pergunta pode ter no máximo ${TRIVIA_LIMITS.choicesMax} alternativas`,
      })
      .refine((choices) => new Set(choices.map((c) => c.toLocaleLowerCase("pt-BR"))).size === choices.length, {
        error: "As alternativas precisam ser diferentes entre si",
      }),
    correctChoiceIndex: z.number({ error: "Marque a alternativa correta" }).int().nonnegative(),
  })
  .refine((q) => q.correctChoiceIndex < q.choices.length, {
    error: "A alternativa correta precisa ser uma das alternativas",
    path: ["correctChoiceIndex"],
  });

const schema_TriviaDraft = z.object({
  title: z
    .string({ error: "Informe um título" })
    .trim()
    .min(TRIVIA_LIMITS.titleMin, { error: `O título precisa ter pelo menos ${TRIVIA_LIMITS.titleMin} caracteres` })
    .max(TRIVIA_LIMITS.titleMax, { error: `O título pode ter no máximo ${TRIVIA_LIMITS.titleMax} caracteres` }),
  description: z
    .string()
    .trim()
    .max(TRIVIA_LIMITS.descriptionMax, {
      error: `A descrição pode ter no máximo ${TRIVIA_LIMITS.descriptionMax} caracteres`,
    })
    .optional()
    .transform((d): Maybe<string> => (d === undefined || d.length === 0 ? Nothing() : Just(d))),
  questions: z
    .array(schema_QuestionDraft)
    .min(TRIVIA_LIMITS.questionsMin, { error: "Adicione pelo menos uma pergunta" })
    .max(TRIVIA_LIMITS.questionsMax, {
      error: `Uma trivia pode ter no máximo ${TRIVIA_LIMITS.questionsMax} perguntas`,
    }),
});

type QuestionDraft = z.infer<typeof schema_QuestionDraft>;
type TriviaDraft = z.infer<typeof schema_TriviaDraft>;

// ---------- Trivia: the stored aggregate ----------

const schema_Choice = z.object({ id: ChoiceId.schema, text: z.string().min(1) });

const schema_Question = z
  .object({
    id: QuestionId.schema,
    prompt: z.string().min(1),
    choices: z.array(schema_Choice).min(TRIVIA_LIMITS.choicesMin),
    correctChoiceId: ChoiceId.schema,
  })
  .refine((q) => q.choices.some((c) => c.id.equals(q.correctChoiceId)), {
    error: "correctChoiceId must reference one of the choices",
  });

const schema_IsoDate = z.iso.datetime().transform((s): Date => new Date(s));

const schema_Trivia = z.object({
  id: TriviaId.schema,
  title: z.string().min(1),
  description: z
    .string()
    .nullable()
    .transform((d): Maybe<string> => fromNullable(d)),
  owner: schema_Owner,
  authorName: DisplayName.schema,
  questions: z.array(schema_Question).min(TRIVIA_LIMITS.questionsMin),
  playCount: z.number().int().nonnegative(),
  createdAt: schema_IsoDate,
  updatedAt: schema_IsoDate,
  /** Last time the trivia was created, played or edited. Drives anonymous expiration. */
  lastActivityAt: schema_IsoDate,
});

type Choice = z.infer<typeof schema_Choice>;
type Question = z.infer<typeof schema_Question>;
type Trivia = z.infer<typeof schema_Trivia>;
/** Plain JSON-compatible shape of a Trivia, decoded by `schema_Trivia`. */
type TriviaEncoded = z.input<typeof schema_Trivia>;

/** Who is creating a trivia: the owner plus the name shown publicly as author. */
type Creator = { readonly owner: Owner; readonly displayName: DisplayName };

function questionsFromDraft(draft: TriviaDraft): ReadonlyArray<Question> {
  return draft.questions.map(
    (q, qi): Question => ({
      id: QuestionId.fromPosition(qi),
      prompt: q.prompt,
      choices: q.choices.map((text, ci): Choice => ({ id: ChoiceId.fromPosition(ci), text })),
      correctChoiceId: ChoiceId.fromPosition(q.correctChoiceIndex),
    }),
  );
}

function createTrivia(draft: TriviaDraft, creator: Creator, id: TriviaId, now: Date): Trivia {
  return {
    id,
    title: draft.title,
    description: draft.description,
    owner: creator.owner,
    authorName: creator.displayName,
    questions: [...questionsFromDraft(draft)],
    playCount: 0,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };
}

/** Replaces the content of a trivia. Authorization is decided by the caller (see `canEditTrivia`). */
function editTrivia(trivia: Trivia, draft: TriviaDraft, now: Date): Trivia {
  return {
    ...trivia,
    title: draft.title,
    description: draft.description,
    questions: [...questionsFromDraft(draft)],
    updatedAt: now,
    lastActivityAt: now,
  };
}

/** Registers a play: bumps the play count and the activity timestamp. */
function touchTrivia(trivia: Trivia, now: Date): Trivia {
  return { ...trivia, playCount: trivia.playCount + 1, lastActivityAt: now };
}

function encodeTrivia(trivia: Trivia): TriviaEncoded {
  return {
    id: trivia.id.value,
    title: trivia.title,
    description: toNullable(trivia.description),
    owner: encodeOwner(trivia.owner),
    authorName: trivia.authorName.value,
    questions: trivia.questions.map((q) => ({
      id: q.id.value,
      prompt: q.prompt,
      choices: q.choices.map((c) => ({ id: c.id.value, text: c.text })),
      correctChoiceId: q.correctChoiceId.value,
    })),
    playCount: trivia.playCount,
    createdAt: trivia.createdAt.toISOString(),
    updatedAt: trivia.updatedAt.toISOString(),
    lastActivityAt: trivia.lastActivityAt.toISOString(),
  };
}

// ---------- Read models ----------

type TriviaSummary = {
  readonly id: TriviaId;
  readonly title: string;
  readonly authorName: DisplayName;
  readonly owner: Owner;
  readonly questionCount: number;
  readonly playCount: number;
  readonly createdAt: Date;
};

function summarizeTrivia(trivia: Trivia): TriviaSummary {
  return {
    id: trivia.id,
    title: trivia.title,
    authorName: trivia.authorName,
    owner: trivia.owner,
    questionCount: trivia.questions.length,
    playCount: trivia.playCount,
    createdAt: trivia.createdAt,
  };
}

type PublicQuestion = {
  readonly id: QuestionId;
  readonly prompt: string;
  readonly choices: ReadonlyArray<Choice>;
};

/** What a player sees: the trivia without its answer key. */
type PublicTrivia = {
  readonly id: TriviaId;
  readonly title: string;
  readonly description: Maybe<string>;
  readonly authorName: DisplayName;
  readonly questions: ReadonlyArray<PublicQuestion>;
  readonly owner: Owner;
  readonly playCount: number;
  readonly createdAt: Date;
  readonly expiresAt: Maybe<Date>;
};

function toPublicTrivia(trivia: Trivia): PublicTrivia {
  return {
    id: trivia.id,
    title: trivia.title,
    description: trivia.description,
    authorName: trivia.authorName,
    questions: trivia.questions.map((q) => ({ id: q.id, prompt: q.prompt, choices: q.choices })),
    owner: trivia.owner,
    playCount: trivia.playCount,
    createdAt: trivia.createdAt,
    expiresAt: expiresAt(trivia),
  };
}
