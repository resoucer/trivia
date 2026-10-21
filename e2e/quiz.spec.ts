import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";

/** Where the quiz and result screenshots are saved (E2E_SCREENSHOT_DIR overrides it). */
const SCREENSHOT_DIR: string = process.env.E2E_SCREENSHOT_DIR ?? join(tmpdir(), "trivia-playwright");

const TRIVIA_ID: string = "seed-historia-brasil";
const TOTAL: number = 8;

async function answerCurrent(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
  await expect(page.getByText(/^(Correto!|Incorreto\. A resposta certa é: .+)$/)).toBeVisible();
}

test("joga uma trivia do seed pergunta por pergunta até o resultado", async ({ page }) => {
  await page.goto(`/t/${TRIVIA_ID}`);
  await expect(page.getByText(`Pergunta 1 de ${TOTAL}`)).toBeVisible();
  await expect(page.getByRole("radiogroup")).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(4);

  // Mouse on the first question; the correct option is highlighted after the check.
  await page.getByRole("radio").first().click();
  await expect(page.locator('[data-correct="true"]')).toHaveCount(1);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/trivia-quiz.png`, fullPage: true });
  await page.getByRole("button", { name: "Próxima" }).click();

  // Keyboard on the rest: number keys choose, Enter advances.
  for (let n = 2; n <= TOTAL; n++) {
    await expect(page.getByText(`Pergunta ${n} de ${TOTAL}`)).toBeVisible();
    await answerCurrent(page, String(((n - 1) % 4) + 1));
    if (n === TOTAL) await expect(page.getByRole("button", { name: "Ver resultado" })).toBeFocused();
    await page.keyboard.press("Enter");
  }

  await expect(page.getByTestId("score")).toHaveText(new RegExp(`^\\d+/${TOTAL}$`));
  await expect(page.getByRole("heading", { name: "Revisão" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Jogar de novo" })).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/trivia-result.png`, fullPage: true });

  await page.getByRole("button", { name: "Jogar de novo" }).click();
  await expect(page.getByText(`Pergunta 1 de ${TOTAL}`)).toBeVisible();
});
