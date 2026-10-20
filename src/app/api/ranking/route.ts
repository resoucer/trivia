import { rankingUseCase } from "@/application/triviaService";
import { encodeRanked } from "@/contract/dto";
import { requestContext } from "@/server/context";
import { jsonResponse, respond } from "@/server/http";

export { GET };

/** Most played trivias owned by accounts. Anonymous trivias never rank. */
function GET(): Promise<Response> {
  return respond(
    requestContext().andThen((ctx) => rankingUseCase(ctx.db, 50)),
    (ranking) => jsonResponse({ items: ranking.map(encodeRanked) }),
  );
}
