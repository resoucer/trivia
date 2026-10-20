import { describe, expect, it } from "vitest";
import { ChoiceId, QuestionId } from "@/domain/trivia/ids";
import { checkAnswer, Grade, gradeOf, scoreSubmission } from "@/domain/trivia/scoring";
import { alice, ownedTrivia } from "@/test/fixtures";

const trivia = ownedTrivia(alice, {}, "trivia-1");
const answer = (q: string, c: string): { questionId: QuestionId; choiceId: ChoiceId } => ({
  questionId: new QuestionId(q),
  choiceId: new ChoiceId(c),
});

describe("scoreSubmission", () => {
  it("conta acertos e detalha cada pergunta", () => {
    const score = scoreSubmission(trivia, { answers: [answer("q1", "c2"), answer("q2", "c2")] })._unsafeUnwrap();
    expect(score.correctCount).toBe(1);
    expect(score.totalCount).toBe(2);
    expect(score.results.map((r) => r.isCorrect)).toEqual([true, false]);
  });

  it("falha com missing-answer quando falta resposta", () => {
    const error = scoreSubmission(trivia, { answers: [answer("q1", "c2")] })._unsafeUnwrapErr();
    expect(error).toEqual({ type: "missing-answer", questionId: new QuestionId("q2") });
  });

  it("falha com unknown-question, duplicate-answer e invalid-choice", () => {
    expect(scoreSubmission(trivia, { answers: [answer("q9", "c1")] })._unsafeUnwrapErr().type).toBe("unknown-question");
    expect(scoreSubmission(trivia, { answers: [answer("q1", "c1"), answer("q1", "c2")] })._unsafeUnwrapErr().type).toBe(
      "duplicate-answer",
    );
    expect(scoreSubmission(trivia, { answers: [answer("q1", "c9"), answer("q2", "c1")] })._unsafeUnwrapErr().type).toBe(
      "invalid-choice",
    );
  });
});

describe("gradeOf", () => {
  it("classifica pela proporção de acertos", () => {
    expect(gradeOf({ correctCount: 5, totalCount: 5 })).toBe(Grade.Perfect);
    expect(gradeOf({ correctCount: 4, totalCount: 5 })).toBe(Grade.Great);
    expect(gradeOf({ correctCount: 2, totalCount: 5 })).toBe(Grade.Fair);
    expect(gradeOf({ correctCount: 0, totalCount: 5 })).toBe(Grade.Poor);
  });
});

describe("checkAnswer (uma pergunta por vez)", () => {
  it("diz se acertou e qual é a correta", () => {
    expect(checkAnswer(trivia, new QuestionId("q1"), new ChoiceId("c2"))._unsafeUnwrap()).toEqual({
      questionId: new QuestionId("q1"),
      chosenChoiceId: new ChoiceId("c2"),
      correctChoiceId: new ChoiceId("c2"),
      isCorrect: true,
    });
    const wrong = checkAnswer(trivia, new QuestionId("q2"), new ChoiceId("c2"))._unsafeUnwrap();
    expect(wrong.isCorrect).toBe(false);
    expect(wrong.correctChoiceId.value).toBe("c1");
  });

  it("rejeita pergunta desconhecida e alternativa inválida", () => {
    expect(checkAnswer(trivia, new QuestionId("q9"), new ChoiceId("c1"))._unsafeUnwrapErr().type).toBe(
      "unknown-question",
    );
    expect(checkAnswer(trivia, new QuestionId("q1"), new ChoiceId("c9"))._unsafeUnwrapErr().type).toBe(
      "invalid-choice",
    );
  });
});
