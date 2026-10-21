# Trivia

Crie trivias de múltipla escolha, compartilhe por link e veja o ranking das mais jogadas.

- **Sem login obrigatório:** qualquer pessoa cria, compartilha e joga.
- **Login opcional** (e-mail e senha) para salvar trivias na conta e editá-las depois.
- **Trivias anônimas** ficam acessíveis só pelo link, não aparecem no ranking e são apagadas após **30 dias sem atividade** (criação, partida ou edição).
- **Trivias de conta** aparecem nas listas públicas e no ranking (por número de partidas) e nunca expiram.
- **Partidas únicas:** cada pessoa conta no máximo **uma partida por trivia por dia** (dia de São Paulo). Jogar de novo mostra a pontuação, mas não infla o ranking.
- Quem criou uma trivia anônima pode **reivindicá-la** para a conta depois de entrar, no mesmo navegador.

## Como rodar

Requisitos: Node.js ≥ 20.9 e npm. Não precisa de nenhum serviço externo.

```bash
npm install
npm run dev          # http://localhost:3000
```

Na primeira execução o banco SQLite é criado em `data/trivia.db`, as migrações de `drizzle/` são aplicadas e entram os dados de exemplo (seed):

- usuário de demonstração: `demo@trivia.local` / `trivia1234` (aparece como "Equipe Trivia");
- 10 questionários padrão do usuário demo, que entram no ranking ([ADR 0020](docs/adr/0020-questionarios-padrao-no-seed.md)):

  | Id | Tema | Perguntas |
  | --- | --- | --- |
  | `seed-geografia-brasil` | Geografia do Brasil | 22 |
  | `seed-historia-brasil` | História do Brasil | 8 |
  | `seed-ciencia-geral` | Ciência geral | 17 |
  | `seed-programacao-funcional` | Programação funcional | 14 |
  | `seed-futebol` | Futebol | 17 |
  | `seed-cinema` | Cinema | 23 |
  | `seed-musica-brasileira` | Música brasileira | 23 |
  | `seed-astronomia` | Astronomia | 20 |
  | `seed-culinaria` | Culinária | 18 |
  | `seed-tecnologia` | Tecnologia | 11 |

- 3 trivias curtas de conta (`seed-brasil`, `seed-fp`, `seed-ciencia`) e 1 anônima (`/t/seed-anonima`, só por link).

**As contagens iniciais de partidas do seed são fictícias** (só para o ranking de demonstração não ficar plano). O conteúdo fica em `src/infra/db/defaultTrivias.ts`, como dados tipados validados pelos schemas Zod (há teste para isso). O seed é idempotente: insere o que faltar pelo id e não altera o que já existe, então `npm run db:seed` pode rodar de novo a qualquer momento (inclusive para completar um banco antigo).

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run build` / `npm start` | build de produção e servidor de produção |
| `npm run check` | Biome: lint + formatação + organização de imports (o mesmo do CI) |
| `npm run check:fix` / `npm run format` / `npm run lint` | aplica correções seguras / só formata / só lint |
| `npm run typecheck` | `tsc --noEmit` em modo estrito |
| `npm test` | testes (Vitest): domínio e casos de uso com SQLite em memória |
| `npm run cleanup` | limpeza diária (cron): trivias anônimas com mais de 30 dias sem atividade, registros de contagem única com mais de 2 dias, sessões expiradas e contadores de tentativas de login antigos |
| `npm run db:migrate` | aplica as migrações pendentes no `DATABASE_URL` (passo obrigatório no deploy de produção) |
| `npm run db:generate -- --name <descricao>` | gera uma nova migração a partir de `src/infra/db/tables.ts` |
| `npm run db:seed` | aplica as migrações e insere os dados de exemplo que faltarem (idempotente) |
| `npm run e2e` | teste ponta a ponta (Playwright): joga uma trivia do seed pelo quiz. Usa o servidor de dev na porta 3000 (sobe um se não houver). Antes, uma vez: `npx playwright install --with-deps chromium`. `E2E_SCREENSHOT_DIR=<pasta>` salva as capturas do quiz e do resultado. Não roda no CI |

Variáveis de ambiente (ver [`.env.example`](.env.example)):

| Variável | |
| --- | --- |
| `DATABASE_URL` | padrão `file:data/trivia.db`; aceita `libsql://...` do Turso |
| `TRIVIA_VISITOR_SECRET` | segredo do HMAC que identifica visitantes sem cookie e o limite de login. **Obrigatório em produção**; em desenvolvimento há um valor padrão. Gere com `openssl rand -base64 32` |

Em produção (`NODE_ENV=production`) as migrações **não** rodam sozinhas: execute `npm run db:migrate` antes de `npm start`.

## Páginas e API

| Página | |
| --- | --- |
| `/` | destaques do ranking e trivias recentes |
| `/criar` | criar trivia (pede nome do autor se não estiver logado) |
| `/t/<id>` | link de compartilhamento: jogar (uma pergunta por vez, com retorno imediato; teclas 1–4 escolhem e Enter avança), ver pontuação e revisão, compartilhar, reivindicar, editar (dono) |
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
| `POST /api/trivias/<id>/questions/<questionId>/check` | confere uma resposta `{ choiceId }` e devolve `{ questionId, chosenChoiceId, correctChoiceId, isCorrect }`. Não grava nada nem conta partida |
| `POST /api/trivias/<id>/plays` | envia respostas `{ answers: [{ questionId, choiceId }] }`, devolve a pontuação, o total de partidas e `counted` (se esta partida contou; no máximo uma por pessoa por dia) |
| `POST /api/trivias/<id>/claim` | salva uma trivia anônima na conta (precisa do cookie de reivindicação) |
| `GET /api/ranking` | ranking |
| `GET /api/me/trivias` | trivias da conta logada |
| `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | autenticação. Login: 10 tentativas/15 min por IP; cadastro: 5/hora por IP; acima disso `429` com `Retry-After` |

Erros seguem sempre o formato `{ error: { type, message, issues: [{ path, message }] } }`.

## Arquitetura

```
src/
  domain/        regras puras: tipos, schemas Zod, pontuação, expiração, ranking, permissões
    trivia/      ids.ts, owner.ts, trivia.ts, lifecycle.ts, scoring.ts, ranking.ts, play.ts, playDay.ts (+ testes)
    user/        user.ts, displayName.ts
    visitor/     identidade de quem joga: usuário, cookie de visitante ou hash de rede
    auth/        limites de tentativas de login/cadastro (janelas fixas)
  application/   casos de uso (triviaService, authService, cleanupService) → ResultAsync<_, AppError>
  infra/         db (Drizzle + libSQL, migrator, seed), repositórios, senha (scrypt), cookies, HMAC de rede, config, ids aleatórios
  contract/      DTOs JSON (Zod) e encoders usados por servidor e navegador
  server/        contexto da requisição (db, viewer, relógio), IP/visitante, mapeamento de erros → HTTP/páginas
  app/           rotas do Next.js (páginas e API)
  components/    componentes React (editor, quiz, compartilhamento, login)
  client/        chamadas do navegador à API (decodificadas com Zod) e a máquina de estados pura do quiz
  lib/           Maybe, parseWith (safeParse → Result), jsonString
  scripts/       cleanup.ts, migrate.ts, seed.ts
  proxy.ts       proxy do Next.js: emite o cookie de visitante ao abrir uma trivia
drizzle/         migrações SQL versionadas (drizzle-kit)
e2e/             teste ponta a ponta (Playwright)
.github/         CI (GitHub Actions)
docs/
  adr/           decisões de arquitetura (MADR, pt-BR)
  conventions-typescript.md
```

Fluxo de uma requisição: rota → `requestContext()` (abre o banco, lê a sessão, define `now`) → caso de uso → domínio puro + repositórios → `Result` → mapeamento exaustivo de erros para status HTTP e mensagem em pt-BR.

As decisões estão em [`docs/adr/`](docs/adr/README.md). Destaques:

- Propriedade como união discriminada: `Owner = { type: "anonymous" } | { type: "user"; userId }` ([ADR 0008](docs/adr/0008-modelo-de-propriedade.md)).
- Expiração por inatividade com função pura `isExpired`, verificação na leitura e job de limpeza ([ADR 0009](docs/adr/0009-expiracao-de-trivias-anonimas.md)).
- Quiz com uma pergunta por vez: máquina de estados pura (`QuizState` como união discriminada) e conferência de cada resposta no servidor; o envio final continua decidindo a pontuação e a contagem. A conferência revela a resposta de cada pergunta, o que aceitamos numa trivia ([ADR 0019](docs/adr/0019-quiz-uma-pergunta-por-vez.md)).
- Ranking só com trivias de conta ([ADR 0010](docs/adr/0010-elegibilidade-do-ranking.md)).
- Auth local com scrypt e sessões no banco, pronta para receber OAuth ([ADR 0007](docs/adr/0007-autenticacao-opcional.md)), com limite de tentativas por IP ([ADR 0018](docs/adr/0018-limite-de-tentativas-de-login.md)).
- Contagem única de partidas: `Visitor = { type: "user" } | { type: "visitor" } | { type: "network" }`, dia de São Paulo, tabela `play_dedup` e incremento atômico ([ADR 0016](docs/adr/0016-contagem-unica-de-partidas.md)). Nenhum IP é guardado em claro.
- Migrações versionadas com drizzle-kit ([ADR 0015](docs/adr/0015-migracoes-versionadas-drizzle-kit.md)); Biome como linter/formatador ([ADR 0014](docs/adr/0014-biome-como-linter-e-formatador.md)); CI no GitHub Actions ([ADR 0017](docs/adr/0017-integracao-continua-github-actions.md)).

## Convenções

O código segue [`docs/conventions-typescript.md`](docs/conventions-typescript.md) (ver [ADR 0003](docs/adr/0003-convencoes-typescript.md)), reforçadas pelo Biome (`biome.json`): imports `@/`, lista de exports no topo, ids como classes marcadas com `static schema` Zod, uniões discriminadas, `switch` exaustivo com `never`, `Maybe` em vez de sentinelas, `as const` em vez de `enum`, tipos de retorno explícitos, sem `any`, imutabilidade, domínio puro, `safeParse` → `Result`, `Result` para falhas esperadas.

### Desvios conscientes

- **Páginas do Next lançam exceções** (`notFound()`, `redirect()`, error boundary), porque é assim que o framework controla o fluxo. Isso fica isolado em `src/server/page.ts` (`unwrapForPage`).
- **`throw` em `src/test/fixtures.ts`** para falhar rápido se um fixture for inválido (código de teste).
- **`null` nas bordas:** colunas do banco e DTOs JSON usam `null`; o domínio usa `Maybe` e a conversão é explícita (`toNullable`/`fromNullable`).
- **Mutação local** em `scoreSubmission` (um `Map` e um array que não escapam da função), permitida pela convenção.
- **`response.json() as Promise<unknown>`** no cliente: estreita o `any` do `fetch` para `unknown`, que é então validado com Zod.
- **`export const config` em `src/proxy.ts`:** o Next.js só reconhece o `config` do proxy declarado assim (lista de exports no topo não funciona); o `proxy` continua na lista do topo.
- **`button role="radio"` nas alternativas do quiz** (`biome-ignore lint/a11y/useSemanticElements`): o rádio nativo escolhe a opção ao navegar com as setas, o que dispararia a conferência da resposta; os botões mantêm a semântica de grupo de rádio e a navegação por setas ([ADR 0019](docs/adr/0019-quiz-uma-pergunta-por-vez.md)).
- **`// biome-ignore lint/suspicious/noArrayIndexKey`** nas linhas do editor e na lista de erros: perguntas e alternativas ainda não têm id enquanto são editadas.
- **`noUnusedPrivateClassMembers` desligada no Biome:** o `_tag` privado dos tipos marcados nunca é lido de propósito.
- **libSQL em vez de better-sqlite3:** a versão atual do better-sqlite3 exige Node ≥ 22 e não compila no ambiente sem toolchain ([ADR 0006](docs/adr/0006-sqlite-drizzle-libsql.md)).

## Próximos passos

- **Auth:** bloqueio por conta/CAPTCHA após falhas (além do limite por IP), verificação de e-mail, recuperação de senha, OAuth (Google/GitHub) via tabela `oauth_accounts` ou Auth.js/Better Auth, token CSRF além de `SameSite=Lax`.
- **Banco:** schema `pg-core` (com sua pasta de migrações) para Postgres (Neon/Supabase), ou Turso mantendo libSQL.
- **Deploy:** Vercel + Postgres/Turso (SQLite em arquivo não persiste em serverless), ou container Node com volume; `npm run db:migrate` no release; definir `TRIVIA_VISITOR_SECRET`; agendar `npm run cleanup` (cron do Vercel ou do sistema); rodar atrás de um proxy que preencha `x-forwarded-for`.
- **Produto:** perfil público do autor, categorias e busca, timer por pergunta, ranking por janela de tempo (ex.: semana), excluir trivia, links revogáveis, imagens nas perguntas, moderação/denúncia.
- **Qualidade:** rodar o E2E no CI e cobrir mais fluxos (cookie de visitante, criação, login), proteção da branch `main` exigindo o CI, Dependabot/Renovate.
