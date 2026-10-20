# 0014. Biome como linter e formatador

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

O projeto não tinha linter nem formatador. Várias convenções de [`docs/conventions-typescript.md`](../conventions-typescript.md) (sem `any`, sem `enum`, sem imports relativos, `import type`, tipos de retorno explícitos, `switch` exaustivo) só eram garantidas por revisão manual.

## Decisão

- Usamos **Biome** (`@biomejs/biome`, versão fixa) como único linter e formatador, configurado em `biome.json`. Não usamos ESLint nem Prettier.
- Formatação: 2 espaços, aspas duplas, vírgula final, `lineWidth` 120; imports organizados pelo assist `organizeImports`.
- Linter: preset `recommended` mais regras que reforçam as convenções:
  - `suspicious/noExplicitAny`, `noEvolvingTypes`, `noImplicitAnyLet`: sem `any`.
  - `style/noEnum`: `as const` em vez de `enum`; `noNamespace`.
  - `style/noRestrictedImports` com padrões `./*` e `../*`: só imports `@/`.
  - `style/useImportType` e `useExportType`; `noParameterAssign`; `noNonNullAssertion`; `useConst`.
  - `style/useConsistentArrayType` (`Array<T>`/`ReadonlyArray<T>`).
  - `style/noDefaultExport`, desligada por override só onde o Next.js exige (`page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`) e nos arquivos `*.config.*`.
  - `nursery/useExhaustiveSwitchCases` (complementa o `default` com `never`).
  - `nursery/useExplicitType` em `src/**/*.ts` (exceto testes); componentes `.tsx` ficam isentos, como manda a convenção.
- `correctness/noUnusedPrivateClassMembers` fica **desligada**: o campo `_tag` dos tipos marcados é privado e nunca lido de propósito, e o autofix da regra o removeria.
- Scripts: `npm run lint`, `npm run format`, `npm run check` (lint + formatação + imports, usado no CI) e `npm run check:fix`.

## Consequências

- Uma única ferramenta rápida (Rust) para lint e formatação, sem plugins.
- Regras `nursery` podem mudar entre versões; por isso a versão do Biome é fixa e atualizada conscientemente.
- Biome não tem análise com tipos completa como o `typescript-eslint` (por exemplo `switch-exhaustiveness-check` baseado em tipos); o `tsc` estrito e o padrão `never` continuam sendo a garantia principal.
- Exceções pontuais usam `// biome-ignore <regra>: <motivo>` (hoje só chaves por índice em linhas de formulário).

## Alternativas consideradas

- **ESLint + typescript-eslint + Prettier:** mais regras com informação de tipo, porém mais lento e com várias dependências e configurações para manter.
- **Só `tsc`:** não cobre imports relativos, `enum`, formatação.
