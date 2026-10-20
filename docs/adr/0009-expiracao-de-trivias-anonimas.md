# 0009. Trivias anônimas expiram após 30 dias sem atividade

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

Trivias anônimas não têm dono que as gerencie. Sem limpeza, o banco acumula conteúdo abandonado.

## Decisão

- Cada trivia guarda `lastActivityAt`, atualizado ao **criar, jogar ou editar** (e ao ser reivindicada).
- Regra pura (`src/domain/trivia/lifecycle.ts`): uma trivia **anônima** expira quando `lastActivityAt < now − 30 dias` (`expirationCutoff(now)`); trivias de conta **nunca** expiram. `expiresAt` informa a data na UI.
- Duas formas de aplicar a regra:
  1. **Verificação preguiçosa na leitura:** `loadTrivia` apaga e responde "não encontrada" se a trivia expirou, mesmo que a limpeza ainda não tenha rodado.
  2. **Job de limpeza:** `npm run cleanup` apaga em lote as anônimas inativas (e suas partidas e tokens de reivindicação). Para rodar via cron diário.
- A consulta SQL do job usa o mesmo `expirationCutoff` do domínio, então os dois caminhos concordam.

## Consequências

- Link de trivia anônima pode deixar de funcionar; a UI avisa a data prevista e a página 404 explica.
- O limite é exatamente 30 dias (`<` estrito); testes cobrem a fronteira.

## Alternativas consideradas

- **TTL desde a criação:** apagaria trivias populares só por serem antigas.
- **Só o job de limpeza:** entre execuções, trivias expiradas continuariam acessíveis.
- **Expirar também trivias de conta:** rejeitado; trivias salvas persistem.
