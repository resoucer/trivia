import { ResultAsync } from "neverthrow";
import { NextResponse } from "next/server";
import type { AppError } from "@/application/appError";
import type { ErrorDto } from "@/contract/dto";
import type { ScoringError } from "@/domain/trivia/scoring";

export { errorMessage, errorResponse, errorStatus, jsonResponse, readJsonBody, respond };

function scoringMessage(error: ScoringError): string {
  switch (error.type) {
    case "unknown-question":
      return "Resposta para uma pergunta que não existe nesta trivia.";
    case "duplicate-answer":
      return "Cada pergunta só pode ser respondida uma vez.";
    case "missing-answer":
      return "Responda todas as perguntas antes de enviar.";
    case "invalid-choice":
      return "Alternativa inválida para esta pergunta.";
    default: {
      const _exhaustiveCheck: never = error;
      throw new Error(`Unknown scoring error: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function errorStatus(error: AppError): number {
  switch (error.type) {
    case "validation":
    case "scoring":
      return 400;
    case "unauthenticated":
    case "invalid-credentials":
      return 401;
    case "forbidden":
      return 403;
    case "not-found":
      return 404;
    case "email-taken":
    case "already-owned":
      return 409;
    case "db-failure":
    case "corrupt-data":
    case "crypto-failure":
    case "corrupt-hash":
    case "config":
      return 500;
    default: {
      const _exhaustiveCheck: never = error;
      throw new Error(`Unknown app error: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function errorMessage(error: AppError): string {
  switch (error.type) {
    case "validation":
      return "Confira os campos destacados.";
    case "scoring":
      return scoringMessage(error.error);
    case "unauthenticated":
      return "Entre na sua conta para continuar.";
    case "invalid-credentials":
      return "E-mail ou senha incorretos.";
    case "forbidden":
      return "Você não tem permissão para fazer isso.";
    case "not-found":
      return "Trivia não encontrada (o link pode ter expirado).";
    case "email-taken":
      return "Já existe uma conta com este e-mail.";
    case "already-owned":
      return "Esta trivia já pertence a uma conta.";
    case "db-failure":
    case "corrupt-data":
    case "crypto-failure":
    case "corrupt-hash":
    case "config":
      return "Algo deu errado do nosso lado. Tente novamente.";
    default: {
      const _exhaustiveCheck: never = error;
      throw new Error(`Unknown app error: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function errorResponse(error: AppError): NextResponse<ErrorDto> {
  const status = errorStatus(error);
  if (status >= 500) console.error("[trivia] internal error", error);
  const body: ErrorDto = {
    error: {
      type: error.type,
      message: errorMessage(error),
      issues: error.type === "validation" ? error.issues.map((i) => ({ path: [...i.path], message: i.message })) : [],
    },
  };
  return NextResponse.json(body, { status });
}

function jsonResponse<T>(body: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(body, { status });
}

function respond<T>(result: ResultAsync<T, AppError>, onOk: (value: T) => Response): Promise<Response> {
  return result.match(onOk, errorResponse);
}

function readJsonBody(request: Request): ResultAsync<unknown, AppError> {
  return ResultAsync.fromPromise(
    request.json(),
    (): AppError => ({ type: "validation", issues: [{ path: [], message: "Corpo da requisição não é JSON válido" }] }),
  );
}
