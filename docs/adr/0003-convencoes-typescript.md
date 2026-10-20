# 0003. Convenções de TypeScript do projeto

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

Queremos código fácil de entender, de buscar com ferramentas de texto e com o máximo de garantias em tempo de compilação. As convenções preferidas estão em [docs/conventions-typescript.md](../conventions-typescript.md).

## Decisão

Seguimos integralmente as convenções. Pontos de aplicação neste repositório:

- **Imports absolutos** com o alias `@/` (→ `src/`); nenhum import relativo.
- **Lista de exports no topo** de cada módulo (`export { ... }` / `export type { ... }`).
- **Tipos marcados (branded) como classes** com `private readonly _tag` e `public value` e `static schema` Zod: `TriviaId`, `QuestionId`, `ChoiceId`, `PlayId`, `UserId`, `DisplayName`, `Email`. O `tsconfig` liga `noUnusedLocals`, o que torna o `@ts-expect-error` necessário (e verificado).
- **Uniões discriminadas** para estados (`Owner`, `Viewer`, `AppError`, `ScoringError`, `ClientError`, estados de UI).
- **`switch` exaustivo** com `default` atribuindo a `never`.
- **`Maybe`** próprio (`src/lib/maybe.ts`) em vez de sentinelas vazias ou `null` no domínio; `null` só aparece nas bordas (colunas do banco e DTOs JSON), via `toNullable`/`fromNullable`.
- **`as const`** em vez de `enum` (`Grade`, `PublicListOrder`, `HttpMethod`, `TRIVIA_LIMITS`).
- **Tipo de retorno explícito** em funções de topo (componentes JSX isentos).
- **Sem `any`**, atualizações imutáveis com spread, funções de domínio puras (relógio e geradores de id são injetados).
- `tsconfig` estrito: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedParameters`, `noImplicitOverride`.

## Consequências

- O compilador pega estados inválidos e casos esquecidos; buscas como `rg "TriviaId.schema"` encontram todos os usos.
- Mais código cerimonial (classes de id, encoders explícitos).
- Desvios conscientes estão listados no README (seção "Desvios").

## Alternativas consideradas

- **Brand por interseção (`string & { __brand }`):** rejeitado pelas convenções (colisão de nomes, intellisense poluído).
- **Biblioteca de Option (fp-ts, Effect, true-myth):** dependência pesada para o pouco que usamos; o `Maybe` local tem ~50 linhas.
