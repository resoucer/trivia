import { guardAuthAttempt, signupUseCase } from "@/application/authService";
import { encodeViewer } from "@/contract/dto";
import { AuthAction } from "@/domain/auth/rateLimit";
import { writeSessionToken } from "@/infra/auth/cookies";
import { authClientHash } from "@/server/authClient";
import { requestContext } from "@/server/context";
import { jsonResponse, readJsonBody, respond } from "@/server/http";

export { POST };

/** Rate limited per client IP hash before any password work (see ADR 0018). */
function POST(request: Request): Promise<Response> {
  return respond(
    requestContext().andThen((ctx) =>
      authClientHash(request.headers)
        .asyncAndThen((client) => guardAuthAttempt(ctx.db, AuthAction.Signup, client, ctx.now))
        .andThen(() => readJsonBody(request))
        .andThen((body) => signupUseCase(ctx.db, body, ctx.now))
        .andThen((session) => writeSessionToken(session.token).map(() => session.user)),
    ),
    (user) => jsonResponse(encodeViewer({ type: "user", user }), 201),
  );
}
