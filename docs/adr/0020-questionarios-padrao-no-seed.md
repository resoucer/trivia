# 0020. Questionários padrão no seed, com contagens de partidas fictícias

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

Com só três trivias curtas de exemplo, o ranking e a página inicial ficavam quase vazios numa instalação nova ou numa demonstração. O pedido é ter 10 questionários padrão em pt-BR, de temas variados, com 7 a 25 perguntas, 4 alternativas e exatamente uma correta, e que apareçam no ranking.

O seed antigo só rodava com o banco vazio, então conteúdo novo nunca chegaria a um banco que já tinha dados.

## Decisão

- O conteúdo fica em `src/infra/db/defaultTrivias.ts` como **dados tipados** (`{ prompt, correct, wrong: [3] }`), validados pelo schema Zod `schema_DefaultTrivia` e convertidos no mesmo corpo aceito por `POST /api/trivias`, que passa por `schema_TriviaDraft`. Um teste garante que todos são válidos, têm 7–25 perguntas, 4 alternativas distintas e exatamente uma correta, e que as quantidades são as sorteadas (22, 8, 17, 14, 17, 23, 23, 20, 18, 11).
- A posição da alternativa correta vem de um hash determinístico da pergunta: estável entre execuções e sem padrão visível para quem joga.
- Os questionários pertencem ao usuário de demonstração (por isso entram no ranking) e têm ids fixos `seed-*`.
- **As contagens iniciais de partidas são fictícias** (entre 9 e 71), só para o ranking de demonstração não ficar plano. Isso está documentado no código e no README.
- O seed é **idempotente**: insere cada item que faltar (pelo id) e não altera o que já existe, então rodar `npm run db:seed` de novo é seguro e também completa bancos antigos.
- Só entram fatos estáveis (nada de recordes, "atual campeão" ou outros dados que mudam com o tempo), escritos para ter uma única resposta correta.

## Consequências

- Instalações novas e demonstrações já mostram um ranking cheio.
- As contagens fictícias distorcem o ranking em relação ao uso real. Em produção, quem não quiser isso não roda `npm run db:seed` (o seed só roda sozinho fora de produção) ou apaga as trivias `seed-*`.
- Corrigir um item já inserido exige apagá-lo e rodar o seed de novo, porque o seed não sobrescreve.

## Alternativas consideradas

- **Arquivo JSON:** sem tipos no editor; o TypeScript com Zod dá o mesmo resultado com verificação em tempo de compilação e de execução.
- **Começar todas com zero partidas:** honesto, mas o ranking de demonstração ficaria sem ordem significativa.
- **Seed que atualiza o que já existe:** sobrescreveria as partidas reais de quem jogou os questionários padrão.
