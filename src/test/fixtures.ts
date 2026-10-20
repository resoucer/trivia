import { TriviaId, UserId } from "@/domain/trivia/ids";
import { anonymousOwner, userOwner } from "@/domain/trivia/owner";
import { createTrivia, schema_TriviaDraft, type Trivia, type TriviaDraft } from "@/domain/trivia/trivia";
import { DisplayName } from "@/domain/user/displayName";
import { Email, type User } from "@/domain/user/user";

export { alice, anonymousTrivia, bob, draftInput, NOW, ownedTrivia, validDraft };

const NOW = new Date("2026-10-19T12:00:00.000Z");

const draftInput = {
  title: "Capitais",
  description: "",
  questions: [
    { prompt: "Capital do Brasil?", choices: ["Rio", "Brasília", "Salvador"], correctChoiceIndex: 1 },
    { prompt: "Capital da França?", choices: ["Paris", "Lyon"], correctChoiceIndex: 0 },
  ],
};

function validDraft(): TriviaDraft {
  const parsed = schema_TriviaDraft.safeParse(draftInput);
  if (!parsed.success) throw new Error("fixture draft must be valid");
  return parsed.data;
}

const alice: User = {
  id: new UserId("user-alice"),
  email: new Email("alice@x.com"),
  displayName: new DisplayName("Alice"),
};
const bob: User = { id: new UserId("user-bob00"), email: new Email("bob@x.com"), displayName: new DisplayName("Bob") };

function anonymousTrivia(lastActivityAt: Date, id: string = "anon-trivia"): Trivia {
  const t = createTrivia(
    validDraft(),
    { owner: anonymousOwner(), displayName: new DisplayName("Visitante") },
    new TriviaId(id),
    lastActivityAt,
  );
  return t;
}

function ownedTrivia(
  owner: User,
  overrides: Partial<Pick<Trivia, "playCount" | "createdAt" | "lastActivityAt">>,
  id: string,
): Trivia {
  const base = createTrivia(
    validDraft(),
    { owner: userOwner(owner.id), displayName: owner.displayName },
    new TriviaId(id),
    NOW,
  );
  return { ...base, ...overrides };
}
