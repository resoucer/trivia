# 0012. Reivindicar uma trivia anônima com token em cookie

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

Quem cria sem conta pode decidir depois que quer salvar a trivia (para editar, aparecer no ranking e não expirar). Precisamos provar que é a mesma pessoa, sem login no momento da criação.

## Decisão

- Ao criar uma trivia anônima, o servidor gera um token secreto, guarda só o hash em `trivia_claims` e envia o token no cookie `trivia_claim_<id>` (HttpOnly, 30 dias).
- Na página da trivia, se esse cookie existir, a UI oferece "Salvar na minha conta" (ou "Entre para salvar").
- `POST /api/trivias/<id>/claim` exige login e o token; `claimTrivia` (puro) move a trivia para `owner: user`, troca o autor para o nome da conta e renova a atividade. O token é apagado no mesmo batch.

## Consequências

- Funciona só no navegador onde a trivia foi criada; perder o cookie significa perder a chance de reivindicar.
- Barato: uma tabela e um cookie, sem conta "convidada".

## Alternativas consideradas

- **Link secreto de edição (estilo "admin URL"):** permite editar sem conta, mas o requisito é que edição exija login.
- **Não permitir reivindicar:** pior experiência para quem descobre o produto sem conta.
