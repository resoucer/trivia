import { describe, expect, it } from "vitest";
import {
  initialQuizState,
  type QuizConfig,
  type QuizEvent,
  type QuizState,
  quizProgress,
  transition,
} from "@/client/quizMachine";
import type { AnswerCheckDto, PlayResultDto } from "@/contract/dto";

const config: QuizConfig = {
  questions: [
    { id: "q1", choiceIds: ["c1", "c2", "c3"] },
    { id: "q2", choiceIds: ["c1", "c2"] },
  ],
};

const check = (questionId: string, chosen: string, correct: string): AnswerCheckDto => ({
  questionId,
  chosenChoiceId: chosen,
  correctChoiceId: correct,
  isCorrect: chosen === correct,
});

const result: PlayResultDto = {
  correctCount: 1,
  totalCount: 2,
  playCount: 5,
  counted: true,
  results: [check("q1", "c2", "c2"), check("q2", "c2", "c1")],
};

/** Applies events in order and returns the final state (effects are asserted separately). */
function run(events: ReadonlyArray<QuizEvent>, from: QuizState = initialQuizState()): QuizState {
  return events.reduce((state, event) => transition(config, state, event).state, from);
}

describe("máquina de estados do quiz (uma pergunta por vez)", () => {
  it("escolher uma alternativa dispara a verificação daquela pergunta", () => {
    const next = transition(config, initialQuizState(), { type: "choose", choiceId: "c2" });
    expect(next.state).toEqual({ status: "checking", index: 0, answers: [], choiceId: "c2" });
    expect(next.effect).toEqual({ type: "check", questionId: "q1", choiceId: "c2" });
  });

  it("ignora alternativas que não são da pergunta atual", () => {
    const next = transition(config, initialQuizState(), { type: "choose", choiceId: "c9" });
    expect(next.state).toEqual(initialQuizState());
    expect(next.effect).toEqual({ type: "none" });
  });

  it("mostra o feedback e avança para a próxima pergunta", () => {
    const feedback = run([
      { type: "choose", choiceId: "c2" },
      { type: "check-succeeded", check: check("q1", "c2", "c2") },
    ]);
    expect(feedback.status).toBe("feedback");
    const next = run([{ type: "advance" }], feedback);
    expect(next).toMatchObject({ status: "answering", index: 1 });
    expect(quizProgress(config, next)).toEqual({ position: 2, total: 2, ratio: 0.5 });
  });

  it("ignora respostas de verificação atrasadas ou de outra pergunta", () => {
    const checking = run([{ type: "choose", choiceId: "c2" }]);
    expect(run([{ type: "check-succeeded", check: check("q2", "c2", "c1") }], checking)).toEqual(checking);
    expect(run([{ type: "check-succeeded", check: check("q1", "c3", "c2") }], checking)).toEqual(checking);
  });

  it("não deixa responder de novo durante o feedback", () => {
    const feedback = run([
      { type: "choose", choiceId: "c1" },
      { type: "check-succeeded", check: check("q1", "c1", "c2") },
    ]);
    expect(run([{ type: "choose", choiceId: "c2" }], feedback)).toEqual(feedback);
  });

  it("na última pergunta, avançar envia todas as respostas e termina com o resultado", () => {
    const lastFeedback = run([
      { type: "choose", choiceId: "c2" },
      { type: "check-succeeded", check: check("q1", "c2", "c2") },
      { type: "advance" },
      { type: "choose", choiceId: "c2" },
      { type: "check-succeeded", check: check("q2", "c2", "c1") },
    ]);
    const submit = transition(config, lastFeedback, { type: "advance" });
    expect(submit.state.status).toBe("submitting");
    expect(submit.effect).toEqual({
      type: "submit",
      answers: [
        { questionId: "q1", choiceId: "c2" },
        { questionId: "q2", choiceId: "c2" },
      ],
    });
    const finished = run([{ type: "submit-succeeded", result }], submit.state);
    expect(finished).toMatchObject({ status: "finished", result });
    expect(quizProgress(config, finished)).toEqual({ position: 2, total: 2, ratio: 1 });
  });

  it("falha na verificação vai para erro e o retry repete a mesma verificação", () => {
    const failed = run([
      { type: "choose", choiceId: "c3" },
      { type: "check-failed", error: { type: "network" } },
    ]);
    expect(failed).toMatchObject({ status: "error", retry: { type: "check", index: 0, choiceId: "c3" } });
    const retried = transition(config, failed, { type: "retry" });
    expect(retried.effect).toEqual({ type: "check", questionId: "q1", choiceId: "c3" });
    const other = transition(config, failed, { type: "choose", choiceId: "c1" });
    expect(other.effect).toEqual({ type: "check", questionId: "q1", choiceId: "c1" });
  });

  it("falha no envio vai para erro e o retry reenvia", () => {
    const submitting: QuizState = { status: "submitting", answers: [] };
    const failed = run([{ type: "submit-failed", error: { type: "network" } }], submitting);
    expect(failed).toMatchObject({ status: "error", retry: { type: "submit" } });
    expect(transition(config, failed, { type: "retry" }).effect).toEqual({ type: "submit", answers: [] });
  });

  it("jogar de novo volta ao início de qualquer estado", () => {
    const finished: QuizState = { status: "finished", answers: [], result };
    expect(run([{ type: "restart" }], finished)).toEqual(initialQuizState());
    expect(quizProgress(config, initialQuizState())).toEqual({ position: 1, total: 2, ratio: 0 });
  });
});
