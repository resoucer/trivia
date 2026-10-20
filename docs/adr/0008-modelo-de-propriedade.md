# 0008. Propriedade da trivia: anônima ou de uma conta

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

Trivias podem ser criadas sem login, mas só as salvas numa conta podem ser editadas, aparecem em listas públicas e não expiram.

## Decisão

A propriedade é uma união discriminada no domínio (`src/domain/trivia/owner.ts`):

```ts
type Owner = { type: "anonymous" } | { type: "user"; userId: UserId };
```

- O nome público do autor (`authorName: DisplayName`) é separado do dono: anônimos digitam um nome; usuários logados usam o nome da conta.
- Regras puras em `src/domain/trivia/lifecycle.ts`: `canEditTrivia` (só o dono logado), `isListedPublicly`, `isExpired`, `expiresAt`.
- No banco: `owner_type` + `owner_user_id`, com `CHECK ((owner_type = 'user') = (owner_user_id IS NOT NULL))` para impedir estados inválidos também no SQL.

## Consequências

- Toda regra que depende do dono é um `switch` exaustivo; adicionar um dono novo (ex.: "time") quebra a compilação onde precisa.
- Trivias anônimas não podem ser editadas; para mudar, a pessoa reivindica a trivia para a conta (ver [0012](0012-reivindicacao-de-trivia-anonima.md)) ou cria outra.

## Alternativas consideradas

- **`ownerId?: string` opcional:** permite combinações inválidas e esconde a regra.
- **Usuário "convidado" implícito por cookie:** mais complexo e ainda exigiria uma regra de expiração.
