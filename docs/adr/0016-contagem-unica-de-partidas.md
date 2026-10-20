# 0016. Contagem única de partidas por pessoa por dia

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

O ranking ordena trivias pelo número de partidas ([ADR 0010](0010-elegibilidade-do-ranking.md)). Como qualquer pessoa joga sem login, bastava jogar várias vezes seguidas para inflar o contador. Queremos que o contador reflita pessoas diferentes, sem exigir login e respeitando a LGPD (não guardar IP).

## Decisão

- **Uma partida conta no máximo uma vez por pessoa, por trivia, por dia.** A pontuação é sempre devolvida; a resposta de `POST /api/trivias/<id>/plays` traz `counted: true|false` e o total.
- **Identidade como união discriminada** (`src/domain/visitor/visitor.ts`), resolvida por `resolveVisitor` com esta precedência:
  1. `{ type: "user"; userId }`: sessão válida (a mesma conta conta uma vez em qualquer aparelho);
  2. `{ type: "visitor"; visitorId }`: cookie `trivia_visitor` aleatório, `httpOnly`, `SameSite=Lax`, 365 dias;
  3. `{ type: "network"; hash }`: sem cookie (primeira requisição, cookies bloqueados, clientes de API): `HMAC-SHA256(TRIVIA_VISITOR_SECRET, [dia, ip, user-agent])`.
- O cookie de visitante é emitido por um **proxy do Next.js** (`src/proxy.ts`) ao abrir `/t/<id>`, para que a primeira partida já use o cookie; a rota de partidas também o emite se faltar.
- **IP:** primeira entrada de `x-forwarded-for`, depois `x-real-ip`, validados como IPv4/IPv6; sem nenhum, um valor fixo (`unknown`). O IP só existe em memória durante a requisição; o **dia** entra no HMAC, então hashes de dias diferentes não podem ser ligados entre si. Sem o segredo não é possível reverter o hash por força bruta no espaço de IPs.
- **Dia** = dia do calendário em `America/Sao_Paulo` (`playDayOf(now)`, função pura com o relógio injetado, via `Intl.DateTimeFormat` e validado por `PlayDay.schema`).
- **Armazenamento:** tabela `play_dedup (trivia_id, visitor_key, day, play_id)` com chave primária `(trivia_id, visitor_key, day)`. `visitor_key` é prefixada pelo tipo (`user:`, `visitor:`, `network:`). Em um único `db.batch` (transação): grava a partida no histórico, tenta ocupar o slot com `INSERT … ON CONFLICT DO NOTHING`, incrementa `play_count` **somente se o slot guarda o `play_id` desta partida** e sempre atualiza `last_activity_at`. Assim duas partidas simultâneas não contam em dobro.
- O ranking continua lendo `play_count`, que agora já é deduplicado.
- **Retenção:** o `npm run cleanup` apaga linhas de `play_dedup` com mais de 2 dias (hoje e ontem ficam, para absorver a virada do dia).
- `TRIVIA_VISITOR_SECRET` é **obrigatório em produção** (sem ele as partidas respondem erro 500 de configuração); em desenvolvimento há um valor padrão. Ver `.env.example`.

## Consequências

- Replays e atualizações de página não inflam mais o ranking; o histórico de partidas (`plays`) continua completo.
- Limites conhecidos: quem apaga cookies ou usa janelas anônimas conta de novo; pessoas atrás do mesmo NAT, com o mesmo navegador e sem cookie, contam como uma só. Atrás de um proxy confiável os cabeçalhos de IP são confiáveis; exposto diretamente, um cliente pode forjá-los (no pior caso infla partidas sem cookie, como já faria trocando de cookie).
- Contagens antigas (antes desta mudança) não são recalculadas.
- Trocar o segredo só reinicia a deduplicação do dia para clientes sem cookie.

## Alternativas consideradas

- **Só IP (hash):** conta uma vez para toda uma rede (escola, empresa, operadora com CGNAT) e é instável em redes móveis.
- **Só cookie:** clientes sem cookie inflariam o contador à vontade.
- **Exigir login para contar:** contraria o produto (jogar sem login).
- **Guardar o IP em claro ou SHA-256 sem segredo:** dado pessoal pela LGPD; um hash sem chave de IPv4 é revertido por força bruta em minutos.
- **Contar distintos por consulta (`COUNT(DISTINCT …)`) no ranking:** mais caro a cada leitura e exigiria guardar identidades por mais tempo.
