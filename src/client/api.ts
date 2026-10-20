import { ResultAsync, errAsync, okAsync } from "neverthrow";
import type { z } from "zod";
import { schema_ErrorDto, type ErrorDto } from "@/contract/dto";

export { HttpMethod, requestJson, clientErrorMessage, describeIssuePath };
export type { ClientError };

type ClientError =
  | { readonly type: "http"; readonly status: number; readonly body: ErrorDto }
  | { readonly type: "network" }
  | { readonly type: "decode" };

const HttpMethod = { Get: "GET", Post: "POST", Put: "PUT" } as const;
type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

function decode<S extends z.ZodType>(schema: S, value: unknown): ResultAsync<z.output<S>, ClientError> {
  const parsed = schema.safeParse(value);
  return parsed.success ? okAsync(parsed.data) : errAsync({ type: "decode" });
}

/** Browser → API call. Responses are decoded with the shared Zod contract; failures are values. */
function requestJson<S extends z.ZodType>(
  method: HttpMethod,
  url: string,
  body: unknown,
  schema: S,
): ResultAsync<z.output<S>, ClientError> {
  const init: RequestInit =
    body === null
      ? { method }
      : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  return ResultAsync.fromPromise(fetch(url, init), (): ClientError => ({ type: "network" })).andThen((response) =>
    ResultAsync.fromPromise(response.json() as Promise<unknown>, (): ClientError => ({ type: "decode" })).andThen(
      (json): ResultAsync<z.output<S>, ClientError> =>
        response.ok
          ? decode(schema, json)
          : decode(schema_ErrorDto, json).andThen((errorBody) =>
              errAsync<z.output<S>, ClientError>({ type: "http", status: response.status, body: errorBody }),
            ),
    ),
  );
}

function clientErrorMessage(error: ClientError): string {
  switch (error.type) {
    case "http":
      return error.body.error.message;
    case "network":
      return "Não foi possível falar com o servidor. Verifique sua conexão.";
    case "decode":
      return "Resposta inesperada do servidor.";
    default: {
      const _exhaustiveCheck: never = error;
      throw new Error(`Unknown client error: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

const FIELD_LABELS: Readonly<Record<string, string>> = {
  title: "Título",
  description: "Descrição",
  authorName: "Seu nome",
  email: "E-mail",
  password: "Senha",
  displayName: "Nome",
  questions: "Perguntas",
};

/** Human label for a structured validation path, e.g. ["questions", 0, "choices", 1] → "Pergunta 1 › Alternativa 2". */
function describeIssuePath(path: ReadonlyArray<string | number>): string {
  const [head, index, field, subIndex] = path;
  if (head === "questions" && typeof index === "number") {
    const question = `Pergunta ${index + 1}`;
    if (field === "choices" && typeof subIndex === "number") return `${question} › Alternativa ${subIndex + 1}`;
    if (field === "choices") return `${question} › Alternativas`;
    if (field === "prompt") return `${question} › Enunciado`;
    if (field === "correctChoiceIndex") return `${question} › Resposta correta`;
    return question;
  }
  return typeof head === "string" ? (FIELD_LABELS[head] ?? head) : "";
}
