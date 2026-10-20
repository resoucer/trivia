# 0007. Autenticação opcional com e-mail e senha e sessões em cookie

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

Qualquer pessoa precisa conseguir criar, compartilhar e jogar sem conta. Login só serve para salvar trivias numa conta e editá-las depois. Queremos poder adicionar OAuth no futuro.

## Decisão

- Autenticação local por **e-mail + senha**. Senhas são derivadas com **scrypt** (`node:crypto`, sal aleatório, parâmetros guardados junto do hash em JSON validado por Zod; comparação com `timingSafeEqual`).
- **Sessões no banco**: token aleatório de 256 bits no cookie `trivia_session` (`HttpOnly`, `SameSite=Lax`, `Secure` em produção, 30 dias); só o hash SHA-256 do token é guardado (`sessions`).
- Quem está agindo é modelado como `Viewer = { type: "anonymous" } | { type: "user"; user }`, resolvido uma vez por requisição em `requestContext()`.
- Identidade separada da credencial: `users` (id, e-mail, nome) e `password_credentials`. OAuth entra como nova tabela `oauth_accounts(provider, provider_account_id, user_id)` e um novo caso de uso de login que produz a mesma sessão, sem tocar no resto.
- Rotas: `POST /api/auth/signup|login|logout`, `GET /api/auth/me`.

## Consequências

- Zero dependências nativas e nenhum serviço externo.
- Faltam recursos de produção: rate limit de login, verificação de e-mail, recuperação de senha, limpeza de sessões expiradas, proteção CSRF além do `SameSite=Lax` (ver Próximos passos no README).

## Alternativas consideradas

- **Auth.js (NextAuth) com Credentials:** o provider de credenciais é desencorajado pela própria lib e força sessões JWT; adicionaria complexidade sem ganho no MVP. Continua sendo uma boa opção quando o OAuth chegar.
- **argon2/bcrypt:** precisam de binários nativos (mesmo problema do better-sqlite3); scrypt é nativo do Node e adequado.
- **Better Auth / Lucia:** boas opções futuras; Lucia foi descontinuada como lib.
