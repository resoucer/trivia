import { sql } from "drizzle-orm";
import { okAsync, ResultAsync } from "neverthrow";
import { TriviaId, UserId } from "@/domain/trivia/ids";
import { anonymousOwner, userOwner } from "@/domain/trivia/owner";
import { type Creator, createTrivia, type Trivia, type TriviaDraft } from "@/domain/trivia/trivia";
import { DisplayName } from "@/domain/user/displayName";
import { Email, type User } from "@/domain/user/user";
import { hashPassword } from "@/infra/auth/password";
import type { Db } from "@/infra/db/db";
import { type DbError, dbFailure } from "@/infra/db/dbError";
import { users } from "@/infra/db/tables";
import { insertTrivia } from "@/infra/repositories/triviaRepository";
import { insertUserWithPassword } from "@/infra/repositories/userRepository";
import { Just, Nothing } from "@/lib/maybe";

export { SEED_DEMO_USER, seedIfEmpty };

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

function seedData(db: Db, now: Date): ResultAsync<null, DbError> {
  const demo: User = {
    id: new UserId("seed-demo-user"),
    email: new Email(SEED_DEMO_USER.email),
    displayName: new DisplayName(SEED_DEMO_USER.displayName),
  };
  const owner: Creator = { owner: userOwner(demo.id), displayName: demo.displayName };
  const anonymous: Creator = { owner: anonymousOwner(), displayName: new DisplayName("Visitante") };
  return hashPassword(SEED_DEMO_USER.password)
    .mapErr((e): DbError => ({ type: "db-failure", message: `seed hash: ${e.type}` }))
    .andThen((hash) =>
      insertUserWithPassword(db, demo, hash, now).mapErr(
        (e): DbError => (e.type === "email-taken" ? { type: "db-failure", message: "seed user exists" } : e),
      ),
    )
    .andThen(() =>
      ResultAsync.combine([
        ...ownedSeeds.map((seed, i) =>
          insertTrivia(db, seedTrivia(seed, owner, new Date(now.getTime() - i * 60_000)), Nothing()),
        ),
        insertTrivia(db, seedTrivia(anonymousSeed, anonymous, now), Nothing()),
      ]),
    )
    .map((): null => null);
}

/** Seeds a demo user and example trivias when the database has no users yet. */
function seedIfEmpty(db: Db, now: Date): ResultAsync<null, DbError> {
  return ResultAsync.fromPromise(db.select({ n: sql<number>`count(*)` }).from(users), dbFailure).andThen((rows) =>
    (rows[0]?.n ?? 0) > 0 ? okAsync(null) : seedData(db, now),
  );
}
