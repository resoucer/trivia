import { playTriviaUseCase } from "@/application/triviaService";
import { encodePlayResult } from "@/contract/dto";
import { requestContext } from "@/server/context";
import { jsonResponse, readJsonBody, respond } from "@/server/http";

export { POST };

type Params = { readonly params: Promise<{ id: string }> };

/** Submits answers: returns the score and counts one play. Body: `{ answers: [{ questionId, choiceId }] }` */
async function POST(request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  return respond(
    requestContext().andThen((ctx) =>
      readJsonBody(request).andThen((body) => playTriviaUseCase(ctx.db, id, body, ctx.now)),
    ),
    (outcome) => jsonResponse(encodePlayResult(outcome.score, outcome.trivia.playCount), 201),
  );
}
