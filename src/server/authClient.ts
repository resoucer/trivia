import type { Result } from "neverthrow";
import type { AppError } from "@/application/appError";
import type { NetworkHash } from "@/domain/visitor/visitor";
import { visitorSecret } from "@/infra/config";
import { clientIpHash } from "@/infra/visitor/networkHash";
import { networkInfoFrom } from "@/server/clientNetwork";

export { authClientHash };

/** Rate-limit identity for login/sign-up: HMAC of the client IP (see `networkInfoFrom`). */
function authClientHash(headers: Headers): Result<NetworkHash, AppError> {
  return visitorSecret()
    .mapErr((error): AppError => error)
    .map((secret): NetworkHash => clientIpHash(secret, networkInfoFrom(headers).ip));
}
