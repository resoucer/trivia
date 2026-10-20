# Trivia

Crie trivias de múltipla escolha, compartilhe por link e veja o ranking das mais jogadas.

- **Sem login obrigatório:** qualquer pessoa cria, compartilha e joga.
- **Login opcional** (e-mail e senha) para salvar trivias na conta e editá-las depois.
- **Trivias anônimas** ficam acessíveis só pelo link, não aparecem no ranking e são apagadas após **30 dias sem atividade** (criação, partida ou edição).
- **Trivias de conta** aparecem nas listas públicas e no ranking (por número de partidas) e nunca expiram.
- Quem criou uma trivia anônima pode **reivindicá-la** para a conta depois de entrar, no mesmo navegador.

## Como rodar

Requisitos: Node.js ≥ 20.9 e npm. Não precisa de nenhum serviço externo.

```bash
npm install
npm run dev          # http://localhost:3000
```

Na primeira execução o banco SQLite é criado em `data/trivia.db` com dados de exemplo:

- 3 trivias de conta (no ranking) e 1 anônima (`/t/seed-anonima`, só por link);
- usuário de demonstração: `demo@trivia.local` / `trivia1234`.

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run build` / `npm start` | build de produção e servidor de produção |
| `npm run typecheck` | `tsc --noEmit` em modo estrito |
| `npm test` | testes (Vitest): domínio e casos de uso com SQLite em memória |
| `npm run cleanup` | apaga trivias anônimas com mais de 30 dias sem atividade (para rodar via cron) |
| `npm run db:seed` | cria o schema e os dados de exemplo se o banco estiver vazio |

Variáveis de ambiente (opcionais): `DATABASE_URL` (padrão `file:data/trivia.db`; aceita `libsql://...` do Turso).

## Páginas e API

| Página | |
| --- | --- |
| `/` | destaques do ranking e trivias recentes |
| `/criar` | criar trivia (pede nome do autor se não estiver logado) |
| `/t/<id>` | link de compartilhamento: jogar, ver pontuação, compartilhar, reivindicar, editar (dono) |
| `/t/<id>/editar` | edição (só o dono logado) |
| `/ranking` | mais jogadas |
| `/minhas` | trivias da conta |
| `/entrar`, `/cadastro` | login e cadastro |

| Endpoint | |
| --- | --- |
| `POST /api/trivias` | cria trivia. Corpo: `{ title, description?, authorName? (obrigatório se anônimo), questions: [{ prompt, choices: string[], correctChoiceIndex }] }` |
| `GET /api/trivias?order=recent\|popular&limit=20` | listas públicas (só trivias de conta) |
| `GET /api/trivias/<id>` | trivia para jogar (sem gabarito) |
| `PUT /api/trivias/<id>` | edita (dono) |
| `POST /api/trivias/<id>/plays` | envia respostas `{ answers: [{ questionId, choiceId }] }`, devolve a pontuação e conta uma partida |
| `POST /api/trivias/<id>/claim` | salva uma trivia anônima na conta (precisa do cookie de reivindicação) |
| `GET /api/ranking` | ranking |
| `GET /api/me/trivias` | trivias da conta logada |
| `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | autenticação |

Erros seguem sempre o formato `{ error: { type, message, issues: [{ path, message }] } }`.

## Arquitetura

```
src/
  domain/        regras puras: tipos, schemas Zod, pontuação, expiração, ranking, permissões
    trivia/      ids.ts, owner.ts, trivia.ts, lifecycle.ts, scoring.ts, ranking.ts, play.ts (+ testes)
    user/        user.ts, displayName.ts
  application/   casos de uso (triviaService, authService) → ResultAsync<_, AppError>
  infra/         db (Drizzle + libSQL, DDL, seed), repositórios, senha (scrypt), cookies, ids aleatórios
  contract/      DTOs JSON (Zod) e encoders usados por servidor e navegador
  server/        contexto da requisição (db, viewer, relógio) e mapeamento de erros → HTTP/páginas
  app/           rotas do Next.js (páginas e API)
  components/    componentes React (editor, jogo, compartilhamento, login)
  client/        chamadas do navegador à API, decodificadas com Zod
  lib/           Maybe, parseWith (safeParse → Result), jsonString
  scripts/       cleanup.ts, seed.ts
docs/
  adr/           decisões de arquitetura (MADR, pt-BR)
  conventions-typescript.md
```

Fluxo de uma requisição: rota → `requestContext()` (abre o banco, lê a sessão, define `now`) → caso de uso → domínio puro + repositórios → `Result` → mapeamento exaustivo de erros para status HTTP e mensagem em pt-BR.

As decisões estão em [`docs/adr/`](docs/adr/README.md). Destaques:

- Propriedade como união discriminada: `Owner = { type: "anonymous" } | { type: "user"; userId }` ([ADR 0008](docs/adr/0008-modelo-de-propriedade.md)).
- Expiração por inatividade com função pura `isExpired`, verificação na leitura e job de limpeza ([ADR 0009](docs/adr/0009-expiracao-de-trivias-anonimas.md)).
- Ranking só com trivias de conta ([ADR 0010](docs/adr/0010-elegibilidade-do-ranking.md)).
- Auth local com scrypt e sessões no banco, pronta para receber OAuth ([ADR 0007](docs/adr/0007-autenticacao-opcional.md)).

## Convenções

O código segue [`docs/conventions-typescript.md`](docs/conventions-typescript.md) (ver [ADR 0003](docs/adr/0003-convencoes-typescript.md)): imports `@/`, lista de exports no topo, ids como classes marcadas com `static schema` Zod, uniões discriminadas, `switch` exaustivo com `never`, `Maybe` em vez de sentinelas, `as const` em vez de `enum`, tipos de retorno explícitos, sem `any`, imutabilidade, domínio puro, `safeParse` → `Result`, `Result` para falhas esperadas.

### Desvios conscientes

- **Páginas do Next lançam exceções** (`notFound()`, `redirect()`, error boundary), porque é assim que o framework controla o fluxo. Isso fica isolado em `src/server/page.ts` (`unwrapForPage`).
- **`throw` em `src/test/fixtures.ts`** para falhar rápido se um fixture for inválido (código de teste).
- **`null` nas bordas:** colunas do banco e DTOs JSON usam `null`; o domínio usa `Maybe` e a conversão é explícita (`toNullable`/`fromNullable`).
- **Mutação local** em `scoreSubmission` (um `Map` e um array que não escapam da função), permitida pela convenção.
- **`response.json() as Promise<unknown>`** no cliente: estreita o `any` do `fetch` para `unknown`, que é então validado com Zod.
- **libSQL em vez de better-sqlite3:** a versão atual do better-sqlite3 exige Node ≥ 22 e não compila no ambiente sem toolchain ([ADR 0006](docs/adr/0006-sqlite-drizzle-libsql.md)).

## Próximos passos

- **Auth:** rate limit e bloqueio de força bruta no login, verificação de e-mail, recuperação de senha, OAuth (Google/GitHub) via tabela `oauth_accounts` ou Auth.js/Better Auth, limpeza de sessões expiradas, token CSRF além de `SameSite=Lax`.
- **Banco:** migrações versionadas com `drizzle-kit`; schema `pg-core` para Postgres (Neon/Supabase) ou Turso mantendo libSQL.
- **Deploy:** Vercel + Postgres/Turso (SQLite em arquivo não persiste em serverless), ou container Node com volume; agendar `npm run cleanup` (cron do Vercel ou do sistema).
- **Produto:** perfil público do autor, categorias e busca, timer por pergunta, ranking por janela de tempo e de jogadores, deduplicar partidas repetidas, excluir trivia, links revogáveis, imagens nas perguntas, moderação/denúncia.
- **Qualidade:** ESLint com regras que reforcem as convenções (`no-restricted-imports` para imports relativos, `no-explicit-any`, `switch-exhaustiveness-check`), testes E2E com Playwright, CI no GitHub Actions.
