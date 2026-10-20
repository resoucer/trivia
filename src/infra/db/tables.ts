import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export { passwordCredentials, plays, sessions, triviaClaims, trivias, users };

const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull(),
});

/** One auth method per table: OAuth would add an `oauth_accounts(provider, provider_account_id, user_id)` table. */
const passwordCredentials = sqliteTable("password_credentials", {
  userId: text("user_id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
});

const sessions = sqliteTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

const trivias = sqliteTable(
  "trivias",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    ownerType: text("owner_type").notNull(),
    ownerUserId: text("owner_user_id"),
    authorName: text("author_name").notNull(),
    questionsJson: text("questions_json").notNull(),
    playCount: integer("play_count").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    lastActivityAt: text("last_activity_at").notNull(),
  },
  (t) => [
    index("trivias_owner_play_idx").on(t.ownerType, t.playCount),
    index("trivias_owner_created_idx").on(t.ownerType, t.createdAt),
    index("trivias_owner_user_idx").on(t.ownerUserId),
    index("trivias_activity_idx").on(t.ownerType, t.lastActivityAt),
  ],
);

/** Proof that whoever holds the token created an anonymous trivia (lets them claim it after logging in). */
const triviaClaims = sqliteTable("trivia_claims", {
  triviaId: text("trivia_id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
});

const plays = sqliteTable(
  "plays",
  {
    id: text("id").primaryKey(),
    triviaId: text("trivia_id").notNull(),
    correctCount: integer("correct_count").notNull(),
    totalCount: integer("total_count").notNull(),
    playedAt: text("played_at").notNull(),
  },
  (t) => [index("plays_trivia_idx").on(t.triviaId)],
);
