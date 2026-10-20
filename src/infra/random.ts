import { createHash, randomBytes } from "node:crypto";
import { PlayId, TriviaId, UserId } from "@/domain/trivia/ids";

export { newPlayId, newSecretToken, newTriviaId, newUserId, sha256 };

function randomSlug(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

function newTriviaId(): TriviaId {
  return new TriviaId(randomSlug(9));
}

function newPlayId(): PlayId {
  return new PlayId(randomSlug(12));
}

function newUserId(): UserId {
  return new UserId(randomSlug(12));
}

/** High-entropy secret for session and claim cookies. Only its hash is stored. */
function newSecretToken(): string {
  return randomSlug(32);
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
