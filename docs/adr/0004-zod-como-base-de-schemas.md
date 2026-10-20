# 0004. Zod como base de todos os schemas

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

Dados entram por HTTP, cookies, banco e JSON; todos precisam ser validados e decodificados para tipos de domínio. Não queremos tipos duplicados em relação aos schemas.

## Decisão

Usamos **Zod 4** como única biblioteca de schemas:

- Schema primeiro, tipo derivado: `type Trivia = z.infer<typeof schema_Trivia>`; formatos codificados com `z.input`.
- Schemas de classes ficam como membro estático (`TriviaId.schema = z.string().regex(...).transform(v => new TriviaId(v))`).
- Codificação de volta é explícita (`encodeTrivia`, `encodeOwner`, `encode*` em `src/contract/dto.ts`); sem serializador mágico.
- Combinadores em vez de manipulação de strings: datas com `z.iso.datetime().transform(...)`, JSON embutido com o combinador `jsonString(schema)` (`src/lib/json.ts`), hash de senha armazenado como JSON validado (nada de `split("$")`).
- Sempre `safeParse` convertido em `Result` via `parseWith` (`src/lib/validation.ts`).
- Mensagens de erro de validação em pt-BR definidas nos próprios schemas.
- O contrato HTTP (`src/contract/dto.ts`) também é Zod e é usado nos dois lados: o cliente decodifica as respostas.

## Consequências

- Uma única fonte de verdade para formato e tipo.
- Os erros de validação carregam caminho estruturado (`["questions", 0, "choices", 1]`), que a UI traduz para "Pergunta 1 › Alternativa 2".

## Alternativas consideradas

- **Módulo de schema interno (`@/lib/schema`):** descartado por decisão do Fabricio; Zod é a base.
- **Valibot / ArkType:** menores/rápidos, mas Zod é o padrão do ecossistema e já é conhecido.
