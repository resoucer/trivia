# 0006. SQLite (libSQL) com Drizzle ORM, com caminho para Postgres

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

O MVP precisa rodar localmente sem serviços externos, mas com uma migração plausível para Postgres em produção.

## Decisão

- Banco SQLite em arquivo (`data/trivia.db`, configurável por `DATABASE_URL`), acessado pelo driver **`@libsql/client`** e pelo **Drizzle ORM** (`drizzle-orm/libsql`).
- Tabelas declaradas em `src/infra/db/tables.ts`; DDL idempotente em `src/infra/db/ddl.ts`, executado na abertura. Seed automático quando o banco está vazio.
- Repositórios (`src/infra/repositories/*`) recebem o `Db` explicitamente e retornam `ResultAsync<_, DbError>`; decodificam linhas com os schemas de domínio.
- Perguntas ficam numa coluna JSON (`questions_json`) validada por schema; o agregado Trivia é sempre lido e escrito inteiro.
- Operações compostas (registrar partida + incrementar contador, apagar trivia + partidas) usam `db.batch` (atômico).

## Consequências

- `npm install && npm run dev` basta; testes de integração usam `:memory:`.
- **Caminho para Postgres:** duplicar `tables.ts` com `drizzle-orm/pg-core` (`questions_json` → `jsonb`, datas → `timestamptz`), trocar o driver em `client.ts` e substituir o DDL por migrações do `drizzle-kit`. Domínio e aplicação não mudam.
- Também é possível ir para Turso (libSQL gerenciado) só trocando `DATABASE_URL`.

## Alternativas consideradas

- **better-sqlite3:** era a primeira opção, mas a versão atual exige Node ≥ 22 e não há binário pré-compilado para o Node 20 do ambiente (a compilação falhou sem toolchain). libSQL tem binários pré-compilados e API assíncrona, mais parecida com Postgres.
- **Prisma:** gera client, mais pesado e menos explícito.
- **Postgres desde já (Docker):** exigiria serviço externo para rodar o MVP.
