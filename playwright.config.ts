import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

export { config as default };

const PORT: number = Number(process.env.PORT ?? 3000);

const config: ReturnType<typeof defineConfig> = defineConfig({
  testDir: "./e2e",
  // Outside the project: files written under it make the dev server recompile and reload the page.
  outputDir: join(tmpdir(), "trivia-playwright"),
  fullyParallel: false,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, locale: "pt-BR", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run db:seed && npm run dev",
    url: `http://localhost:${PORT}/api/ranking`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
