# 0015. Migrações versionadas com drizzle-kit

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

Até aqui o schema era criado por um DDL idempotente (`CREATE TABLE IF NOT EXISTS`) executado na abertura do banco ([ADR 0006](0006-sqlite-drizzle-libsql.md)). Isso não permite alterar tabelas existentes (adicionar coluna, índice, nova restrição) nem saber em que versão um banco está, e o DDL podia divergir de `src/infra/db/tables.ts`.

## Decisão

- `src/infra/db/tables.ts` é a **fonte única** do schema. As migrações SQL são geradas pelo **drizzle-kit** (`npm run db:generate`, config em `drizzle.config.ts`) na pasta `drizzle/` e versionadas no git (SQL + `meta/` com snapshots e journal).
- Migrações são aplicadas pelo migrator do Drizzle (`drizzle-orm/libsql/migrator`), que registra o que já rodou na tabela `__drizzle_migrations`:
  - `npm run db:migrate` aplica as pendentes no `DATABASE_URL`;
  - em **desenvolvimento e testes**, `openDb`/`getDb` aplicam as pendentes automaticamente (testes usam `:memory:` já migrado);
  - em **produção** (`NODE_ENV=production`) o servidor **não** migra sozinho: `npm run db:migrate` é um passo do deploy, antes de subir a nova versão.
- A migração inicial (`0000_init`) usa `IF NOT EXISTS` para adotar sem perda bancos criados pelo DDL antigo. As próximas são as geradas pelo drizzle-kit, sem edição manual (salvo justificativa no próprio PR).
- As restrições de propriedade (`owner_type IN (...)` e "dono só quando `owner_type = 'user'`") passam a ser declaradas em `tables.ts` com `check()`.

## Consequências

- Mudanças de schema viram arquivos revisáveis no PR e reproduzíveis em qualquer ambiente.
- Fluxo para mudar o schema: editar `tables.ts` → `npm run db:generate -- --name <descricao>` → revisar o SQL → commitar junto do código.
- Migrações já publicadas não devem ser alteradas (o hash muda e o histórico diverge); correções viram uma nova migração.
- O caminho para Postgres continua: um `tables` em `pg-core` com sua própria pasta de migrações.

## Alternativas consideradas

- **Manter o DDL idempotente:** não suporta alterações e diverge do código.
- **`drizzle-kit push`:** sincroniza direto sem histórico; útil para protótipos, arriscado em produção.
- **Migrar sempre na inicialização, inclusive em produção:** com várias instâncias, todas tentariam migrar ao mesmo tempo; um passo explícito de release é mais previsível.
