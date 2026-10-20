import { z } from "zod";
import { UserId } from "@/domain/trivia/ids";
import type { Viewer } from "@/domain/user/user";

export { schema_Owner, anonymousOwner, userOwner, encodeOwner, ownerFromViewer, isOwnedBy };
export type { Owner, OwnerEncoded };

/**
 * Who owns a trivia.
 * - anonymous: created without login; reachable only by its share link and expires after inactivity.
 * - user: saved to an account; listed publicly, ranked, editable by its owner, never expires.
 */
const schema_Owner = z.discriminatedUnion("type", [
  z.object({ type: z.literal("anonymous") }),
  z.object({ type: z.literal("user"), userId: UserId.schema }),
]);

type Owner = z.infer<typeof schema_Owner>;
type OwnerEncoded = z.input<typeof schema_Owner>;

function anonymousOwner(): Owner {
  return { type: "anonymous" };
}

function userOwner(userId: UserId): Owner {
  return { type: "user", userId };
}

function ownerFromViewer(viewer: Viewer): Owner {
  switch (viewer.type) {
    case "anonymous":
      return anonymousOwner();
    case "user":
      return userOwner(viewer.user.id);
    default: {
      const _exhaustiveCheck: never = viewer;
      throw new Error(`Unknown viewer: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function isOwnedBy(owner: Owner, viewer: Viewer): boolean {
  switch (owner.type) {
    case "anonymous":
      return false;
    case "user":
      switch (viewer.type) {
        case "anonymous":
          return false;
        case "user":
          return owner.userId.equals(viewer.user.id);
        default: {
          const _exhaustiveCheck: never = viewer;
          throw new Error(`Unknown viewer: ${JSON.stringify(_exhaustiveCheck)}`);
        }
      }
    default: {
      const _exhaustiveCheck: never = owner;
      throw new Error(`Unknown owner: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}

function encodeOwner(owner: Owner): OwnerEncoded {
  switch (owner.type) {
    case "anonymous":
      return { type: "anonymous" };
    case "user":
      return { type: "user", userId: owner.userId.value };
    default: {
      const _exhaustiveCheck: never = owner;
      throw new Error(`Unknown owner: ${JSON.stringify(_exhaustiveCheck)}`);
    }
  }
}
