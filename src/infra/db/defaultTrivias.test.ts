import { describe, expect, it } from "vitest";
import { schema_TriviaDraft } from "@/domain/trivia/trivia";
import { DEFAULT_TRIVIAS, defaultTriviaDraftInput, schema_DefaultTrivia } from "@/infra/db/defaultTrivias";

describe("questionários padrão do seed", () => {
  it("são 10, com as quantidades sorteadas de perguntas, e ids únicos", () => {
    expect(DEFAULT_TRIVIAS.map((t) => t.questions.length)).toEqual([22, 8, 17, 14, 17, 23, 23, 20, 18, 11]);
    expect(new Set(DEFAULT_TRIVIAS.map((t) => t.id)).size).toBe(DEFAULT_TRIVIAS.length);
  });

  it.each(DEFAULT_TRIVIAS.map((t) => [t.id, t] as const))("%s é válida", (_id, trivia) => {
    expect(schema_DefaultTrivia.safeParse(trivia).success).toBe(true);
    const parsed = schema_TriviaDraft.safeParse(defaultTriviaDraftInput(trivia));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const draft = parsed.data;
    expect(draft.questions.length).toBeGreaterThanOrEqual(7);
    expect(draft.questions.length).toBeLessThanOrEqual(25);
    draft.questions.forEach((question, qi) => {
      const source = trivia.questions[qi];
      expect(question.choices).toHaveLength(4);
      // Exactly one correct option, and it is the one declared as correct.
      expect(question.choices.filter((c) => c === source?.correct)).toHaveLength(1);
      expect(question.choices[question.correctChoiceIndex]).toBe(source?.correct);
      expect(new Set(question.choices.map((c) => c.toLocaleLowerCase("pt-BR"))).size).toBe(4);
    });
  });

  it("espalha a alternativa correta por posições diferentes", () => {
    const positions = DEFAULT_TRIVIAS.flatMap((t) =>
      defaultTriviaDraftInput(t).questions.map((q) => q.correctChoiceIndex),
    );
    expect(new Set(positions)).toEqual(new Set([0, 1, 2, 3]));
  });
});
