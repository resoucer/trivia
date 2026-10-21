# Registros de decisões de arquitetura (ADRs)

Cada decisão de arquitetura relevante deste projeto é registrada aqui no formato MADR (ver [0001](0001-registrar-decisoes-de-arquitetura.md)).

Para criar um novo ADR: copie [0000-template.md](0000-template.md) para o próximo número livre, preencha, adicione à tabela abaixo e inclua no mesmo PR da mudança. Decisões não são reescritas; quando mudam, um novo ADR substitui o anterior.

| Nº | Decisão | Status |
| --- | --- | --- |
| [NNNN](0000-template.md) | Título curto da decisão | Modelo |
| [0001](0001-registrar-decisoes-de-arquitetura.md) | Registrar decisões de arquitetura com ADRs | Aceito |
| [0002](0002-nextjs-app-router.md) | Next.js com App Router como framework web | Aceito |
| [0003](0003-convencoes-typescript.md) | Convenções de TypeScript do projeto | Aceito |
| [0004](0004-zod-como-base-de-schemas.md) | Zod como base de todos os schemas | Aceito |
| [0005](0005-tratamento-de-erros-com-result.md) | Erros esperados como valores com `Result` (neverthrow) | Aceito |
| [0006](0006-sqlite-drizzle-libsql.md) | SQLite (libSQL) com Drizzle ORM, com caminho para Postgres | Aceito |
| [0007](0007-autenticacao-opcional.md) | Autenticação opcional com e-mail e senha e sessões em cookie | Aceito |
| [0008](0008-modelo-de-propriedade.md) | Propriedade da trivia: anônima ou de uma conta | Aceito |
| [0009](0009-expiracao-de-trivias-anonimas.md) | Trivias anônimas expiram após 30 dias sem atividade | Aceito |
| [0010](0010-elegibilidade-do-ranking.md) | Ranking: só trivias de conta, ordenadas por número de partidas | Aceito |
| [0011](0011-links-de-compartilhamento.md) | Links de compartilhamento pelo id público da trivia | Aceito |
| [0012](0012-reivindicacao-de-trivia-anonima.md) | Reivindicar uma trivia anônima com token em cookie | Aceito |
| [0013](0013-camadas-dominio-aplicacao-infra.md) | Camadas: domínio puro, aplicação, infraestrutura e borda web | Aceito |
| [0014](0014-biome-como-linter-e-formatador.md) | Biome como linter e formatador | Aceito |
| [0015](0015-migracoes-versionadas-drizzle-kit.md) | Migrações versionadas com drizzle-kit | Aceito |
| [0016](0016-contagem-unica-de-partidas.md) | Contagem única de partidas por pessoa por dia | Aceito |
| [0017](0017-integracao-continua-github-actions.md) | Integração contínua com GitHub Actions | Aceito |
| [0018](0018-limite-de-tentativas-de-login.md) | Limite de tentativas de login e cadastro por IP | Aceito |
| [0019](0019-quiz-uma-pergunta-por-vez.md) | Quiz com uma pergunta por vez e conferência por pergunta | Aceito |
| [0020](0020-questionarios-padrao-no-seed.md) | Questionários padrão no seed, com contagens de partidas fictícias | Aceito |
