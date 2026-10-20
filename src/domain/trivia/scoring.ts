import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { ChoiceId, QuestionId } from "@/domain/trivia/ids";
import type { Trivia } from "@/domain/trivia/trivia";

export { schema_Submission, scoreSubmission, Grade, gradeOf, gradeLabel };
export type { Submission, Score, QuestionResult, ScoringError };

const schema_Submission = z.object({
  answers: z
    .array(z.object({ questionId: QuestionId.schema, choiceId: ChoiceId.schema }))
    .max(100, { error: "Respostas demais" }),
});

type Submission = z.infer<typeof schema_Submission>;

type QuestionResult = {
  readonly questionId: QuestionId;
  readonly chosenChoiceId: ChoiceId;
  readonly correctChoiceId: ChoiceId;
  readonly isCorrect: boolean;
};

type Score = {
  readonly correctCount: number;
  readonly totalCount: number;
  readonly results: ReadonlyArray<QuestionResult>;
};

type ScoringError =
  | { readonly type: "unknown-question"; readonly questionId: QuestionId }
  | { readonly type: "duplicate-answer"; readonly questionId: QuestionId }
  | { readonly type: "missing-answer"; readonly questionId: QuestionId }
  | { readonly type: "invalid-choice"; readonly questionId: QuestionId; readonly choiceId: ChoiceId };

function scoreSubmission(trivia: Trivia, submission: Submission): Result<Score, ScoringError> {
  const knownQuestions = new Set(trivia.questions.map((q) => q.id.value));
  // Local, non-escaping mutation while indexing the answers.
  const answersByQuestion = new Map<string, ChoiceId>();
  for (const answer of submission.answers) {
    if (!knownQuestions.has(answer.questionId.value)) {
      return err({ type: "unknown-question", questionId: answer.questionId });
    }
    if (answersByQuestion.has(answer.questionId.value)) {
      return err({ type: "duplicate-answer", questionId: answer.questionId });
    }
    answersByQuestion.set(answer.questionId.value, answer.choiceId);
  }

  const results: Array<QuestionResult> = [];
  for (const question of trivia.questions) {
    const chosen = answersByQuestion.get(question.id.value);
    if (chosen === undefined) {
      return err({ type: "missing-answer", questionId: question.id });
    }
    if (!question.choices.some((c) => c.id.equals(chosen))) {
      return err({ type: "invalid-choice", questionId: question.id, choiceId: chosen });
    }
    results.push({
      questionId: question.id,
      chosenChoiceId: chosen,
      correctChoiceId: question.correctChoiceId,
      isCorrect: chosen.equals(question.correctChoiceId),
    });
  }

  return ok({
    correctCount: results.filter((r) => r.isCorrect).length,
    totalCount: results.length,
    results,
  });
}

const Grade = {
  Perfect: "perfect",
  Great: "great",
  Fair: "fair",
  Poor: "poor",
} as const;
type Grade = (typeof Grade)[keyof typeof Grade];

function gradeOf(score: Pick<Score, "correctCount" | "totalCount">): Grade {
  const ratio = score.totalCount === 0 ? 0 : score.correctCount / score.totalCount;
  if (ratio === 1) return Grade.Perfect;
  if (ratio >= 0.7) return Grade.Great;
  if (ratio >= 0.4) return Grade.Fair;
  return Grade.Poor;
}

function gradeLabel(grade: Grade): string {
  switch (grade) {
    case Grade.Perfect:
      return "Perfeito! Você acertou tudo.";
    case Grade.Great:
      return "Mandou muito bem!";
    case Grade.Fair:
      return "Nada mal, dá pra melhorar.";
    case Grade.Poor:
      return "Que tal tentar de novo?";
    default: {
      const _exhaustiveCheck: never = grade;
      throw new Error(`Unknown grade: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}
