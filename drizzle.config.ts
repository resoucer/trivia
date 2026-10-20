import { defineConfig } from "drizzle-kit";

export { config as default };

/** drizzle-kit: `npx drizzle-kit generate` writes versioned SQL migrations from `src/infra/db/tables.ts` into `drizzle/`. */
const config = defineConfig({
  dialect: "sqlite",
  schema: "./src/infra/db/tables.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "file:data/trivia.db" },
});
