import { playTriviaUseCase } from "@/application/triviaService";
import { encodePlayResult } from "@/contract/dto";
import { requestContext } from "@/server/context";
import { jsonResponse, readJsonBody, respond } from "@/server/http";
import { ensureVisitorCookie, identifyVisitor } from "@/server/visitor";

export { POST };

type Params = { readonly params: Promise<{ id: string }> };

/**
 * Submits answers: always returns the score; counts the play at most once per visitor per day
 * (`counted` in the response). Body: `{ answers: [{ questionId, choiceId }] }`
 */
async function POST(request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  return respond(
    requestContext().andThen((ctx) =>
      identifyVisitor(ctx.viewer, request.headers, ctx.now).andThen((visitor) =>
        readJsonBody(request)
          .andThen((body) => playTriviaUseCase(ctx.db, visitor, id, body, ctx.now))
          .andThen((outcome) => ensureVisitorCookie().map(() => outcome)),
      ),
    ),
    (outcome) => jsonResponse(encodePlayResult(outcome.score, outcome.trivia.playCount, outcome.counting), 201),
  );
}
