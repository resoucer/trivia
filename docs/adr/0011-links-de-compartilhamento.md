# 0011. Links de compartilhamento pelo id público da trivia

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

Qualquer trivia (anônima ou de conta) precisa ser compartilhável com qualquer pessoa, sem login.

## Decisão

- O link é `/t/<id>`, onde `id` é um `TriviaId` aleatório de 72 bits em base64url (12 caracteres, `crypto.randomBytes`), impossível de adivinhar na prática. Trivias anônimas, que não aparecem em listas, ficam "não listadas", acessíveis só a quem tem o link.
- A rota valida o id com `TriviaId.schema`; id malformado vira 404 sem tocar no banco.
- A página de jogo e `GET /api/trivias/<id>` mostram a trivia **sem o gabarito**; a correção acontece no servidor (`POST /api/trivias/<id>/plays`).
- Editar não muda o link.

## Consequências

- Simples e sem estado extra; o id serve de chave primária e de slug.
- Não há como "revogar" um link sem apagar a trivia (futuro: slugs separados e revogáveis, ou links privados com segredo).

## Alternativas consideradas

- **Ids sequenciais:** enumeráveis; exporiam trivias anônimas.
- **Slug a partir do título:** bonito, mas colide e muda ao editar.
- **UUID:** seguro, porém longo para compartilhar.
