# 0002. Next.js com App Router como framework web

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

Precisamos de UI e API no mesmo projeto, renderização no servidor (links compartilhados devem abrir rápido e ter título correto) e um caminho simples de deploy.

## Decisão

Usamos Next.js 16 com App Router e TypeScript estrito:

- Páginas em `src/app/**/page.tsx` são Server Components que chamam os casos de uso diretamente (sem HTTP interno).
- A API JSON fica em Route Handlers (`src/app/api/**/route.ts`), usada pelos componentes cliente e testável com `curl`.
- Componentes interativos (`src/components/*`) são Client Components que recebem DTOs serializáveis, nunca entidades de domínio (classes não atravessam a fronteira servidor→cliente).
- Tailwind CSS v4 para estilos.

## Consequências

- Um único processo serve UI e API; deploy direto em Vercel ou em um container Node.
- O controle de fluxo do Next (`notFound()`, `redirect()`) é baseado em exceções; isolamos isso em `src/server/page.ts` (ver [0005](0005-tratamento-de-erros-com-result.md)).
- `export { X as default }` no topo dos módulos funciona para páginas e rotas, então mantemos a convenção de lista de exports.

## Alternativas consideradas

- **Vite + React SPA + API separada (Fastify/Hono):** mais peças para rodar e sem SSR dos links compartilhados.
- **Server Actions em vez de Route Handlers:** menos boilerplate, mas difícil de exercitar com `curl` e de reutilizar por outros clientes (ex.: app mobile).
- **Remix/React Router 7:** viável, porém o pedido foi Next.js.
