# 0005. Erros esperados como valores com `Result` (neverthrow)

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

Validação, "não encontrado", permissão negada e falhas de banco são esperadas. Exceções escondem esses caminhos e é fácil esquecer um `try/catch`.

## Decisão

- Usamos `neverthrow` (`Result`/`ResultAsync`) para todas as falhas esperadas, encadeando com `map`, `andThen`, `mapErr` e consumindo com `match`.
- APIs de terceiros que lançam (driver do banco, `JSON.parse`, `request.json()`, `scrypt`) são convertidas na borda com `ResultAsync.fromPromise` / `Result.fromThrowable`.
- Cada camada tem sua união de erros: `ScoringError`, `ClaimError`, `DbError`, `PasswordHashError`, e a união de aplicação `AppError`. A camada HTTP (`src/server/http.ts`) mapeia cada variante para status e mensagem pt-BR com `switch` exaustivo.
- `throw` só para erros de programação irrecuperáveis (ramo `never` do `switch`).
- Exceção controlada: páginas do Next usam `notFound()`/`redirect()`/error boundary, que são baseados em exceção. Isso fica concentrado em `unwrapForPage` (`src/server/page.ts`).
- Não fazemos double wrapping de promises.

## Consequências

- O compilador obriga a tratar cada erro; adicionar uma variante quebra os `switch` que não a tratam.
- Curva de aprendizado para quem não conhece `Result`.

## Alternativas consideradas

- **Exceções + `try/catch`:** caminho de erro implícito.
- **Effect-TS:** muito poderoso, mas pesado demais para um MVP.
