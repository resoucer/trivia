import { logoutUseCase } from "@/application/authService";
import { clearSessionToken, readSessionToken } from "@/infra/auth/cookies";
import { requestContext } from "@/server/context";
import { jsonResponse, respond } from "@/server/http";

export { POST };

function POST(): Promise<Response> {
  return respond(
    requestContext().andThen((ctx) =>
      readSessionToken()
        .andThen((token) => logoutUseCase(ctx.db, token))
        .andThen(() => clearSessionToken()),
    ),
    () => jsonResponse({ type: "anonymous" }),
  );
}
