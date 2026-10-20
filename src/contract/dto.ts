import { z } from "zod";
import type { RankedTrivia } from "@/domain/trivia/ranking";
import type { Score } from "@/domain/trivia/scoring";
import type { PublicTrivia, Trivia, TriviaSummary } from "@/domain/trivia/trivia";
import type { Viewer } from "@/domain/user/user";
import { mapMaybe, toNullable } from "@/lib/maybe";

export type {
  CreatedTriviaDto,
  ErrorDto,
  PlayResultDto,
  PublicTriviaDto,
  RankedTriviaDto,
  TriviaFormDto,
  TriviaSummaryDto,
  ViewerDto,
};
export {
  emptyQuestionForm,
  encodePlayResult,
  encodePublicTrivia,
  encodeRanked,
  encodeSummary,
  encodeTriviaForm,
  encodeViewer,
  schema_CreatedTriviaDto,
  schema_ErrorDto,
  schema_PlayResultDto,
  schema_PublicTriviaDto,
  schema_RankedTriviaDto,
  schema_TriviaFormDto,
  schema_TriviaSummaryDto,
  schema_ViewerDto,
  sharePath,
};

/*
 * Wire format between server and browser. Plain JSON (strings, numbers, null), validated
 * with Zod on both sides. Domain values are encoded explicitly by the `encode*` functions.
 */

const schema_TriviaSummaryDto = z.object({
  id: z.string(),
  title: z.string(),
  authorName: z.string(),
  questionCount: z.number().int(),
  playCount: z.number().int(),
  createdAt: z.iso.datetime(),
});

const schema_RankedTriviaDto = z.object({ position: z.number().int(), trivia: schema_TriviaSummaryDto });

const schema_PublicTriviaDto = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  authorName: z.string(),
  ownerType: z.enum(["anonymous", "user"]),
  playCount: z.number().int(),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime().nullable(),
  questions: z.array(
    z.object({
      id: z.string(),
      prompt: z.string(),
      choices: z.array(z.object({ id: z.string(), text: z.string() })),
    }),
  ),
});

const schema_PlayResultDto = z.object({
  correctCount: z.number().int(),
  totalCount: z.number().int(),
  playCount: z.number().int(),
  results: z.array(
    z.object({
      questionId: z.string(),
      chosenChoiceId: z.string(),
      correctChoiceId: z.string(),
      isCorrect: z.boolean(),
    }),
  ),
});

const schema_CreatedTriviaDto = z.object({
  id: z.string(),
  sharePath: z.string(),
  ownerType: z.enum(["anonymous", "user"]),
});

const schema_ErrorDto = z.object({
  error: z.object({
    type: z.string(),
    message: z.string(),
    issues: z.array(z.object({ path: z.array(z.union([z.string(), z.number()])), message: z.string() })),
  }),
});

const schema_ViewerDto = z.discriminatedUnion("type", [
  z.object({ type: z.literal("anonymous") }),
  z.object({ type: z.literal("user"), user: z.object({ id: z.string(), email: z.string(), displayName: z.string() }) }),
]);

/** Editable content of a trivia, in the same shape the create/edit endpoints accept. */
const schema_TriviaFormDto = z.object({
  title: z.string(),
  description: z.string(),
  questions: z.array(
    z.object({ prompt: z.string(), choices: z.array(z.string()), correctChoiceIndex: z.number().int() }),
  ),
});

type TriviaSummaryDto = z.infer<typeof schema_TriviaSummaryDto>;
type RankedTriviaDto = z.infer<typeof schema_RankedTriviaDto>;
type PublicTriviaDto = z.infer<typeof schema_PublicTriviaDto>;
type PlayResultDto = z.infer<typeof schema_PlayResultDto>;
type CreatedTriviaDto = z.infer<typeof schema_CreatedTriviaDto>;
type ErrorDto = z.infer<typeof schema_ErrorDto>;
type ViewerDto = z.infer<typeof schema_ViewerDto>;
type TriviaFormDto = z.infer<typeof schema_TriviaFormDto>;

function sharePath(id: { readonly value: string }): string {
  return `/t/${encodeURIComponent(id.value)}`;
}

function encodeSummary(s: TriviaSummary): TriviaSummaryDto {
  return {
    id: s.id.value,
    title: s.title,
    authorName: s.authorName.value,
    questionCount: s.questionCount,
    playCount: s.playCount,
    createdAt: s.createdAt.toISOString(),
  };
}

function encodeRanked(r: RankedTrivia): RankedTriviaDto {
  return { position: r.position, trivia: encodeSummary(r.trivia) };
}

function encodePublicTrivia(t: PublicTrivia): PublicTriviaDto {
  return {
    id: t.id.value,
    title: t.title,
    description: toNullable(t.description),
    authorName: t.authorName.value,
    ownerType: t.owner.type,
    playCount: t.playCount,
    createdAt: t.createdAt.toISOString(),
    expiresAt: toNullable(mapMaybe(t.expiresAt, (d) => d.toISOString())),
    questions: t.questions.map((q) => ({
      id: q.id.value,
      prompt: q.prompt,
      choices: q.choices.map((c) => ({ id: c.id.value, text: c.text })),
    })),
  };
}

function encodePlayResult(score: Score, playCount: number): PlayResultDto {
  return {
    correctCount: score.correctCount,
    totalCount: score.totalCount,
    playCount,
    results: score.results.map((r) => ({
      questionId: r.questionId.value,
      chosenChoiceId: r.chosenChoiceId.value,
      correctChoiceId: r.correctChoiceId.value,
      isCorrect: r.isCorrect,
    })),
  };
}

function encodeViewer(viewer: Viewer): ViewerDto {
  switch (viewer.type) {
    case "anonymous":
      return { type: "anonymous" };
    case "user":
      return {
        type: "user",
        user: { id: viewer.user.id.value, email: viewer.user.email.value, displayName: viewer.user.displayName.value },
      };
    default: {
      const _exhaustiveCheck: never = viewer;
      throw new Error(`Unknown viewer: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function encodeTriviaForm(t: Trivia): TriviaFormDto {
  return {
    title: t.title,
    description: toNullable(t.description) ?? "",
    questions: t.questions.map((q) => ({
      prompt: q.prompt,
      choices: q.choices.map((c) => c.text),
      correctChoiceIndex: q.choices.findIndex((c) => c.id.equals(q.correctChoiceId)),
    })),
  };
}

function emptyQuestionForm(): TriviaFormDto["questions"][number] {
  return { prompt: "", choices: ["", ""], correctChoiceIndex: 0 };
}
