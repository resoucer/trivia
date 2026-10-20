"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type ClientError, HttpMethod, requestJson } from "@/client/api";
import { ErrorBox } from "@/components/ErrorBox";
import { emptyQuestionForm, schema_CreatedTriviaDto, schema_PublicTriviaDto, type TriviaFormDto } from "@/contract/dto";
import { TRIVIA_LIMITS } from "@/domain/trivia/trivia";

export type { EditorMode };
export { TriviaEditor };

type EditorMode =
  | { readonly type: "create"; readonly askAuthorName: boolean }
  | { readonly type: "edit"; readonly triviaId: string };

type Status =
  | { readonly type: "editing" }
  | { readonly type: "saving" }
  | { readonly type: "failed"; readonly error: ClientError };

type QuestionForm = TriviaFormDto["questions"][number];

const replaceAt = <T,>(items: ReadonlyArray<T>, index: number, value: T): ReadonlyArray<T> =>
  items.map((item, i) => (i === index ? value : item));

const removeAt = <T,>(items: ReadonlyArray<T>, index: number): ReadonlyArray<T> => items.filter((_, i) => i !== index);

function removeChoice(question: QuestionForm, index: number): QuestionForm {
  const correct = question.correctChoiceIndex;
  return {
    ...question,
    choices: [...removeAt(question.choices, index)],
    correctChoiceIndex: correct === index ? 0 : correct > index ? correct - 1 : correct,
  };
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

function TriviaEditor({ mode, initial }: { mode: EditorMode; initial: TriviaFormDto }) {
  const router = useRouter();
  const [form, setForm] = useState<TriviaFormDto>(initial);
  const [authorName, setAuthorName] = useState("");
  const [status, setStatus] = useState<Status>({ type: "editing" });

  const updateQuestion = (index: number, question: QuestionForm): void =>
    setForm((f) => ({ ...f, questions: [...replaceAt(f.questions, index, question)] }));

  const submit = (): void => {
    setStatus({ type: "saving" });
    switch (mode.type) {
      case "create":
        void requestJson(
          HttpMethod.Post,
          "/api/trivias",
          mode.askAuthorName ? { ...form, authorName } : form,
          schema_CreatedTriviaDto,
        ).match(
          (created) => router.push(`${created.sharePath}?criada=1`),
          (error) => setStatus({ type: "failed", error }),
        );
        return;
      case "edit":
        void requestJson(
          HttpMethod.Put,
          `/api/trivias/${encodeURIComponent(mode.triviaId)}`,
          form,
          schema_PublicTriviaDto,
        ).match(
          (saved) => {
            router.push(`/t/${encodeURIComponent(saved.id)}`);
            router.refresh();
          },
          (error) => setStatus({ type: "failed", error }),
        );
        return;
      default: {
        const _exhaustiveCheck: never = mode;
        throw new Error(`Unknown mode: ${JSON.stringify(_exhaustiveCheck)}`);
      }
    }
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Título</span>
          <input
            className={inputClass}
            value={form.title}
            maxLength={TRIVIA_LIMITS.titleMax}
            placeholder="Ex.: Capitais do mundo"
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Descrição (opcional)</span>
          <textarea
            className={inputClass}
            rows={2}
            value={form.description}
            maxLength={TRIVIA_LIMITS.descriptionMax}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>
        {mode.type === "create" && mode.askAuthorName ? (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Seu nome (aparece como autor)</span>
            <input
              className={inputClass}
              value={authorName}
              maxLength={40}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </label>
        ) : null}
      </section>

      {form.questions.map((question, qi) => (
        <section key={qi} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Pergunta {qi + 1}</h2>
            {form.questions.length > TRIVIA_LIMITS.questionsMin ? (
              <button
                type="button"
                className="text-sm text-rose-600 hover:underline"
                onClick={() => setForm((f) => ({ ...f, questions: [...removeAt(f.questions, qi)] }))}
              >
                Remover pergunta
              </button>
            ) : null}
          </div>
          <input
            className={inputClass}
            value={question.prompt}
            maxLength={TRIVIA_LIMITS.promptMax}
            placeholder="Enunciado da pergunta"
            onChange={(e) => updateQuestion(qi, { ...question, prompt: e.target.value })}
          />
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm text-slate-600">Alternativas: marque a correta</legend>
            {question.choices.map((choice, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  aria-label={`Alternativa ${ci + 1} é a correta`}
                  checked={question.correctChoiceIndex === ci}
                  onChange={() => updateQuestion(qi, { ...question, correctChoiceIndex: ci })}
                  className="h-4 w-4 accent-emerald-600"
                />
                <input
                  className={inputClass}
                  value={choice}
                  maxLength={TRIVIA_LIMITS.choiceMax}
                  placeholder={`Alternativa ${ci + 1}`}
                  onChange={(e) =>
                    updateQuestion(qi, { ...question, choices: [...replaceAt(question.choices, ci, e.target.value)] })
                  }
                />
                {question.choices.length > TRIVIA_LIMITS.choicesMin ? (
                  <button
                    type="button"
                    aria-label={`Remover alternativa ${ci + 1}`}
                    className="px-2 text-slate-400 hover:text-rose-600"
                    onClick={() => updateQuestion(qi, removeChoice(question, ci))}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            ))}
          </fieldset>
          {question.choices.length < TRIVIA_LIMITS.choicesMax ? (
            <button
              type="button"
              className="text-sm text-indigo-600 hover:underline"
              onClick={() => updateQuestion(qi, { ...question, choices: [...question.choices, ""] })}
            >
              + Adicionar alternativa
            </button>
          ) : null}
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        {form.questions.length < TRIVIA_LIMITS.questionsMax ? (
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestionForm()] }))}
          >
            + Adicionar pergunta
          </button>
        ) : null}
        <button
          type="submit"
          disabled={status.type === "saving"}
          className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {status.type === "saving"
            ? "Salvando…"
            : mode.type === "create"
              ? "Salvar e gerar link"
              : "Salvar alterações"}
        </button>
      </div>

      {status.type === "failed" ? <ErrorBox error={status.error} /> : null}
    </form>
  );
}
