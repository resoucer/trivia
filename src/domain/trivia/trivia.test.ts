import { describe, expect, it } from "vitest";
import { ChoiceId, QuestionId } from "@/domain/trivia/ids";
import { editTrivia, encodeTrivia, schema_Trivia, schema_TriviaDraft, touchTrivia } from "@/domain/trivia/trivia";
import { alice, draftInput, NOW, ownedTrivia, validDraft } from "@/test/fixtures";

describe("schema_TriviaDraft", () => {
  it("aceita um rascunho válido e normaliza descrição vazia para Nothing", () => {
    const draft = validDraft();
    expect(draft.description).toEqual({ type: "nothing" });
    expect(draft.questions).toHaveLength(2);
  });

  it("rejeita resposta correta fora das alternativas", () => {
    const result = schema_TriviaDraft.safeParse({
      ...draftInput,
      questions: [{ prompt: "?", choices: ["a", "b"], correctChoiceIndex: 2 }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["questions", 0, "correctChoiceIndex"]);
  });

  it("rejeita alternativas repetidas e trivia sem perguntas", () => {
    expect(
      schema_TriviaDraft.safeParse({
        ...draftInput,
        questions: [{ prompt: "?", choices: ["a", "A"], correctChoiceIndex: 0 }],
      }).success,
    ).toBe(false);
    expect(schema_TriviaDraft.safeParse({ ...draftInput, questions: [] }).success).toBe(false);
  });
});

describe("createTrivia / encodeTrivia", () => {
  it("gera ids de pergunta e alternativa por posição", () => {
    const trivia = ownedTrivia(alice, {}, "trivia-1");
    expect(trivia.questions[0]?.id).toEqual(new QuestionId("q1"));
    expect(trivia.questions[0]?.correctChoiceId).toEqual(new ChoiceId("c2"));
    expect(trivia.playCount).toBe(0);
  });

  it("faz ida e volta pelo schema sem perder informação", () => {
    const trivia = ownedTrivia(alice, {}, "trivia-1");
    const decoded = schema_Trivia.safeParse(encodeTrivia(trivia));
    expect(decoded.success).toBe(true);
    expect(decoded.data).toEqual(trivia);
  });
});

describe("editTrivia / touchTrivia", () => {
  it("edição troca conteúdo e atualiza atividade sem mutar o original", () => {
    const trivia = ownedTrivia(alice, { playCount: 3 }, "trivia-1");
    const later = new Date(NOW.getTime() + 1000);
    const edited = editTrivia(trivia, { ...validDraft(), title: "Novo título" }, later);
    expect(edited.title).toBe("Novo título");
    expect(edited.playCount).toBe(3);
    expect(edited.lastActivityAt).toEqual(later);
    expect(trivia.title).toBe("Capitais");
  });

  it("uma partida incrementa o contador e a atividade", () => {
    const later = new Date(NOW.getTime() + 5000);
    const touched = touchTrivia(ownedTrivia(alice, {}, "trivia-1"), later);
    expect(touched.playCount).toBe(1);
    expect(touched.lastActivityAt).toEqual(later);
  });
});
