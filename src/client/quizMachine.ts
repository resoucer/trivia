import type { ClientError } from "@/client/api";
import type { AnswerCheckDto, PlayResultDto } from "@/contract/dto";

export type { QuizAnswer, QuizConfig, QuizEffect, QuizEvent, QuizRetry, QuizState, QuizTransition };
export { initialQuizState, quizProgress, transition };

/** What the machine needs to know about the trivia: question ids and their choice ids, in order. */
type QuizConfig = {
  readonly questions: ReadonlyArray<{ readonly id: string; readonly choiceIds: ReadonlyArray<string> }>;
};

/** An answered question with the server's verdict. */
type QuizAnswer = { readonly questionId: string; readonly choiceId: string; readonly check: AnswerCheckDto };

/** What to do again after a failure. */
type QuizRetry =
  | {
      readonly type: "check";
      readonly index: number;
      readonly answers: ReadonlyArray<QuizAnswer>;
      readonly choiceId: string;
    }
  | { readonly type: "submit"; readonly answers: ReadonlyArray<QuizAnswer> };

/**
 * One question at a time:
 * answering → (choose) checking → (checked) feedback → (advance) answering of the next question …
 * … feedback of the last question → (advance) submitting → (submitted) finished.
 * Failures go to `error`, from which `retry` repeats the failed request.
 */
type QuizState =
  | { readonly status: "answering"; readonly index: number; readonly answers: ReadonlyArray<QuizAnswer> }
  | {
      readonly status: "checking";
      readonly index: number;
      readonly answers: ReadonlyArray<QuizAnswer>;
      readonly choiceId: string;
    }
  | {
      readonly status: "feedback";
      readonly index: number;
      /** Includes the answer to the current question (last element). */
      readonly answers: ReadonlyArray<QuizAnswer>;
      readonly check: AnswerCheckDto;
    }
  | { readonly status: "submitting"; readonly answers: ReadonlyArray<QuizAnswer> }
  | { readonly status: "finished"; readonly answers: ReadonlyArray<QuizAnswer>; readonly result: PlayResultDto }
  | { readonly status: "error"; readonly error: ClientError; readonly retry: QuizRetry };

type QuizEvent =
  | { readonly type: "choose"; readonly choiceId: string }
  | { readonly type: "check-succeeded"; readonly check: AnswerCheckDto }
  | { readonly type: "check-failed"; readonly error: ClientError }
  | { readonly type: "advance" }
  | { readonly type: "submit-succeeded"; readonly result: PlayResultDto }
  | { readonly type: "submit-failed"; readonly error: ClientError }
  | { readonly type: "retry" }
  | { readonly type: "restart" };

/** Side effect the UI must run after a transition (requests are started by transitions, never by renders). */
type QuizEffect =
  | { readonly type: "none" }
  | { readonly type: "check"; readonly questionId: string; readonly choiceId: string }
  | {
      readonly type: "submit";
      readonly answers: ReadonlyArray<{ readonly questionId: string; readonly choiceId: string }>;
    };

type QuizTransition = { readonly state: QuizState; readonly effect: QuizEffect };

const NONE: QuizEffect = { type: "none" };

function initialQuizState(): QuizState {
  return { status: "answering", index: 0, answers: [] };
}

function stay(state: QuizState): QuizTransition {
  return { state, effect: NONE };
}

function questionIdAt(config: QuizConfig, index: number): string | undefined {
  return config.questions[index]?.id;
}

function startCheck(
  config: QuizConfig,
  index: number,
  answers: ReadonlyArray<QuizAnswer>,
  choiceId: string,
): QuizTransition | undefined {
  const question = config.questions[index];
  if (question === undefined || !question.choiceIds.includes(choiceId)) return undefined;
  return {
    state: { status: "checking", index, answers, choiceId },
    effect: { type: "check", questionId: question.id, choiceId },
  };
}

function startSubmit(answers: ReadonlyArray<QuizAnswer>): QuizTransition {
  return {
    state: { status: "submitting", answers },
    effect: { type: "submit", answers: answers.map((a) => ({ questionId: a.questionId, choiceId: a.choiceId })) },
  };
}

function onAnswering(
  config: QuizConfig,
  state: Extract<QuizState, { status: "answering" }>,
  event: QuizEvent,
): QuizTransition {
  if (event.type !== "choose") return stay(state);
  return startCheck(config, state.index, state.answers, event.choiceId) ?? stay(state);
}

function onChecking(
  config: QuizConfig,
  state: Extract<QuizState, { status: "checking" }>,
  event: QuizEvent,
): QuizTransition {
  switch (event.type) {
    case "check-succeeded": {
      const questionId = questionIdAt(config, state.index);
      // Ignore stale or mismatched responses.
      if (event.check.questionId !== questionId || event.check.chosenChoiceId !== state.choiceId) return stay(state);
      const answer: QuizAnswer = { questionId, choiceId: state.choiceId, check: event.check };
      return stay({ status: "feedback", index: state.index, answers: [...state.answers, answer], check: event.check });
    }
    case "check-failed":
      return stay({
        status: "error",
        error: event.error,
        retry: { type: "check", index: state.index, answers: state.answers, choiceId: state.choiceId },
      });
    default:
      return stay(state);
  }
}

function onFeedback(
  config: QuizConfig,
  state: Extract<QuizState, { status: "feedback" }>,
  event: QuizEvent,
): QuizTransition {
  if (event.type !== "advance") return stay(state);
  const nextIndex = state.index + 1;
  return nextIndex < config.questions.length
    ? stay({ status: "answering", index: nextIndex, answers: state.answers })
    : startSubmit(state.answers);
}

function onSubmitting(state: Extract<QuizState, { status: "submitting" }>, event: QuizEvent): QuizTransition {
  switch (event.type) {
    case "submit-succeeded":
      return stay({ status: "finished", answers: state.answers, result: event.result });
    case "submit-failed":
      return stay({ status: "error", error: event.error, retry: { type: "submit", answers: state.answers } });
    default:
      return stay(state);
  }
}

function onError(config: QuizConfig, state: Extract<QuizState, { status: "error" }>, event: QuizEvent): QuizTransition {
  const retry = state.retry;
  switch (retry.type) {
    case "check":
      if (event.type === "retry") return startCheck(config, retry.index, retry.answers, retry.choiceId) ?? stay(state);
      // Picking another option after a failed check also tries again.
      if (event.type === "choose") return startCheck(config, retry.index, retry.answers, event.choiceId) ?? stay(state);
      return stay(state);
    case "submit":
      return event.type === "retry" ? startSubmit(retry.answers) : stay(state);
    default: {
      const _exhaustiveCheck: never = retry;
      throw new Error(`Unknown quiz retry: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

/** Pure reducer: next state plus the request to start, if any. Invalid events leave the state unchanged. */
function transition(config: QuizConfig, state: QuizState, event: QuizEvent): QuizTransition {
  if (event.type === "restart") return stay(initialQuizState());
  switch (state.status) {
    case "answering":
      return onAnswering(config, state, event);
    case "checking":
      return onChecking(config, state, event);
    case "feedback":
      return onFeedback(config, state, event);
    case "submitting":
      return onSubmitting(state, event);
    case "finished":
      return stay(state);
    case "error":
      return onError(config, state, event);
    default: {
      const _exhaustiveCheck: never = state;
      throw new Error(`Unknown quiz state: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

/** 1-based position for "Pergunta N de M"; while finishing, the bar is full. */
function quizProgress(
  config: QuizConfig,
  state: QuizState,
): { readonly position: number; readonly total: number; readonly ratio: number } {
  const total = config.questions.length;
  const answered = ((): number => {
    switch (state.status) {
      case "answering":
      case "checking":
      case "feedback":
      case "submitting":
      case "finished":
        return state.answers.length;
      case "error":
        return state.retry.answers.length;
      default: {
        const _exhaustiveCheck: never = state;
        throw new Error(`Unknown quiz state: ${JSON.stringify(_exhaustiveCheck)}`);
      }
    }
  })();
  const position = ((): number => {
    switch (state.status) {
      case "answering":
      case "checking":
      case "feedback":
        return state.index + 1;
      case "submitting":
      case "finished":
        return total;
      case "error":
        return state.retry.type === "check" ? state.retry.index + 1 : total;
      default: {
        const _exhaustiveCheck: never = state;
        throw new Error(`Unknown quiz state: ${JSON.stringify(_exhaustiveCheck)}`);
      }
    }
  })();
  return { position, total, ratio: total === 0 ? 0 : answered / total };
}
