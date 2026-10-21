# 0019. Quiz com uma pergunta por vez e conferência por pergunta

- **Status:** Aceito
- **Data:** 2026-10-19
- **Decisores:** Fabricio Carvalho

## Contexto

A página `/t/<id>` mostrava todas as perguntas de uma vez e só dava a pontuação no envio final. O pedido é jogar como num quiz convencional: uma pergunta por vez, com retorno imediato (certo/errado e a alternativa correta destacada) antes de seguir para a próxima, e uma tela final com pontuação, revisão, link de compartilhamento e "Jogar de novo".

Restrições:

- o gabarito não deve ir para o navegador junto com a trivia (`GET /api/trivias/<id>` e a página continuam sem `correctChoiceIndex`);
- a contagem de partidas continua decidida no servidor, uma por pessoa por dia ([ADR 0016](0016-contagem-unica-de-partidas.md));
- a UI tem vários estados (respondendo, conferindo, retorno, enviando, resultado, erro) que precisam ser testáveis sem navegador;
- trivias expiradas ou inexistentes continuam com o mesmo tratamento.

## Decisão

- **Endpoint de conferência:** `POST /api/trivias/<id>/questions/<questionId>/check` com `{ choiceId }` devolve `{ questionId, chosenChoiceId, correctChoiceId, isCorrect }`. Ele usa a mesma função pura do domínio que pontua a partida (`checkAnswer`, ao lado de `scoreSubmission`), passa pelo mesmo `loadTrivia` (expiradas viram 404) e **não grava nada**: não conta partida nem renova a atividade.
- **Envio final inalterado:** ao terminar, o navegador envia todas as respostas para `POST /api/trivias/<id>/plays`, que recalcula a pontuação no servidor e decide se a partida conta. A pontuação exibida é a devolvida por esse endpoint, não a soma local.
- **Máquina de estados pura no cliente** (`src/client/quizMachine.ts`): `QuizState` é uma união discriminada (`answering | checking | feedback | submitting | finished | error`) e `transition(config, state, event)` devolve o novo estado e um efeito (`none | check | submit`), com `switch` exaustivo. Respostas de conferência atrasadas ou de outra pergunta são ignoradas. O componente executa o efeito no próprio manipulador do evento (não em `useEffect`), o que evita requisições duplicadas no StrictMode.
- **Acessibilidade:** alternativas com semântica de grupo de rádio (`role="radiogroup"`/`role="radio"`, setas para navegar), atalhos de teclado (1–4 escolhem, Enter avança), região `aria-live` com "Correto!"/"Incorreto. A resposta certa é: …", foco no enunciado de cada pergunta e no botão "Próxima"/"Ver resultado" depois do retorno.

## Consequências

- O retorno imediato revela o gabarito pergunta a pergunta: quem quiser pode chamar o endpoint de conferência para todas as alternativas antes de "jogar" e tirar a nota máxima. **Aceitamos isso** porque é uma trivia casual, sem prêmio, e o ranking é por número de partidas, não por pontuação; o envio final continua autoritativo para a contagem.
- Uma requisição a mais por pergunta (pequena e sem escrita). Se a rede falhar, o estado `error` oferece "Tentar de novo" sem perder as respostas anteriores.
- A lógica do quiz fica testável em Vitest sem DOM; o componente só traduz eventos e efeitos.
- As alternativas usam `button role="radio"` em vez de `<input type="radio">` (com `biome-ignore` justificado), porque o rádio nativo escolhe a opção ao navegar com as setas, o que dispararia a conferência sem intenção.

## Alternativas consideradas

- **Enviar o gabarito junto com a trivia:** retorno instantâneo e sem requisições, mas expõe todas as respostas logo ao abrir a página e quebra a decisão de não mandar gabarito ao navegador.
- **Retorno só no final:** não revela nada antes do envio, mas não é o comportamento de quiz pedido.
- **Uma "sessão de partida" no servidor** (registrar cada resposta e só aceitar uma por pergunta): impediria consultar alternativas, mas exige estado e expiração de sessões de jogo, um custo desproporcional para uma trivia.
- **Contar a partida aos poucos pelas conferências:** misturaria leitura com escrita e complicaria a contagem única; a partida continua contando só no envio final.
