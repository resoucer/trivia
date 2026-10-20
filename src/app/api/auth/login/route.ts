import { loginUseCase } from "@/application/authService";
import { encodeViewer } from "@/contract/dto";
import { writeSessionToken } from "@/infra/auth/cookies";
import { requestContext } from "@/server/context";
import { jsonResponse, readJsonBody, respond } from "@/server/http";

export { POST };

function POST(request: Request): Promise<Response> {
  return respond(
    requestContext().andThen((ctx) =>
      readJsonBody(request)
        .andThen((body) => loginUseCase(ctx.db, body, ctx.now))
        .andThen((session) => writeSessionToken(session.token).map(() => session.user)),
    ),
    (user) => jsonResponse(encodeViewer({ type: "user", user })),
  );
}
