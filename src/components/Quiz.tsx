"use client";

import { useRouter } from "next/navigation";
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HttpMethod, requestJson } from "@/client/api";
import {
  initialQuizState,
  type QuizAnswer,
  type QuizConfig,
  type QuizEffect,
  type QuizEvent,
  type QuizState,
  quizProgress,
  transition,
} from "@/client/quizMachine";
import { ErrorBox } from "@/components/ErrorBox";
import { ShareBox } from "@/components/ShareBox";
import { type PlayResultDto, type PublicTriviaDto, schema_AnswerCheckDto, schema_PlayResultDto } from "@/contract/dto";
import { gradeLabel, gradeOf } from "@/domain/trivia/scoring";

export { Quiz };

type Question = PublicTriviaDto["questions"][number];

/** Plays a trivia one question at a time, with immediate feedback per answer (see ADR 0019). */
function Quiz({ trivia, sharePath }: { trivia: PublicTriviaDto; sharePath: string }) {
  const router = useRouter();
  const config = useMemo<QuizConfig>(
    () => ({ questions: trivia.questions.map((q) => ({ id: q.id, choiceIds: q.choices.map((c) => c.id) })) }),
    [trivia],
  );
  const [state, setState] = useState<QuizState>(initialQuizState);
  // Latest state for event handlers and async callbacks (avoids stale closures; transitions stay pure).
  const stateRef = useRef<QuizState>(state);

  // Async results re-enter through the latest dispatch (no stale closures).
  const dispatchRef = useRef<(event: QuizEvent) => void>(() => undefined);
  const dispatch = useCallback(
    (event: QuizEvent): void => {
      const next = transition(config, stateRef.current, event);
      stateRef.current = next.state;
      setState(next.state);
      runEffect(
        trivia.id,
        next.effect,
        (e) => dispatchRef.current(e),
        () => router.refresh(),
      );
    },
    [config, trivia.id, router],
  );
  dispatchRef.current = dispatch;

  // Keyboard: 1–9 pick an option, Enter goes to the next question / result.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const current = stateRef.current;
      if (e.key === "Enter" && current.status === "feedback") {
        e.preventDefault();
        dispatch({ type: "advance" });
        return;
      }
      const digit = Number.parseInt(e.key, 10);
      if (Number.isNaN(digit) || digit < 1) return;
      const index = current.status === "answering" ? current.index : undefined;
      const question = index === undefined ? undefined : trivia.questions[index];
      const choice = question?.choices[digit - 1];
      if (choice !== undefined) dispatch({ type: "choose", choiceId: choice.id });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, trivia]);

  switch (state.status) {
    case "finished":
      return (
        <Summary
          trivia={trivia}
          answers={state.answers}
          result={state.result}
          sharePath={sharePath}
          onRestart={() => dispatch({ type: "restart" })}
        />
      );
    case "submitting":
      return (
        <div className="space-y-4">
          <Progress config={config} state={state} />
          <p role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm">
            Calculando seu resultado…
          </p>
        </div>
      );
    case "error":
      if (state.retry.type === "submit") {
        return (
          <div className="space-y-4">
            <Progress config={config} state={state} />
            <ErrorBox error={state.error} />
            <RetryButton onRetry={() => dispatch({ type: "retry" })} />
          </div>
        );
      }
      return (
        <QuestionCard
          config={config}
          state={state}
          question={trivia.questions[state.retry.index]}
          dispatch={dispatch}
        />
      );
    case "answering":
    case "checking":
    case "feedback":
      return (
        <QuestionCard config={config} state={state} question={trivia.questions[state.index]} dispatch={dispatch} />
      );
    default: {
      const _exhaustiveCheck: never = state;
      throw new Error(`Unknown quiz state: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

/** Runs the request a transition asked for and feeds its outcome back as an event. */
function runEffect(
  triviaId: string,
  effect: QuizEffect,
  dispatch: (event: QuizEvent) => void,
  onSubmitted: () => void,
): void {
  const base = `/api/trivias/${encodeURIComponent(triviaId)}`;
  switch (effect.type) {
    case "none":
      return;
    case "check":
      void requestJson(
        HttpMethod.Post,
        `${base}/questions/${encodeURIComponent(effect.questionId)}/check`,
        { choiceId: effect.choiceId },
        schema_AnswerCheckDto,
      ).match(
        (check) => dispatch({ type: "check-succeeded", check }),
        (error) => dispatch({ type: "check-failed", error }),
      );
      return;
    case "submit":
      void requestJson(HttpMethod.Post, `${base}/plays`, { answers: effect.answers }, schema_PlayResultDto).match(
        (result) => {
          dispatch({ type: "submit-succeeded", result });
          onSubmitted();
        },
        (error) => dispatch({ type: "submit-failed", error }),
      );
      return;
    default: {
      const _exhaustiveCheck: never = effect;
      throw new Error(`Unknown quiz effect: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function Progress({ config, state }: { config: QuizConfig; state: QuizState }) {
  const { position, total, ratio } = quizProgress(config, state);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-600">
        Pergunta {position} de {total}
      </p>
      <div
        role="progressbar"
        aria-label="Progresso do quiz"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.round(ratio * total)}
        className="h-2 overflow-hidden rounded-full bg-slate-200"
      >
        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

type QuestionState = Extract<QuizState, { status: "answering" | "checking" | "feedback" | "error" }>;

function QuestionCard({
  config,
  state,
  question,
  dispatch,
}: {
  config: QuizConfig;
  state: QuestionState;
  question: Question | undefined;
  dispatch: (event: QuizEvent) => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const questionId = question?.id;

  // New question: move focus to its prompt so screen readers announce it.
  useEffect(() => {
    if (questionId !== undefined) headingRef.current?.focus();
  }, [questionId]);

  // Feedback shown: focus "Próxima" so Enter/Space continue.
  useEffect(() => {
    if (state.status === "feedback") nextRef.current?.focus();
  }, [state.status]);

  if (question === undefined) return null;
  const { position, total } = quizProgress(config, state);
  const isLast = position === total;
  const chosenId = selectedChoice(state);
  const check = state.status === "feedback" ? state.check : undefined;
  const locked = state.status === "checking" || state.status === "feedback";

  const onOptionKey = (e: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const delta =
      e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) return;
    e.preventDefault();
    const count = question.choices.length;
    optionRefs.current[(index + delta + count) % count]?.focus();
  };

  return (
    <div className="space-y-4">
      <Progress config={config} state={state} />
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2
          id={`prompt-${question.id}`}
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold text-slate-800 outline-none"
        >
          {question.prompt}
        </h2>
        <div role="radiogroup" aria-labelledby={`prompt-${question.id}`} className="grid gap-2">
          {question.choices.map((choice, ci) => {
            const selected = chosenId === choice.id;
            const tone =
              check === undefined
                ? selected
                  ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                  : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                : choice.id === check.correctChoiceId
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                  : selected
                    ? "border-rose-400 bg-rose-50 text-rose-900"
                    : "border-slate-200 opacity-60";
            return (
              // biome-ignore lint/a11y/useSemanticElements: picking submits the answer at once; native radios change selection on arrow keys, which would submit by accident
              <button
                key={choice.id}
                ref={(el) => {
                  optionRefs.current[ci] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={locked}
                data-correct={check !== undefined && choice.id === check.correctChoiceId ? "true" : undefined}
                onClick={() => (locked ? undefined : dispatch({ type: "choose", choiceId: choice.id }))}
                onKeyDown={(e) => onOptionKey(e, ci)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${tone}`}
              >
                <kbd className="rounded border border-slate-300 bg-white px-1.5 text-xs text-slate-500">{ci + 1}</kbd>
                <span>{choice.text}</span>
              </button>
            );
          })}
        </div>

        <div aria-live="polite" className="min-h-6">
          {state.status === "checking" ? <p className="text-sm text-slate-500">Conferindo…</p> : null}
          {check === undefined ? null : (
            <p className={`font-semibold ${check.isCorrect ? "text-emerald-700" : "text-rose-700"}`}>
              {check.isCorrect
                ? "Correto!"
                : `Incorreto. A resposta certa é: ${choiceText(question, check.correctChoiceId)}`}
            </p>
          )}
        </div>
        {state.status === "error" ? (
          <div className="space-y-3">
            <ErrorBox error={state.error} />
            <RetryButton onRetry={() => dispatch({ type: "retry" })} />
          </div>
        ) : null}

        {state.status === "feedback" ? (
          <button
            ref={nextRef}
            type="button"
            onClick={() => dispatch({ type: "advance" })}
            className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700"
          >
            {isLast ? "Ver resultado" : "Próxima"}
          </button>
        ) : (
          <p className="text-xs text-slate-500">Dica: use as teclas 1–{question.choices.length} para responder.</p>
        )}
      </section>
    </div>
  );
}

function selectedChoice(state: QuestionState): string | undefined {
  switch (state.status) {
    case "answering":
      return undefined;
    case "checking":
      return state.choiceId;
    case "feedback":
      return state.check.chosenChoiceId;
    case "error":
      return state.retry.type === "check" ? state.retry.choiceId : undefined;
    default: {
      const _exhaustiveCheck: never = state;
      throw new Error(`Unknown quiz state: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function choiceText(question: Question, choiceId: string): string {
  return question.choices.find((c) => c.id === choiceId)?.text ?? choiceId;
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Tentar de novo
    </button>
  );
}

function Summary({
  trivia,
  answers,
  result,
  sharePath,
  onRestart,
}: {
  trivia: PublicTriviaDto;
  answers: ReadonlyArray<QuizAnswer>;
  result: PlayResultDto;
  sharePath: string;
  onRestart: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  // The server's result is authoritative; per-question feedback is only used as a fallback.
  const resultFor = (questionId: string): PlayResultDto["results"][number] | undefined =>
    result.results.find((r) => r.questionId === questionId) ?? answers.find((a) => a.questionId === questionId)?.check;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow">
        <h2 ref={headingRef} tabIndex={-1} className="text-sm uppercase tracking-wide text-indigo-100 outline-none">
          Resultado
        </h2>
        <p className="mt-1 text-4xl font-bold" data-testid="score">
          {result.correctCount}/{result.totalCount}
        </p>
        <p className="mt-2">{gradeLabel(gradeOf(result))}</p>
        <p className="mt-1 text-sm text-indigo-100">
          {result.counted
            ? `Partida contada! Esta trivia soma ${result.playCount} partida(s) (no máximo uma por pessoa por dia).`
            : `Você já jogou esta trivia hoje: esta partida não conta de novo para o ranking (${result.playCount} no total).`}
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-4 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25"
        >
          Jogar de novo
        </button>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold text-slate-800">Revisão</h3>
        <ol className="space-y-2">
          {trivia.questions.map((question, qi) => {
            const r = resultFor(question.id);
            return (
              <li key={question.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-medium text-slate-800">
                  {qi + 1}. {question.prompt}
                </p>
                {r === undefined ? null : (
                  <p className={r.isCorrect ? "text-emerald-700" : "text-rose-700"}>
                    {r.isCorrect ? "✓ " : "✗ "}
                    Sua resposta: {choiceText(question, r.chosenChoiceId)}
                    {r.isCorrect ? "" : ` · Correta: ${choiceText(question, r.correctChoiceId)}`}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-700">Desafie alguém com esta trivia</h3>
        <ShareBox path={sharePath} />
      </section>
    </div>
  );
}
