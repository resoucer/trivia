"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type ClientError, HttpMethod, requestJson } from "@/client/api";
import { ErrorBox } from "@/components/ErrorBox";
import { type PlayResultDto, type PublicTriviaDto, schema_PlayResultDto } from "@/contract/dto";
import { gradeLabel, gradeOf } from "@/domain/trivia/scoring";

export { Player };

type Answers = Readonly<Record<string, string>>;

type PlayState =
  | { readonly type: "answering"; readonly answers: Answers }
  | { readonly type: "submitting"; readonly answers: Answers }
  | { readonly type: "failed"; readonly answers: Answers; readonly error: ClientError }
  | { readonly type: "done"; readonly answers: Answers; readonly result: PlayResultDto };

function Player({ trivia }: { trivia: PublicTriviaDto }) {
  const router = useRouter();
  const [state, setState] = useState<PlayState>({ type: "answering", answers: {} });
  const answeredCount = Object.keys(state.answers).length;
  const allAnswered = answeredCount === trivia.questions.length;
  const locked = state.type === "submitting" || state.type === "done";

  const choose = (questionId: string, choiceId: string): void =>
    setState((s) =>
      s.type === "done" || s.type === "submitting"
        ? s
        : { type: "answering", answers: { ...s.answers, [questionId]: choiceId } },
    );

  const submit = (): void => {
    const answers = state.answers;
    setState({ type: "submitting", answers });
    void requestJson(
      HttpMethod.Post,
      `/api/trivias/${encodeURIComponent(trivia.id)}/plays`,
      { answers: Object.entries(answers).map(([questionId, choiceId]) => ({ questionId, choiceId })) },
      schema_PlayResultDto,
    ).match(
      (result) => {
        setState({ type: "done", answers, result });
        router.refresh();
      },
      (error) => setState({ type: "failed", answers, error }),
    );
  };

  const resultFor = (questionId: string): PlayResultDto["results"][number] | undefined =>
    state.type === "done" ? state.result.results.find((r) => r.questionId === questionId) : undefined;

  return (
    <div className="space-y-6">
      {state.type === "done" ? (
        <ScoreCard result={state.result} onRetry={() => setState({ type: "answering", answers: {} })} />
      ) : null}

      {trivia.questions.map((question, qi) => {
        const result = resultFor(question.id);
        return (
          <section key={question.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-slate-800">
              {qi + 1}. {question.prompt}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {question.choices.map((choice) => {
                const selected = state.answers[question.id] === choice.id;
                const tone =
                  result === undefined
                    ? selected
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                    : choice.id === result.correctChoiceId
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : selected
                        ? "border-rose-400 bg-rose-50 text-rose-900"
                        : "border-slate-200 opacity-60";
                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={locked}
                    aria-pressed={selected}
                    onClick={() => choose(question.id, choice.id)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${tone}`}
                  >
                    {choice.text}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {state.type !== "done" ? (
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={!allAnswered || state.type === "submitting"}
            onClick={submit}
            className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {state.type === "submitting" ? "Enviando…" : "Ver meu resultado"}
          </button>
          <span className="text-sm text-slate-500">
            {answeredCount} de {trivia.questions.length} respondidas
          </span>
        </div>
      ) : null}
      {state.type === "failed" ? <ErrorBox error={state.error} /> : null}
    </div>
  );
}

function ScoreCard({ result, onRetry }: { result: PlayResultDto; onRetry: () => void }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow">
      <p className="text-sm uppercase tracking-wide text-indigo-100">Sua pontuação</p>
      <p className="mt-1 text-4xl font-bold">
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
        onClick={onRetry}
        className="mt-4 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25"
      >
        Jogar de novo
      </button>
    </div>
  );
}
