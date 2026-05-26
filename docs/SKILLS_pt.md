# Skills de Agente

Os Skills de Agente estendem as capacidades da IA fornecendo instruções personalizadas, materiais de referência e fluxos de trabalho executáveis. Os skills seguem o padrão da indústria utilizado por ferramentas como o [OpenAI Codex](https://github.com/openai/codex).

## Estrutura de Pastas

Os skills são armazenados em uma pasta configurável dentro do seu vault (padrão: `skills/`). Cada skill é uma subpasta contendo um arquivo `SKILL.md`:

```
skills/
├── code-review/
│   ├── SKILL.md            # Definição do skill (obrigatório)
│   ├── references/          # Documentos de referência (opcional)
│   │   ├── style-guide.md
│   │   └── checklist.md
│   ├── workflows/           # Fluxos de trabalho executáveis (opcional)
│   │   └── run-lint.md
│   └── scripts/             # Scripts executáveis (opcional)
│       └── embed-index.sh
├── meeting-notes/
│   ├── SKILL.md
│   └── references/
│       └── template.md
```

## Formato do SKILL.md

Cada arquivo `SKILL.md` possui um frontmatter YAML para metadados e um corpo em markdown para instruções:

```markdown
---
name: Code Review
description: Reviews code blocks in notes for quality and best practices
workflows:
  - path: workflows/run-lint.md
    description: Run linting on the current note
---

You are a code review assistant. When reviewing code:

1. Check for common bugs and anti-patterns
2. Suggest improvements for readability
3. Verify error handling is adequate
4. Reference the style guide for formatting rules
```

### Campos do Frontmatter

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `name` | Não | Nome de exibição do skill. Padrão: nome da pasta |
| `description` | Não | Descrição curta exibida no seletor de skills |
| `workflows` | Não | Lista de referências de fluxos de trabalho (veja abaixo) |
| `scripts` | Não | Lista de referências de scripts (veja abaixo) |

### Referências de Fluxos de Trabalho

Os fluxos de trabalho declarados no frontmatter são registrados como ferramentas de Function Calling que a IA pode invocar:

```yaml
workflows:
  - path: workflows/run-lint.md
    name: lint              # ID personalizado opcional (padrão: ID baseado no caminho)
    description: Run linting on the current note
```

Os fluxos de trabalho no subdiretório `workflows/` também são descobertos automaticamente, mesmo sem declarações no frontmatter. Fluxos de trabalho descobertos automaticamente usam o nome base do arquivo como descrição.

### Referências de Scripts

Scripts declarados no frontmatter são registrados como ferramentas de function calling que a IA pode invocar (apenas desktop):

```yaml
scripts:
  - path: scripts/embed-index.sh
    description: Construir índice de embeddings para o Vault
```

Scripts no subdiretório `scripts/` também são auto-descobertos mesmo sem declarações no frontmatter. Scripts auto-descobertos usam o nome do arquivo como descrição.

Quando uma habilidade com scripts está ativa, a IA recebe uma ferramenta `run_skill_script`. O formato do ID do script é `skillName/scriptName` (ex: `Code Review/embed-index`).

**Interpretadores suportados** — determinados automaticamente a partir da extensão do arquivo:

| Extensão | Interpretador |
|-----------|-------------|
| `.sh`, `.bash` | `bash` |
| `.py` | `python3` |
| `.js`, `.mjs` | `node` |
| `.ts` | `npx tsx` |
| `.rb` | `ruby` |
| Outro | Execução direta (requer shebang) |

**Variáveis de ambiente passadas para os scripts:**

| Variável | Descrição |
|----------|-------------|
| `SKILL_DIR` | Caminho absoluto para a pasta da habilidade |
| `VAULT_PATH` | Caminho absoluto para a raiz do Vault |

O diretório de trabalho é definido para a pasta da habilidade.

**Modo CLI:** Como os provedores CLI não suportam function calling, scripts de habilidades usam uma convenção baseada em texto: a IA emite um marcador `[RUN_SCRIPT: scriptId](["arg1", "arg2"])`, e o plugin executa automaticamente o script e exibe o resultado.

## Referências

Coloque documentos de referência em uma subpasta `references/`. Eles são carregados automaticamente e incluídos no contexto da IA quando o skill está ativo. Use referências para:

- Guias de estilo e padrões de codificação
- Templates e exemplos
- Checklists e procedimentos
- Conhecimento específico do domínio

## Fluxos de Trabalho

Os fluxos de trabalho de skills usam o mesmo formato do [Construtor de Workflows](../README_pt.md#construtor-de-workflows). Coloque arquivos markdown de fluxos de trabalho na subpasta `workflows/`:

````markdown
```workflow
name: Run Lint
nodes:
  - id: read
    type: prompt-file
    saveTo: file
  - id: lint
    type: command
    prompt: "Check the following for lint issues:\n{{file.content}}"
    saveTo: result
  - id: show
    type: dialog
    title: Lint Results
    message: "{{result}}"
```
````

Quando um skill com fluxos de trabalho está ativo, a IA recebe uma ferramenta `run_skill_workflow` que pode chamar para executar esses fluxos de trabalho. O formato do ID do fluxo de trabalho é `skillName/workflowName` (ex.: `Code Review/workflows_run-lint`).

### Execução Interativa

Os fluxos de trabalho de skills são executados com modais interativos (igual ao painel de Workflow):

- Um modal de progresso de execução é exibido mostrando o status em tempo real
- Prompts interativos (`dialog`, `prompt-file`, `prompt-selection`) são mostrados ao usuário
- Diálogos de confirmação requerem a aprovação do usuário
- A IA recebe os logs de execução do fluxo de trabalho como resultado da ferramenta

### Retornando valores para o chat

Quando a IA invoca um workflow de skill via `run_skill_workflow`, **toda variavel cujo nome nao comeca com `_` e automaticamente retornada para a IA do chat** como parte do resultado da ferramenta. Voce nao precisa adicionar um no `command` final so para "emitir" um resultado — basta usar `saveTo:` com o valor que voce quer que a IA do chat veja.

Um no `command` executa uma chamada LLM separada *dentro* do workflow e armazena sua saida em uma variavel; ele nao escreve diretamente no chat. Se o usuario precisar que uma variavel especifica seja renderizada literalmente na resposta do chat, coloque essa instrucao no corpo de instrucoes do SKILL.md, por exemplo:

> Apos o workflow terminar, mostre o valor de `ogpMarkdown` ao usuario literalmente, sem comentarios adicionais.

A IA do lado do chat, guiada por essas instrucoes, incluira a variavel em sua resposta.

### Recuperacao de erros

Se um workflow de skill falhar durante um chat, a chamada da ferramenta com falha mostra um botao **Abrir workflow**. Clicando nele, o arquivo do workflow e aberto *e* a visao do Gemini muda para a aba Workflow / skill, para que voce possa editar o fluxo e reexecuta-lo. Uma linha de dica abaixo tambem aponta para "Modificar workflow com IA" → "Referenciar historico de execucao" para o passo com falha.

## Usando Skills no Chat

### Configuração

1. Abra as configurações do plugin
2. Encontre a seção **Skills de agente**
3. Defina o caminho da pasta de skills (padrão: `skills`)

### Ativando Skills

Os skills aparecem na área de entrada do chat quando disponíveis:

1. Clique no botão **+** ao lado da área de chips de skills
2. Selecione skills no dropdown para ativá-los
3. Skills ativos aparecem como chips que podem ser removidos clicando em **x**

Quando skills estão ativos:

- As instruções e referências do skill são injetadas no prompt do sistema
- Se os skills possuem fluxos de trabalho, a ferramenta `run_skill_workflow` fica disponível
- Se as habilidades tiverem scripts, a ferramenta `run_skill_script` ficará disponível (apenas desktop)
- A mensagem do assistente mostra quais skills foram utilizados

### Comando Slash

Você pode invocar um skill diretamente digitando `/folder-name` na entrada do chat:

- **`/folder-name`** — Ativa o skill e envia imediatamente. A IA utiliza proativamente as instruções e fluxos de trabalho do skill.
- **`/folder-name sua mensagem`** — Ativa o skill e envia "sua mensagem" junto.
- O autocompletar mostra os skills disponíveis ao digitar `/`. Selecionar do autocompletar envia imediatamente.

O nome da pasta (não o nome de exibição do skill) é usado como comando — por exemplo, um skill em `skills/weekly-report/` é invocado com `/weekly-report`.

### Suporte ao Modo CLI

Os skills também funcionam com backends CLI (Antigravity CLI, Claude CLI, Codex CLI). Como os provedores CLI não suportam Function Calling, os fluxos de trabalho de skills utilizam uma convenção baseada em texto: a IA emite um marcador `[RUN_WORKFLOW: workflowId]`, e o plugin executa automaticamente o fluxo de trabalho e exibe o resultado.

### Exemplo: Criando um Skill

1. Crie uma pasta: `skills/summarizer/`
2. Crie `skills/summarizer/SKILL.md`:

```markdown
---
name: Summarizer
description: Summarizes notes in bullet-point format
---

When asked to summarize, follow these rules:

- Use concise bullet points
- Group related items under headings
- Include key dates and action items
- Keep summaries under 500 words
```

3. Abra o chat, clique em **+** para ativar o skill "Summarizer"
4. Peça à IA para resumir uma nota — ela seguirá as instruções do skill

## Exemplos de Skills

### Guia de Estilo de Escrita (Instruções + Referências)

Um skill que mantém um estilo de escrita consistente usando um documento de referência.

#### Estrutura de pastas

```
skills/
└── writing-style/
    ├── SKILL.md
    └── references/
        └── style-guide.md
```

#### `SKILL.md`

```markdown
---
name: Writing Style
description: Mantém tom e formatação consistentes para posts de blog
---

Você é um assistente de escrita. Sempre siga o guia de estilo nas referências.

Ao revisar ou escrever texto:

1. Use a voz e o tom especificados no guia de estilo
2. Siga as regras de formatação (títulos, listas, ênfase)
3. Aplique as preferências de vocabulário (palavras preferidas/evitadas)
4. Aponte quaisquer violações de estilo ao revisar texto existente
```

#### `references/style-guide.md`

```markdown
# Guia de Estilo do Blog

## Voz e Tom
- Conversacional, mas profissional
- Voz ativa preferida
- Segunda pessoa ("você") para tutoriais, primeira pessoa do plural ("nós") para anúncios

## Formatação
- H2 para seções principais, H3 para subseções
- Use listas com marcadores para 3 ou mais itens
- Negrito para elementos de interface e termos-chave
- Blocos de código com tags de linguagem

## Vocabulário
- Preferir: "usar" em vez de "utilizar", "começar" em vez de "iniciar", "ajudar" em vez de "facilitar"
- Evitar: jargão sem explicação, construções passivas, palavras de preenchimento ("muito", "realmente", "apenas")
```

---

### Diário (Instruções + Fluxo de Trabalho)

Um skill de journaling diário com um fluxo de trabalho para criar a entrada do dia.

#### Estrutura de pastas

```
skills/
└── daily-journal/
    ├── SKILL.md
    └── workflows/
        └── create-entry.md
```

#### `SKILL.md`

```markdown
---
name: Daily Journal
description: Assistente de diário com criação de entradas
workflows:
  - path: workflows/create-entry.md
    description: Criar a entrada do diário de hoje a partir do template
---

Você é um assistente de journaling. Ajude o usuário a refletir sobre o dia.

Quando o usuário pedir para escrever uma entrada no diário:

1. Use o fluxo de trabalho para criar primeiro o arquivo da nota de hoje
2. Pergunte sobre destaques, desafios e aprendizados
3. Formate as entradas com a estrutura ## Destaques / ## Desafios / ## Aprendizados
4. Mantenha um tom caloroso e encorajador
5. Sugira perguntas de reflexão se o usuário parecer travado
```

#### `workflows/create-entry.md`

````markdown
```workflow
name: Criar Entrada do Diário
nodes:
  - id: date
    type: set
    name: today
    value: "{{_date}}"
  - id: create
    type: note
    path: "Journal/{{today}}.md"
    content: |
      # {{today}}

      ## Destaques


      ## Desafios


      ## Aprendizados


      ## Amanhã
    mode: create
    saveTo: result
  - id: open
    type: open
    path: "Journal/{{today}}.md"
```
````

Uso: Ative o skill e peça "Crie a entrada do diário de hoje" — a IA executa o fluxo de trabalho para criar o arquivo e depois ajuda a preenchê-lo.

---

### Notas de Reunião (Instruções + Referências + Fluxo de Trabalho)

Um skill completo que combina instruções personalizadas, um template de referência e um fluxo de trabalho para criar notas de reunião.

#### Estrutura de pastas

```
skills/
└── meeting-notes/
    ├── SKILL.md
    ├── references/
    │   └── template.md
    └── workflows/
        └── create-meeting.md
```

#### `SKILL.md`

```markdown
---
name: Meeting Notes
description: Tomada de notas de reunião estruturada com template e criação automática
workflows:
  - path: workflows/create-meeting.md
    description: Criar uma nova nota de reunião com participantes e pauta
---

Você é um assistente de notas de reunião. Siga o template nas referências.

Ao ajudar com notas de reunião:

1. Use o fluxo de trabalho para criar o arquivo da nota de reunião
2. Siga a estrutura do template exatamente
3. Registre itens de ação com responsáveis e prazos no formato: `- [ ] [Responsável] Item de ação (prazo: AAAA-MM-DD)`
4. Resuma as decisões de forma clara e separada da discussão
5. Após a reunião, ofereça-se para extrair os itens de ação como tarefas
```

#### `references/template.md`

```markdown
# Template de Nota de Reunião

## Seções Obrigatórias

### Cabeçalho
- **Título**: Tema da reunião
- **Data**: AAAA-MM-DD
- **Participantes**: Lista de participantes

### Pauta
Lista numerada dos tópicos de discussão.

### Notas
Detalhes da discussão organizados por item da pauta. Use subtítulos.

### Decisões
Lista com marcadores das decisões tomadas. Cada uma deve ser clara e acionável.

### Itens de Ação
Lista com caixas de seleção com responsável e prazo:
- [ ] [Responsável] Descrição (prazo: AAAA-MM-DD)

### Próximos Passos
Breve resumo dos acompanhamentos e data da próxima reunião, se aplicável.
```

#### `workflows/create-meeting.md`

````markdown
```workflow
name: Criar Nota de Reunião
nodes:
  - id: date
    type: set
    name: today
    value: "{{_date}}"
  - id: gen
    type: command
    prompt: |
      Gere o caminho do arquivo e o conteúdo inicial da nota de reunião.
      A data de hoje é {{today}}.
      O tema da reunião é: {{topic}}
      Participantes: {{attendees}}

      Retorne APENAS um objeto JSON:
      {"path": "Meetings/YYYY-MM-DD Topic.md", "content": "...conteúdo markdown seguindo o template..."}

      Use a estrutura do template: Cabeçalho com data/participantes, Pauta (do tema), seções vazias de Notas/Decisões/Itens de Ação/Próximos Passos.
    saveTo: generated
  - id: parse
    type: json
    source: generated
    saveTo: parsed
  - id: create
    type: note
    path: "{{parsed.path}}"
    content: "{{parsed.content}}"
    mode: create
    saveTo: result
  - id: open
    type: open
    path: "{{parsed.path}}"
```
````

Uso: Ative o skill e diga "Crie notas de reunião para a revisão de design com Alice, Bob e Carol" — a IA executa o fluxo de trabalho com tema/participantes, cria uma nota estruturada e a abre.

---

## Configurações

| Configuração | Padrão | Descrição |
|--------------|--------|-----------|
| Pasta de skills | `skills` | Caminho para a pasta de skills no seu vault |
