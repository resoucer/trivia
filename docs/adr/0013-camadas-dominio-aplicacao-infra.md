# 0013. Camadas: domínio puro, aplicação, infraestrutura e borda web

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

Queremos regras de negócio testáveis sem banco nem HTTP, e efeitos colaterais explícitos.

## Decisão

```
src/domain       tipos, schemas e regras puras (pontuação, expiração, ranking, permissões)
src/application  casos de uso: orquestram domínio + repositórios, retornam ResultAsync<_, AppError>
src/infra        banco (Drizzle/libSQL), repositórios, senha, cookies, geração de ids
src/contract     DTOs JSON (Zod) e encoders compartilhados entre servidor e navegador
src/server       contexto da requisição e mapeamento de erros para HTTP/páginas
src/app          rotas do Next (páginas e API)
src/components   componentes React
src/client       chamadas do navegador à API
src/lib          utilitários genéricos (Maybe, parseWith, jsonString)
```

- O domínio não importa nada de infra, Next ou React. Relógio (`now: Date`) e ids são passados como argumento.
- Ids de pergunta/alternativa são derivados da posição (`q1`, `c2`), o que mantém `createTrivia` puro.

## Consequências

- Testes unitários do domínio rodam em milissegundos; testes de aplicação usam SQLite em memória.
- Algumas funções recebem mais parâmetros (`db`, `viewer`, `now`), mas o fluxo de dados fica explícito.

## Alternativas consideradas

- **Lógica nas rotas:** mais rápido de escrever, difícil de testar e reutilizar.
- **Injeção de dependência com container:** desnecessário neste tamanho.
