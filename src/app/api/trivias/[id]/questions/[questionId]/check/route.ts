import { checkAnswerUseCase } from "@/application/triviaService";
import { encodeAnswerCheck } from "@/contract/dto";
import { requestContext } from "@/server/context";
import { jsonResponse, readJsonBody, respond } from "@/server/http";

export { POST };

type Params = { readonly params: Promise<{ id: string; questionId: string }> };

/**
 * Checks one answer for immediate feedback: `{ choiceId }` → `{ questionId, chosenChoiceId,
 * correctChoiceId, isCorrect }`. Records nothing; the play is counted by `POST /api/trivias/<id>/plays`.
 */
async function POST(request: Request, { params }: Params): Promise<Response> {
  const { id, questionId } = await params;
  return respond(
    requestContext().andThen((ctx) =>
      readJsonBody(request).andThen((body) => checkAnswerUseCase(ctx.db, id, questionId, body, ctx.now)),
    ),
    (check) => jsonResponse(encodeAnswerCheck(check)),
  );
}
