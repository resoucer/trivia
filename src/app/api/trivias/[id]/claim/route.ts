import { okAsync } from "neverthrow";
import { claimTriviaUseCase } from "@/application/triviaService";
import { encodePublicTrivia } from "@/contract/dto";
import { TriviaId } from "@/domain/trivia/ids";
import { toPublicTrivia } from "@/domain/trivia/trivia";
import { clearClaimToken, readClaimToken } from "@/infra/auth/cookies";
import { Nothing } from "@/lib/maybe";
import { parseWith } from "@/lib/validation";
import { requestContext } from "@/server/context";
import { jsonResponse, respond } from "@/server/http";

export { POST };

type Params = { readonly params: Promise<{ id: string }> };

/** Saves an anonymous trivia to the logged-in account, proven by the claim cookie set at creation. */
async function POST(_request: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  const claimToken = parseWith(TriviaId.schema, id).match(
    (triviaId) => readClaimToken(triviaId),
    () => okAsync(Nothing<string>()),
  );
  return respond(
    requestContext().andThen((ctx) =>
      claimToken
        .andThen((token) => claimTriviaUseCase(ctx.db, ctx.viewer, id, token, ctx.now))
        .andThen((trivia) => clearClaimToken(trivia.id).map(() => trivia)),
    ),
    (trivia) => jsonResponse(encodePublicTrivia(toPublicTrivia(trivia))),
  );
}
