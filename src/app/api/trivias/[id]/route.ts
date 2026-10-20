import { editTriviaUseCase, loadTrivia } from "@/application/triviaService";
import { encodePublicTrivia } from "@/contract/dto";
import { toPublicTrivia } from "@/domain/trivia/trivia";
import { requestContext } from "@/server/context";
import { jsonResponse, readJsonBody, respond } from "@/server/http";

export { GET, PUT };

type Params = { readonly params: Promise<{ id: string }> };

/** Playable view of a trivia (no answer key). Works for anonymous trivias via their share link. */
async function GET(_request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  return respond(
    requestContext().andThen((ctx) => loadTrivia(ctx.db, id, ctx.now)),
    (trivia) => jsonResponse(encodePublicTrivia(toPublicTrivia(trivia))),
  );
}

/** Replaces the content of a trivia. Only its owner (logged in) can edit. */
async function PUT(request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  return respond(
    requestContext().andThen((ctx) =>
      readJsonBody(request).andThen((body) => editTriviaUseCase(ctx.db, ctx.viewer, id, body, ctx.now)),
    ),
    (trivia) => jsonResponse(encodePublicTrivia(toPublicTrivia(trivia))),
  );
}
