import { z } from "zod";
import { createTriviaUseCase, rankingUseCase, recentUseCase } from "@/application/triviaService";
import { encodeRanked, encodeSummary, sharePath, type CreatedTriviaDto } from "@/contract/dto";
import { writeClaimToken } from "@/infra/auth/cookies";
import { PublicListOrder } from "@/infra/repositories/triviaRepository";
import { okAsync } from "neverthrow";
import { requestContext } from "@/server/context";
import { jsonResponse, readJsonBody, respond } from "@/server/http";
import { parseWith } from "@/lib/validation";

export { GET, POST };

const schema_ListQuery = z.object({
  order: z.enum([PublicListOrder.Recent, PublicListOrder.Popular]).default(PublicListOrder.Recent),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Public list (only trivias owned by an account). `?order=recent|popular&limit=20` */
function GET(request: Request): Promise<Response> {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  return respond(
    parseWith(schema_ListQuery, query)
      .asyncAndThen((q) =>
        requestContext().map((ctx) => ({ ctx, q })),
      )
      .andThen(({ ctx, q }) => {
        switch (q.order) {
          case PublicListOrder.Recent:
            return recentUseCase(ctx.db, q.limit).map((list) => ({ items: list.map(encodeSummary) }));
          case PublicListOrder.Popular:
            return rankingUseCase(ctx.db, q.limit).map((list) => ({ items: list.map(encodeRanked) }));
          default: {
            const _exhaustiveCheck: never = q.order;
            throw new Error(`Unknown order: ${JSON.stringify(_exhaustiveCheck)}`);
          }
        }
      }),
    (body) => jsonResponse(body),
  );
}

/** Creates a trivia. Anonymous creators also get a claim cookie to save it to an account later. */
function POST(request: Request): Promise<Response> {
  return respond(
    requestContext().andThen((ctx) =>
      readJsonBody(request)
        .andThen((body) => createTriviaUseCase(ctx.db, ctx.viewer, body, ctx.now))
        .andThen((created) =>
          (created.claimToken.type === "just"
            ? writeClaimToken(created.trivia.id, created.claimToken.value)
            : okAsync(null)
          ).map((): CreatedTriviaDto => ({
            id: created.trivia.id.value,
            sharePath: sharePath(created.trivia.id),
            ownerType: created.trivia.owner.type,
          })),
        ),
    ),
    (body) => jsonResponse(body, 201),
  );
}
