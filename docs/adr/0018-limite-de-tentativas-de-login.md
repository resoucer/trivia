# 0018. Limite de tentativas de login e cadastro por IP

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

Login e cadastro ([ADR 0007](0007-autenticacao-opcional.md)) não tinham proteção contra força bruta de senha nem contra criação de contas em massa. Sessões expiradas também se acumulavam no banco.

## Decisão

- **Janelas fixas por cliente e ação**, regra pura em `src/domain/auth/rateLimit.ts`:
  - login: até **10 tentativas a cada 15 minutos**;
  - cadastro: até **5 a cada 60 minutos**.
  Toda tentativa conta (com sucesso ou não). Passou do limite: **HTTP 429** com `Retry-After` e mensagem em pt-BR. A verificação acontece antes de qualquer trabalho com senha (scrypt).
- **Cliente** = `HMAC-SHA256(TRIVIA_VISITOR_SECRET, ip)`, com o IP lido como na contagem de partidas ([ADR 0016](0016-contagem-unica-de-partidas.md)). Sem user agent e sem dia, para que trocar de navegador não zere o limite. O IP em claro nunca é guardado.
- **Armazenamento no banco** (tabela `auth_attempts (key, window_start, count)`), com `INSERT … ON CONFLICT DO UPDATE SET count = count + 1 RETURNING count`, atômico e compartilhado entre instâncias e reinícios. A chave é `<ação>:<hash>`.
- **Limpeza:** `npm run cleanup` apaga contadores com mais de 1 dia e **sessões expiradas** (que já eram ignoradas na leitura).

## Consequências

- Força bruta fica limitada a ~960 tentativas/dia por IP; cadastros em massa a 120/dia por IP.
- Usuários atrás do mesmo IP (NAT, CGNAT, escritório) dividem o limite. Se o servidor ficar exposto sem proxy que preencha `x-forwarded-for`, todos caem no mesmo balde (`unknown`) e o limite vira global; em produção é preciso rodar atrás de um proxy confiável.
- Não há bloqueio por conta (ataques distribuídos contra um e-mail continuam possíveis); fica como próximo passo, junto de CAPTCHA após falhas.
- Janelas fixas permitem até 2× o limite na virada de uma janela; aceitável para este uso.

## Alternativas consideradas

- **Em memória (Map por processo):** simples, mas zera a cada deploy e não é compartilhado entre instâncias serverless.
- **Redis/Upstash:** mais adequado em escala, mas adiciona um serviço externo que o projeto ainda não precisa.
- **Janela deslizante ou token bucket:** mais preciso, mais estado; desnecessário agora.
- **Limite por e-mail:** permite que terceiros bloqueiem a conta de alguém; pode complementar no futuro.
