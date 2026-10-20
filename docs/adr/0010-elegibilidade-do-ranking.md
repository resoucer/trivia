# 0010. Ranking: só trivias de conta, ordenadas por número de partidas

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

O ranking e as listas públicas são vitrine. Trivias anônimas são efêmeras e acessíveis só pelo link; incluí-las facilitaria spam e exporia links que o autor talvez quisesse privados.

## Decisão

- Só trivias com `owner.type === "user"` entram no ranking e na lista de recentes (`isListedPublicly`).
- Ordenação por `playCount` decrescente, desempate pela mais recente; posições em empate são compartilhadas (1, 2, 2, 4), em `rankByPlays` (puro, testado).
- `playCount` é incrementado atomicamente no banco a cada partida enviada (`play_count = play_count + 1`), junto com o registro em `plays`.
- O repositório já filtra por `owner_type = 'user'` no SQL (índices `owner_type, play_count` e `owner_type, created_at`); o domínio aplica o mesmo filtro, por defesa.

## Consequências

- Uma trivia anônima popular só aparece no ranking depois de reivindicada.
- Qualquer pessoa pode inflar o contador jogando várias vezes; aceitável no MVP (ver próximos passos: deduplicação por sessão/IP, ranking por janela de tempo).

## Alternativas consideradas

- **Contar jogadores únicos:** exige identificar jogadores anônimos.
- **Calcular `COUNT(*)` de `plays` a cada consulta:** mais caro; mantemos o contador desnormalizado e a tabela `plays` para análises futuras.
