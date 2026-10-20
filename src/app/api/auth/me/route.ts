import { encodeViewer } from "@/contract/dto";
import { requestContext } from "@/server/context";
import { jsonResponse, respond } from "@/server/http";

export { GET };

function GET(): Promise<Response> {
  return respond(requestContext(), (ctx) => jsonResponse(encodeViewer(ctx.viewer)));
}
