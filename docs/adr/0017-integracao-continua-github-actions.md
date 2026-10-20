# 0017. Integração contínua com GitHub Actions

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

Lint, tipos, testes e build só rodavam na máquina de quem desenvolvia. O repositório é público e deve aceitar contribuições com a mesma garantia.

## Decisão

- Workflow único `.github/workflows/ci.yml`, em todo pull request e em push para `main`:
  `npm ci` → `npm run check` (Biome, com anotações no PR) → `npm run typecheck` → `npm test` → `npm run build`.
- Versão do Node lida de `.nvmrc` (20), coerente com `engines.node >= 20.9` do `package.json`; cache do npm pelo `setup-node`.
- Permissões mínimas (`contents: read`), `concurrency` cancela execuções antigas do mesmo branch, timeout de 15 minutos.
- Testes não precisam de serviços: usam SQLite em memória com as migrações aplicadas ([ADR 0015](0015-migracoes-versionadas-drizzle-kit.md)).

## Consequências

- Nenhum PR entra quebrado; recomenda-se proteger `main` exigindo o check `CI / Biome, tipos, testes e build`.
- Atualizar o Node exige mudar `.nvmrc` e `engines` juntos.

## Alternativas consideradas

- **Matriz com várias versões de Node:** desnecessária enquanto há um único alvo de deploy.
- **Hooks locais (husky/lefthook):** complementares, mas não substituem a verificação no servidor.
