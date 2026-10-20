import { okAsync, Result, ResultAsync } from "neverthrow";
import { TriviaId, UserId } from "@/domain/trivia/ids";
import { anonymousOwner, userOwner } from "@/domain/trivia/owner";
import { type Creator, createTrivia, schema_TriviaDraft, type Trivia, type TriviaDraft } from "@/domain/trivia/trivia";
import { DisplayName } from "@/domain/user/displayName";
import { Email, type User } from "@/domain/user/user";
import { hashPassword } from "@/infra/auth/password";
import type { Db } from "@/infra/db/db";
import type { DbError } from "@/infra/db/dbError";
import { DEFAULT_TRIVIAS, defaultTriviaDraftInput } from "@/infra/db/defaultTrivias";
import { findTrivia, insertTrivia } from "@/infra/repositories/triviaRepository";
import { findUserWithPasswordByEmail, insertUserWithPassword } from "@/infra/repositories/userRepository";
import { Just, Nothing } from "@/lib/maybe";
import { parseWith } from "@/lib/validation";

export { SEED_DEMO_USER, seedDefaults };

const SEED_DEMO_USER = { email: "demo@trivia.local", password: "trivia1234", displayName: "Equipe Trivia" } as const;

type SeedTrivia = { readonly id: string; readonly playCount: number; readonly draft: TriviaDraft };

const ownedSeeds: ReadonlyArray<SeedTrivia> = [
  {
    id: "seed-brasil",
    playCount: 42,
    draft: {
      title: "Conhecimentos gerais sobre o Brasil",
      description: Just("Capitais, história e curiosidades do nosso país."),
      questions: [
        {
          prompt: "Qual é a capital do Brasil?",
          choices: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"],
          correctChoiceIndex: 2,
        },
        {
          prompt: "Em que ano o Brasil declarou independência?",
          choices: ["1500", "1822", "1889", "1922"],
          correctChoiceIndex: 1,
        },
        {
          prompt: "Qual é o maior bioma brasileiro?",
          choices: ["Cerrado", "Caatinga", "Pampa", "Amazônia"],
          correctChoiceIndex: 3,
        },
      ],
    },
  },
  {
    id: "seed-fp",
    playCount: 17,
    draft: {
      title: "Programação funcional",
      description: Just("Mônadas, imutabilidade e outras delícias."),
      questions: [
        {
          prompt: "Qual destas linguagens é puramente funcional?",
          choices: ["Haskell", "Java", "C", "Go"],
          correctChoiceIndex: 0,
        },
        {
          prompt: "O que `map` faz em uma lista?",
          choices: ["Ordena", "Aplica uma função a cada elemento", "Remove duplicados"],
          correctChoiceIndex: 1,
        },
        {
          prompt: "Em neverthrow, qual tipo representa uma falha?",
          choices: ["Ok", "Err", "Some"],
          correctChoiceIndex: 1,
        },
      ],
    },
  },
  {
    id: "seed-ciencia",
    playCount: 8,
    draft: {
      title: "Ciência para curiosos",
      description: Nothing(),
      questions: [
        {
          prompt: "Qual é o planeta mais próximo do Sol?",
          choices: ["Vênus", "Mercúrio", "Marte"],
          correctChoiceIndex: 1,
        },
        { prompt: "Qual é a fórmula química da água?", choices: ["H2O", "CO2", "O2", "NaCl"], correctChoiceIndex: 0 },
      ],
    },
  },
];

const anonymousSeed: SeedTrivia = {
  id: "seed-anonima",
  playCount: 3,
  draft: {
    title: "Trivia anônima de exemplo",
    description: Just("Criada sem login: só abre pelo link e expira após 30 dias sem atividade."),
    questions: [{ prompt: "Quantos dias tem uma semana?", choices: ["5", "7", "10"], correctChoiceIndex: 1 }],
  },
};

function seedTrivia(seed: SeedTrivia, creator: Creator, now: Date): Trivia {
  return { ...createTrivia(seed.draft, creator, new TriviaId(seed.id), now), playCount: seed.playCount };
}

/** Default questionnaires, validated by the same schema as user-created trivias. */
function defaultTrivias(owner: Creator, now: Date): Result<ReadonlyArray<Trivia>, DbError> {
  return Result.combine(
    DEFAULT_TRIVIAS.map((seed, i) =>
      parseWith(schema_TriviaDraft, defaultTriviaDraftInput(seed))
        .mapErr(
          (e): DbError => ({ type: "db-failure", message: `invalid seed ${seed.id}: ${e.issues[0]?.message ?? ""}` }),
        )
        .map(
          (draft): Trivia => ({
            ...createTrivia(draft, owner, new TriviaId(seed.id), new Date(now.getTime() - (i + 10) * 60_000)),
            playCount: seed.playCount,
          }),
        ),
    ),
  );
}

/** Returns the demo user, creating it (with its password) only when its e-mail is not registered yet. */
function ensureDemoUser(db: Db, now: Date): ResultAsync<User, DbError> {
  return findUserWithPasswordByEmail(db, new Email(SEED_DEMO_USER.email)).andThen(
    (found): ResultAsync<User, DbError> => {
      if (found.type === "just") return okAsync(found.value.user);
      const demo: User = {
        id: new UserId("seed-demo-user"),
        email: new Email(SEED_DEMO_USER.email),
        displayName: new DisplayName(SEED_DEMO_USER.displayName),
      };
      return hashPassword(SEED_DEMO_USER.password)
        .mapErr((e): DbError => ({ type: "db-failure", message: `seed hash: ${e.type}` }))
        .andThen((hash) =>
          insertUserWithPassword(db, demo, hash, now).mapErr(
            (e): DbError => (e.type === "email-taken" ? { type: "db-failure", message: "seed user exists" } : e),
          ),
        );
    },
  );
}

/** Inserts the trivia unless one with the same id exists. Resolves to whether it was inserted. */
function insertIfMissing(db: Db, trivia: Trivia): ResultAsync<boolean, DbError> {
  return findTrivia(db, trivia.id).andThen(
    (found): ResultAsync<boolean, DbError> =>
      found.type === "just" ? okAsync(false) : insertTrivia(db, trivia, Nothing()).map((): boolean => true),
  );
}

/**
 * Idempotent: creates the demo user and each seed trivia only if missing, so it can run on every
 * startup and on databases seeded by older versions. Resolves to how many trivias were inserted.
 */
function seedDefaults(db: Db, now: Date): ResultAsync<number, DbError> {
  return ensureDemoUser(db, now).andThen((demo) => {
    const owner: Creator = { owner: userOwner(demo.id), displayName: demo.displayName };
    const anonymous: Creator = { owner: anonymousOwner(), displayName: new DisplayName("Visitante") };
    return defaultTrivias(owner, now).asyncAndThen((defaults) => {
      const trivias: ReadonlyArray<Trivia> = [
        ...ownedSeeds.map((seed, i) => seedTrivia(seed, owner, new Date(now.getTime() - i * 60_000))),
        seedTrivia(anonymousSeed, anonymous, now),
        ...defaults,
      ];
      return ResultAsync.combine(trivias.map((t) => insertIfMissing(db, t))).map(
        (inserted): number => inserted.filter((wasInserted) => wasInserted).length,
      );
    });
  });
}
