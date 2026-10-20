import { myTriviasUseCase } from "@/application/triviaService";
import { encodeSummary } from "@/contract/dto";
import { requestContext } from "@/server/context";
import { jsonResponse, respond } from "@/server/http";

export { GET };

function GET(): Promise<Response> {
  return respond(
    requestContext().andThen((ctx) => myTriviasUseCase(ctx.db, ctx.viewer)),
    (list) => jsonResponse({ items: list.map(encodeSummary) }),
  );
}
