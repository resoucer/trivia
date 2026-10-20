# 0001. Registrar decisões de arquitetura com ADRs

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

O projeto vai crescer (autenticação real, deploy, Postgres) e várias escolhas do MVP foram feitas por motivos que não ficam evidentes no código. Precisamos de um histórico curto e versionado do porquê de cada decisão.

## Decisão

Registramos cada decisão de arquitetura relevante como um ADR em `docs/adr/`, no estilo MADR, em pt-BR, numerado sequencialmente (`NNNN-titulo.md`), a partir do modelo [0000](0000-template.md). O índice fica em [README.md](README.md). ADRs não são reescritos: quando uma decisão muda, criamos um novo ADR e marcamos o anterior como "Substituído por".

## Consequências

- Novas pessoas entendem o contexto sem depender de conversa.
- Exige disciplina: toda mudança estrutural vem acompanhada de um ADR no mesmo PR.

## Alternativas consideradas

- **Wiki externa:** sai de sincronia com o código e não passa por revisão.
- **Só comentários no código:** não captura alternativas descartadas.
