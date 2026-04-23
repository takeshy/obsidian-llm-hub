# LLM Hub para Obsidian

[![DeepWiki](https://img.shields.io/badge/DeepWiki-takeshy%2Fobsidian--llm--hub-blue.svg?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTQgMTloMTZhMiAyIDAgMCAwIDItMlY3YTIgMiAwIDAgMC0yLTJINWEyIDIgMCAwIDAtMiAydjEyYTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTkgMTV2LTQiLz48cGF0aCBkPSJNMTIgMTV2LTIiLz48cGF0aCBkPSJNMTUgMTV2LTQiLz48L3N2Zz4=)](https://deepwiki.com/takeshy/obsidian-llm-hub)

Asistente de IA **gratuito y de código abierto** para Obsidian con **Chat**, **Automatización de Flujos de Trabajo** y **Búsqueda Semántica (RAG)**. Soporta múltiples proveedores de LLM — usa la IA que mejor se adapte a tus necesidades.

> **Usa cualquier proveedor de LLM:** [Gemini](https://ai.google.dev), [OpenAI](https://platform.openai.com), [Anthropic](https://console.anthropic.com), [OpenRouter](https://openrouter.ai), [Grok](https://console.x.ai), LLMs locales ([Ollama](https://ollama.com), [LM Studio](https://lmstudio.ai), [vLLM](https://docs.vllm.ai)), o herramientas CLI ([Gemini CLI](https://github.com/google-gemini/gemini-cli), [Claude Code](https://github.com/anthropics/claude-code), [Codex CLI](https://github.com/openai/codex)).

## Características Principales

- **Chat LLM Multi-Proveedor** - Usa Gemini, OpenAI, Anthropic, OpenRouter, Grok, LLMs locales o backends CLI
- **Operaciones en el Vault** - La IA lee, escribe, busca y edita tus notas con Function Calling (Gemini, OpenAI, Anthropic)
- **Constructor de Flujos de Trabajo** - Automatiza tareas de múltiples pasos con editor visual de nodos y 25 tipos de nodos
- **Búsqueda Semántica (RAG)** - Búsqueda vectorial local con pestaña de búsqueda dedicada, vista previa de PDF y flujo de resultados a Chat
- **AI Discussion** - Arena de debate multi-modelo con respuestas paralelas, votación y determinación del ganador
- **Historial de Edición** - Rastrea y restaura cambios hechos por IA con vista de diferencias
- **Búsqueda Web** - Accede a información actualizada a través de Google Search (Gemini)
- **Generación de Imágenes** - Crea imágenes con Gemini o DALL-E
- **Integración con Discord** - Conecta tu LLM a Discord como bot de chat con cambio de modelo/RAG por canal
- **Cifrado** - Protege con contraseña el historial de chat y los registros de ejecución de workflows


## Proveedores Soportados

| Proveedor | Chat | Herramientas del Vault | Búsqueda Web | Generación de Imágenes | RAG |
|-----------|------|------------------------|--------------|------------------------|-----|
| **Gemini** (API) | ✅ Streaming | ✅ Function calling | ✅ Google Search | ✅ Modelos de imagen Gemini | ✅ |
| **OpenAI** (API) | ✅ Streaming | ✅ Function calling | ❌ | ✅ DALL-E | ✅ |
| **Anthropic** (API) | ✅ Streaming | ✅ Tool use | ❌ | ❌ | ✅ |
| **OpenRouter** (API) | ✅ Streaming | ✅ Function calling | ❌ | ❌ | ✅ |
| **Grok** (API) | ✅ Streaming | ✅ Function calling | ❌ | ❌ | ✅ |
| **Local LLM** (Ollama, LM Studio, vLLM) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |
| **CLI** (Gemini, Claude, Codex) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |

> [!TIP]
> **Se pueden configurar múltiples proveedores simultáneamente.** Cambia de modelo libremente durante el chat — cada proveedor tiene su propia clave API y configuración.

> [!TIP]
> ¡Las **Opciones CLI** te permiten usar modelos de última generación solo con una cuenta - sin necesidad de clave API!
> - **Gemini CLI**: Instala [Gemini CLI](https://github.com/google-gemini/gemini-cli), ejecuta `gemini` y autentícate con `/auth`
> - **Claude CLI**: Instala [Claude Code](https://github.com/anthropics/claude-code) (`npm install -g @anthropic-ai/claude-code`), ejecuta `claude` y autentícate
> - **Codex CLI**: Instala [Codex CLI](https://github.com/openai/codex) (`npm install -g @openai/codex`), ejecuta `codex` y autentícate

### Consejos para la Clave API Gratuita de Gemini

- Los **límites de frecuencia** son por modelo y se reinician diariamente. Cambia de modelo para continuar trabajando.
- **Gemma 4** no puede combinar llamadas a funciones con RAG/Web Search en una sola solicitud. Cuando RAG o Web Search está activo, las herramientas del vault se desactivan automáticamente. Los **modelos CLI** y **LLMs locales** no soportan operaciones en el vault en absoluto, pero **los Flujos de Trabajo aún pueden leer/escribir notas** usando los tipos de nodo `note`, `note-read` y otros. Las variables `{content}` y `{selection}` también funcionan.

---

# Chat con IA

La función de Chat con IA proporciona una interfaz de conversación interactiva con el proveedor de LLM que elijas, integrada con tu vault de Obsidian.

![Interfaz de Chat](docs/images/chat.png)

**Abrir el Chat:**
- Haz clic en el icono del plugin en la barra lateral
- Comando: "LLM Hub: Open chat"
- Alternar: "LLM Hub: Toggle chat / editor"

**Controles del Chat:**
- **Enter** - Enviar mensaje
- **Shift+Enter** - Nueva línea
- **Botón Stop** - Detener generación
- **Botón +** - Nuevo chat
- **Botón History** - Cargar chats anteriores

## Comandos Slash

Crea plantillas de prompts reutilizables activadas con `/`:

- Define plantillas con `{selection}` (texto seleccionado) y `{content}` (nota activa)
- Modelo opcional y anulación de búsqueda por comando
- Escribe `/` para ver los comandos disponibles

**Por defecto:** `/infographic` - Convierte contenido en infografía HTML

![Ejemplo de Infografía](docs/images/chat_infographic.png)

## Menciones con @

Referencia archivos y variables escribiendo `@`:

- `{selection}` - Texto seleccionado
- `{content}` - Contenido de la nota activa
- Cualquier archivo del vault - Navega e inserta (solo ruta; la IA lee el contenido mediante herramientas)

> [!NOTE]
> **Cómo funcionan `{selection}` y `{content}`:** Cuando cambias de la Vista Markdown a la Vista de Chat, la selección normalmente se borraría debido al cambio de foco. Para preservar tu selección, el plugin la captura al cambiar de vista y resalta el área seleccionada con un color de fondo en la Vista Markdown. La opción `{selection}` solo aparece en las sugerencias de @ cuando hay texto seleccionado.
>
> Tanto `{selection}` como `{content}` **no se expanden** intencionalmente en el área de entrada—dado que la entrada del chat es compacta, expandir texto largo dificultaría la escritura. El contenido se expande cuando envías el mensaje, lo cual puedes verificar revisando tu mensaje enviado en el chat.

> [!NOTE]
> Las menciones @ de archivos del vault insertan solo la ruta del archivo - la IA lee el contenido mediante herramientas. Esto no funciona con modelos CLI o LLMs locales (sin soporte de herramientas del vault). Gemini CLI puede leer archivos a través de shell, pero el formato de respuesta puede diferir.

## Archivos Adjuntos

Adjunta archivos directamente: Imágenes (PNG, JPEG, GIF, WebP), PDFs, Archivos de texto

## Llamada a Funciones (Operaciones en el Vault)

La IA puede interactuar con tu vault usando estas herramientas:

| Herramienta | Descripción |
|-------------|-------------|
| `read_note` | Leer contenido de nota |
| `create_note` | Crear nuevas notas |
| `propose_edit` | Editar con diálogo de confirmación |
| `propose_delete` | Eliminar con diálogo de confirmación |
| `bulk_propose_edit` | Edición masiva de múltiples archivos con diálogo de selección |
| `bulk_propose_delete` | Eliminación masiva de múltiples archivos con diálogo de selección |
| `search_notes` | Buscar en el vault por nombre o contenido |
| `list_notes` | Listar notas en carpeta |
| `rename_note` | Renombrar/mover notas |
| `create_folder` | Crear nuevas carpetas |
| `list_folders` | Listar carpetas en el vault |
| `get_active_note_info` | Obtener información sobre la nota activa |
| `bulk_propose_rename` | Renombrar múltiples archivos en lote con diálogo de selección |

### Modo de Herramientas del Vault

Cuando la IA maneja notas en el Chat, usa herramientas del Vault. Controla qué herramientas del vault puede usar la IA mediante el icono de base de datos (📦) debajo del botón de adjuntos:

| Modo | Descripción | Herramientas Disponibles |
|------|-------------|--------------------------|
| **Vault: Todo** | Acceso completo al vault | Todas las herramientas |
| **Vault: Sin búsqueda** | Excluir herramientas de búsqueda | Todas excepto `search_notes`, `list_notes` |
| **Vault: Desactivado** | Sin acceso al vault | Ninguna |

**Cuándo usar cada modo:**

- **Vault: Todo** - Modo predeterminado para uso general. La IA puede leer, escribir y buscar en tu vault.
- **Vault: Sin búsqueda** - Úsalo cuando ya conoces el archivo objetivo. Esto evita búsquedas redundantes en el vault, ahorrando tokens y mejorando el tiempo de respuesta.
- **Vault: Desactivado** - Úsalo cuando no necesitas acceso al vault en absoluto.

**Selección automática de modo:**

| Condición | Modo Predeterminado | Modificable |
|-----------|---------------------|-------------|
| Modelos CLI (Gemini/Claude/Codex CLI) | Vault: Desactivado | No |
| LLM Local | Vault: Desactivado | No |
| Gemma 4 + RAG/Web Search | Vault: Desactivado | Sí (desactivar RAG/Web Search reactiva las herramientas) |
| Normal | Vault: Todo | Sí |

**Por qué algunos modos son forzados:**

- **Modelos CLI/LLM Local**: Estos modelos no soportan llamadas a funciones, por lo que las herramientas del Vault no se pueden usar.
- **Gemma 4**: Las llamadas a funciones y RAG/Web Search no pueden combinarse en una sola solicitud. Cuando uno está activo, el otro se desactiva automáticamente.

## Edición Segura

Cuando la IA usa `propose_edit`:
1. Un diálogo de confirmación muestra los cambios propuestos
2. Haz clic en **Apply** para escribir los cambios en el archivo
3. Haz clic en **Discard** para cancelar sin modificar el archivo

> Los cambios NO se escriben hasta que confirmes.

## Historial de Edición

Rastrea y restaura cambios hechos a tus notas:

- **Seguimiento automático** - Todas las ediciones de IA (chat, flujo de trabajo) y cambios manuales se registran
- **Acceso desde menú de archivo** - Clic derecho en un archivo markdown para acceder a:
  - **Snapshot** - Guardar el estado actual como instantánea
  - **History** - Abrir el modal de historial de edición


- **Paleta de comandos** - También disponible via comando "Show edit history"
- **Vista de diferencias** - Ve exactamente qué cambió con adiciones/eliminaciones codificadas por color
- **Restaurar** - Revierte a cualquier versión anterior con un clic
- **Copiar** - Guarda una versión histórica como un nuevo archivo (nombre predeterminado: `{filename}_{datetime}.md`)
- **Modal redimensionable** - Arrastra para mover, redimensiona desde las esquinas

**Visualización de diferencias:**
- Las líneas `+` existían en la versión anterior
- Las líneas `-` fueron añadidas en la versión más nueva

**Cómo funciona:**

El historial de edición usa un enfoque basado en instantáneas:

1. **Creación de instantánea** - Cuando un archivo se abre por primera vez o es modificado por IA, se guarda una instantánea de su contenido
2. **Registro de diferencias** - Cuando el archivo se modifica, la diferencia entre el nuevo contenido y la instantánea se registra como una entrada de historial
3. **Actualización de instantánea** - La instantánea se actualiza al nuevo contenido después de cada modificación
4. **Restaurar** - Para restaurar a una versión anterior, las diferencias se aplican en reversa desde la instantánea

**Cuándo se registra el historial:**
- Ediciones de chat IA (herramienta `propose_edit`)
- Modificaciones de notas en flujos de trabajo (nodo `note`)
- Guardados manuales vía comando
- Auto-detección cuando el archivo difiere de la instantánea al abrir

**Almacenamiento:** El historial de edición se almacena en memoria y se borra al reiniciar Obsidian. El seguimiento persistente de versiones está cubierto por la recuperación de archivos integrada de Obsidian.

![Modal de Historial de Edición](docs/images/edit_history.png)

## Servidores MCP

Los servidores MCP (Model Context Protocol) proporcionan herramientas adicionales que extienden las capacidades de la IA más allá de las operaciones del vault.

**Se soportan dos modos de transporte:**

**HTTP (Streamable HTTP):**

1. Abre la configuración del plugin → sección **MCP Servers**
2. Haz clic en **Add server** → selecciona **HTTP**
3. Ingresa el nombre y URL del servidor
4. Configura encabezados opcionales (formato JSON) para autenticación
5. Haz clic en **Test connection** para verificar y obtener las herramientas disponibles
6. Guarda la configuración del servidor

**Stdio (Proceso local):**

1. Abre la configuración del plugin → sección **MCP Servers**
2. Haz clic en **Add server** → selecciona **Stdio**
3. Ingresa el nombre del servidor y el comando (ej., `npx -y @modelcontextprotocol/server-filesystem /path/to/dir`)
4. Configura variables de entorno opcionales (formato JSON)
5. Haz clic en **Test connection** para verificar y obtener las herramientas disponibles
6. Guarda la configuración del servidor

> **Nota:** El transporte Stdio lanza un proceso local y es solo para escritorio. La prueba de conexión es obligatoria antes de guardar.

![Configuración de Servidores MCP](docs/images/setting_mcp.png)

**Uso de herramientas MCP:**

- **En el chat:** Haz clic en el ícono de base de datos (📦) para abrir la configuración de herramientas. Habilita/deshabilita servidores MCP por conversación.
- **En flujos de trabajo:** Usa el nodo `mcp` para llamar herramientas del servidor MCP.

**Sugerencias de herramientas:** Después de una prueba de conexión exitosa, los nombres de las herramientas disponibles se guardan y se muestran tanto en la configuración como en la interfaz del chat.

### MCP Apps (UI Interactiva)

Algunas herramientas MCP devuelven UI interactiva que te permite interactuar visualmente con los resultados de la herramienta. Esta función se basa en la [especificación MCP Apps](https://github.com/anthropics/anthropic-cookbook/tree/main/misc/mcp_apps).


**Cómo funciona:**

- Cuando una herramienta MCP devuelve un URI de recurso `ui://` en los metadatos de su respuesta, el plugin obtiene y renderiza el contenido HTML
- La UI se muestra en un iframe aislado por seguridad (`sandbox="allow-scripts allow-forms"`)
- Las aplicaciones interactivas pueden llamar a herramientas MCP adicionales y actualizar el contexto a través de un puente JSON-RPC

**En el Chat:**
- MCP Apps aparece en línea en los mensajes del asistente con un botón para expandir/colapsar
- Haz clic en ⊕ para expandir a pantalla completa, ⊖ para colapsar

**En Flujos de Trabajo:**
- MCP Apps se muestra en un diálogo modal durante la ejecución del flujo de trabajo
- El flujo de trabajo se pausa para permitir la interacción del usuario, luego continúa cuando se cierra el modal

> **Seguridad:** Todo el contenido de MCP App se ejecuta en un iframe aislado con permisos restringidos. El iframe no puede acceder al DOM, cookies o almacenamiento local de la página principal. Solo están habilitados `allow-scripts` y `allow-forms`.

## Skills de Agente

Extienda las capacidades de la IA con instrucciones personalizadas, materiales de referencia y flujos de trabajo ejecutables. Los skills siguen el patrón estándar de la industria para skills de agente (p. ej., [OpenAI Codex](https://github.com/openai/codex) `.codex/skills/`).

- **Instrucciones personalizadas** - Defina comportamiento específico del dominio mediante archivos `SKILL.md`
- **Materiales de referencia** - Incluya guías de estilo, plantillas y listas de verificación en `references/`
- **Integración con flujos de trabajo** - Los skills pueden exponer flujos de trabajo como herramientas de Function Calling
- **Comando slash** - Escriba `/folder-name` para invocar un skill al instante y enviar
- **Soporte modo CLI** - Los skills funcionan con los backends Gemini CLI, Claude CLI y Codex CLI
- **Activación selectiva** - Elija qué skills están activos por conversación

Cree skills de la misma manera que los workflows — seleccione **+ New (AI)**, marque **"Crear como agent skill"** y describa lo que desea. La AI genera tanto las instrucciones del `SKILL.md` como el workflow.

> **Para instrucciones de configuración y ejemplos, consulte [SKILLS.md](docs/SKILLS_es.md)**

---

# Integración con Discord

Conecta el LLM de tu vault de Obsidian a Discord como bot de chat. Los usuarios pueden chatear con la IA, cambiar de modelo, usar búsqueda RAG y activar comandos slash — todo desde Discord.

## Configuración

### 1. Crear un Bot de Discord

1. Ve al [Discord Developer Portal](https://discord.com/developers/applications)
2. Haz clic en **New Application** → ingresa un nombre → **Create**
3. Ve a **Bot** en la barra lateral izquierda
4. Haz clic en **Reset Token** → copia el token del bot (lo necesitarás más adelante)
5. En **Privileged Gateway Intents**, habilita **Message Content Intent** (necesario para leer el texto de los mensajes)

### 2. Invitar al Bot a tu Servidor

1. Ve a **OAuth2** en la barra lateral izquierda
2. En **OAuth2 URL Generator**, selecciona el alcance **bot**
3. En **Bot Permissions**, selecciona:
   - **Send Messages**
   - **Read Message History**
4. Copia la URL generada y ábrela en tu navegador
5. Selecciona un servidor y autoriza al bot

### 3. Configurar en Obsidian

1. Abre los ajustes del plugin → sección **Discord**
2. Habilita **Discord Bot**
3. Pega el token del bot
4. Haz clic en **Connect** (el plugin verifica el token antes de conectar)
5. El indicador de estado muestra si el bot está conectado

## Opciones de Configuración

| Ajuste | Descripción | Predeterminado |
|--------|-------------|----------------|
| **Enabled** | Activar/desactivar el bot de Discord | Off |
| **Bot Token** | Token del bot de Discord del Developer Portal | — |
| **Respond to DMs** | Si el bot responde a mensajes directos | On |
| **Require @mention** | En canales del servidor, solo responder cuando se le menciona con @ (los DMs siempre responden) | On |
| **Allowed Channel IDs** | IDs de canales separados por comas para restringir (vacío = todos los canales) | vacío |
| **Allowed User IDs** | IDs de usuarios separados por comas para restringir (vacío = todos los usuarios) | vacío |
| **Model Override** | Especifica qué modelo usar para Discord (vacío = modelo seleccionado actualmente) | vacío |
| **System Prompt Override** | Prompt de sistema personalizado para conversaciones de Discord | vacío |
| **Max Response Length** | Máximo de caracteres por mensaje (1–2000, límite de Discord) | 2000 |

> [!TIP]
> **Encontrar IDs de Canal/Usuario:** En Discord, habilita el **Modo Desarrollador** (Configuración → Avanzado → Modo Desarrollador). Luego haz clic derecho en un canal o usuario y selecciona **Copiar ID**.

## Comandos del Bot

Los usuarios pueden interactuar con el bot usando estos comandos en Discord:

| Comando | Descripción |
|---------|-------------|
| `!model` | Listar modelos disponibles |
| `!model <nombre>` | Cambiar a un modelo específico para este canal |
| `!rag` | Listar configuraciones RAG disponibles |
| `!rag <nombre>` | Cambiar a una configuración RAG específica para este canal |
| `!rag off` | Desactivar RAG para este canal |
| `!skill` | Listar comandos slash disponibles |
| `!skill <nombre>` | Activar un comando slash (puede requerir mensaje de seguimiento) |
| `!discuss <theme>` | Iniciar AI Discussion con participantes configurados (en segundo plano) |
| `!reset` | Borrar historial de conversación para este canal |
| `!help` | Mostrar mensaje de ayuda |

## Características

- **Soporte multi-proveedor** — Funciona con todos los proveedores de LLM configurados (Gemini, OpenAI, Anthropic, OpenRouter, Grok, CLI, Local LLM)
- **Estado por canal** — Cada canal de Discord mantiene su propio historial de conversación, selección de modelo y configuración RAG
- **Herramientas del vault** — La IA tiene acceso completo a las herramientas del vault (leer, escribir, buscar notas) según los ajustes del plugin
- **Integración RAG** — La búsqueda semántica se puede habilitar por canal mediante el comando `!rag`
- **Comandos slash** — Activa los comandos slash del plugin mediante `!skill`
- **División de mensajes largos** — Las respuestas que exceden el límite de 2000 caracteres de Discord se dividen automáticamente en puntos de ruptura naturales
- **Memoria de conversación** — Historial por canal (máximo 20 mensajes, TTL de 30 minutos)
- **Reconexión automática** — Se recupera de caídas de conexión con retroceso exponencial

> [!NOTE]
> El historial de conversación se mantiene solo en memoria y se borra cuando el bot se desconecta o se reinicia Obsidian.

---

# Constructor de Flujos de Trabajo

Construye flujos de trabajo automatizados de múltiples pasos directamente en archivos Markdown. **No se requiere conocimiento de programación** - simplemente describe lo que quieres en lenguaje natural, y la IA creará el flujo de trabajo por ti.

![Editor Visual de Flujos de Trabajo](docs/images/visual_workflow.png)

## Creación de Workflows y Skills con AI

**No necesitas aprender sintaxis YAML ni tipos de nodos.** Simplemente describe tu flujo de trabajo en lenguaje natural:

1. Abre la pestaña **Workflow** en la barra lateral del plugin
2. Selecciona **+ New (AI)** del menú desplegable
3. Describe lo que quieres: *"Crea un flujo de trabajo que resuma la nota seleccionada y la guarde en una carpeta de resúmenes"*
4. Marque **"Crear como agent skill"** si desea crear un agent skill en lugar de un workflow independiente
5. Haz clic en **Generate** - la IA crea el flujo de trabajo completo

![Crear Flujo de Trabajo con IA](docs/images/create_workflow_with_ai.png)

**Modifica flujos de trabajo existentes de la misma manera:**
1. Carga cualquier flujo de trabajo
2. Haz clic en el botón **AI Modify**
3. Describe los cambios: *"Añade un paso para traducir el resumen al japonés"*
4. Revisa y aplica


## Tipos de Nodos Disponibles

Hay 24 tipos de nodos disponibles para construir flujos de trabajo:

| Categoría | Nodos |
|-----------|-------|
| Variables | `variable`, `set` |
| Control | `if`, `while` |
| LLM | `command` |
| Datos | `http`, `json`, `script` |
| Notas | `note`, `note-read`, `note-search`, `note-list`, `folder-list`, `open` |
| Archivos | `file-explorer`, `file-save` |
| Prompts | `prompt-file`, `prompt-selection`, `dialog` |
| Composición | `workflow` |
| Externos | `mcp`, `obsidian-command` |
| Utilidad | `sleep` |

> **Para especificaciones detalladas de nodos y ejemplos, consulta [WORKFLOW_NODES_es.md](docs/WORKFLOW_NODES_es.md)**

## Modo de Atajo de Teclado

Asigna atajos de teclado para ejecutar flujos de trabajo instantáneamente:

1. Añade un campo `name:` a tu flujo de trabajo
2. Abre el archivo del flujo de trabajo y selecciona el flujo del menú desplegable
3. Haz clic en el icono de teclado (⌨️) en el pie del panel de Workflow
4. Ve a Configuración → Teclas de acceso rápido → busca "Workflow: [Nombre de Tu Flujo de Trabajo]"
5. Asigna un atajo de teclado (ej., `Ctrl+Shift+T`)

Cuando se activa por atajo de teclado:
- `prompt-file` usa el archivo activo automáticamente (sin diálogo)
- `prompt-selection` usa la selección actual, o el contenido completo del archivo si no hay selección

## Disparadores de Eventos

Los flujos de trabajo pueden activarse automáticamente por eventos de Obsidian:

![Configuración de Disparadores de Eventos](docs/images/event_setting.png)

| Evento | Descripción |
|--------|-------------|
| File Created | Se activa cuando se crea un nuevo archivo |
| File Modified | Se activa cuando se guarda un archivo (con debounce de 5s) |
| File Deleted | Se activa cuando se elimina un archivo |
| File Renamed | Se activa cuando se renombra un archivo |
| File Opened | Se activa cuando se abre un archivo |

**Configuración de disparadores de eventos:**
1. Añade un campo `name:` a tu flujo de trabajo
2. Abre el archivo del flujo de trabajo y selecciona el flujo del menú desplegable
3. Haz clic en el icono de rayo (⚡) en el pie del panel de Workflow
4. Selecciona qué eventos deben activar el flujo de trabajo
5. Opcionalmente añade un filtro de patrón de archivo

**Ejemplos de patrones de archivo:**
- `**/*.md` - Todos los archivos Markdown en cualquier carpeta
- `journal/*.md` - Archivos Markdown solo en la carpeta journal
- `*.md` - Archivos Markdown solo en la carpeta raíz
- `**/{daily,weekly}/*.md` - Archivos en carpetas daily o weekly
- `projects/[a-z]*.md` - Archivos que empiezan con letra minúscula

**Variables de evento:** Cuando se activa por un evento, estas variables se establecen automáticamente:

| Variable | Descripción |
|----------|-------------|
| `_eventType` | Tipo de evento: `create`, `modify`, `delete`, `rename`, `file-open` |
| `_eventFilePath` | Ruta del archivo afectado |
| `_eventFile` | JSON con información del archivo (path, basename, name, extension) |
| `_eventFileContent` | Contenido del archivo (para eventos create/modify/file-open) |
| `_eventOldPath` | Ruta anterior (solo para eventos rename) |

> **Nota:** Los nodos `prompt-file` y `prompt-selection` usan automáticamente el archivo del evento cuando se activan por eventos. `prompt-selection` usa el contenido completo del archivo como la selección.

---

# Común

## Modelos Soportados

### Gemini

| Modelo | Descripción |
|--------|-------------|
| Gemini 3.1 Pro Preview | Último modelo insignia, contexto 1M (recomendado) |
| Gemini 3.1 Pro Preview (Custom Tools) | Optimizado para flujos de trabajo agénticos con herramientas personalizadas y bash |
| Gemini 3 Flash Preview | Modelo rápido, contexto 1M, mejor relación costo-rendimiento |
| Gemini 3.1 Flash Lite Preview | Modelo más rentable con alto rendimiento |
| Gemini 2.5 Flash | Modelo rápido, contexto 1M |
| Gemini 2.5 Pro | Modelo Pro, contexto 1M |
| Gemini 3 Pro (Image) | Generación de imágenes Pro, 4K |
| Gemini 3.1 Flash (Image) | Generación de imágenes rápida y económica |
| Gemma 4 | Gratuito, llamadas a funciones y RAG/Web Search son mutuamente excluyentes |

> **Modo Thinking:** En el chat, el modo thinking se activa con palabras clave como "piensa", "analiza" o "reflexiona" en tu mensaje. Sin embargo, **Gemini 3.1 Pro** siempre usa el modo thinking independientemente de las palabras clave — este modelo no permite desactivar thinking.

**Toggle Always Think:**

Puedes forzar el modo thinking a ACTIVADO para los modelos Flash sin usar palabras clave. Haz clic en el icono de base de datos (📦) para abrir el menú de herramientas, y marca los toggles bajo **Always Think**:

- **Flash** — DESACTIVADO por defecto. Marca para activar siempre el thinking para los modelos Flash.
- **Flash Lite** — ACTIVADO por defecto. Flash Lite tiene una diferencia mínima de coste y velocidad con el thinking activado, por lo que se recomienda mantenerlo activado.

Cuando un toggle está ACTIVADO, el thinking siempre está activo para esa familia de modelos independientemente del contenido del mensaje. Cuando está DESACTIVADO, se usa la detección basada en palabras clave existente.

![Always Think Settings](docs/images/setting_thinking.png)

### OpenAI

| Modelo | Descripción |
|--------|-------------|
| GPT-5.4 | Último modelo insignia |
| GPT-5.4-mini | Modelo de nivel medio rentable |
| GPT-5.4-nano | Modelo ligero y rápido |
| O3 | Modelo de razonamiento |
| DALL-E 3 / DALL-E 2 | Generación de imágenes |

### Anthropic

| Modelo | Descripción |
|--------|-------------|
| Claude Opus 4.6 | Modelo más capaz, pensamiento extendido |
| Claude Sonnet 4.6 | Rendimiento y costo equilibrados |
| Claude Haiku 4.5 | Modelo rápido y ligero |

### OpenRouter / Grok / Custom

Configura cualquier endpoint compatible con OpenAI con URL base y modelos personalizados. OpenRouter proporciona acceso a cientos de modelos de varios proveedores.

### Local LLM

Conéctate a modelos ejecutándose localmente a través de Ollama, LM Studio, vLLM o AnythingLLM. Los modelos se detectan automáticamente desde el servidor en ejecución.

## Instalación

### BRAT (Recomendado)
1. Instala el plugin [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Abre configuración de BRAT → "Add Beta plugin"
3. Ingresa: `https://github.com/takeshy/obsidian-llm-hub`
4. Habilita el plugin en la configuración de Community plugins

### Manual
1. Descarga `main.js`, `manifest.json`, `styles.css` de releases
2. Crea la carpeta `llm-hub` en `.obsidian/plugins/`
3. Copia los archivos y habilita en la configuración de Obsidian

### Desde el Código Fuente
```bash
git clone https://github.com/takeshy/obsidian-llm-hub
cd obsidian-llm-hub
npm install
npm run build
```

## Configuración

### Proveedores de API

Añade uno o más proveedores de API en la configuración del plugin. Cada proveedor tiene su propia clave API y selección de modelos.

| Proveedor | Obtener Clave API |
|-----------|-------------------|
| Gemini | [ai.google.dev](https://ai.google.dev) |
| OpenAI | [platform.openai.com](https://platform.openai.com) |
| Anthropic | [console.anthropic.com](https://console.anthropic.com) |
| OpenRouter | [openrouter.ai](https://openrouter.ai) |
| Grok | [console.x.ai](https://console.x.ai) |

También puedes añadir endpoints personalizados compatibles con OpenAI.

![Configuración Básica](docs/images/setting_basic.png)

### Local LLM

Conéctate a servidores LLM ejecutándose localmente:

1. Inicia tu servidor local (Ollama, LM Studio, vLLM o AnythingLLM)
2. Ingresa la URL del servidor en la configuración del plugin
3. Haz clic en "Verify" para detectar los modelos disponibles

> [!NOTE]
> Los LLMs locales no soportan Function Calling (herramientas del vault). Usa flujos de trabajo para operaciones con notas.

### Modo CLI (Gemini / Claude / Codex)

**Gemini CLI:**
1. Instala [Gemini CLI](https://github.com/google-gemini/gemini-cli)
2. Autentícate con `gemini` → `/auth`
3. Haz clic en "Verify" en la sección Gemini CLI

**Claude CLI:**
1. Instala [Claude Code](https://github.com/anthropics/claude-code): `npm install -g @anthropic-ai/claude-code`
2. Autentícate con `claude`
3. Haz clic en "Verify" en la sección Claude CLI

**Codex CLI:**
1. Instala [Codex CLI](https://github.com/openai/codex): `npm install -g @openai/codex`
2. Autentícate con `codex`
3. Haz clic en "Verify" en la sección Codex CLI

**Limitaciones de CLI:** Sin soporte de herramientas del vault, sin búsqueda web, solo escritorio

> [!NOTE]
> **Uso solo con CLI:** Puedes usar el modo CLI sin ninguna clave API. Solo instala y verifica una herramienta CLI.

**Ruta CLI personalizada:** Si la detección automática de CLI falla, haz clic en el icono de engranaje (⚙️) junto al botón Verify para especificar manualmente la ruta del CLI. El plugin busca automáticamente rutas de instalación comunes, incluyendo gestores de versiones (nodenv, nvm, volta, fnm, asdf, mise).

<details>
<summary><b>Windows: Cómo encontrar la ruta del CLI</b></summary>

Deja el campo de ruta del CLI vacío y haz clic en **Verify** — el plugin detecta automáticamente la instalación npm-global (revisa `%APPDATA%\npm\node_modules`, `%PROGRAMFILES%\nodejs\node_modules` y los directorios basados en PATH) y ejecuta el verdadero punto de entrada `.js` a través de `node`. La instalación independiente de Claude en `%LOCALAPPDATA%\Programs\claude\claude.exe` también se detecta automáticamente.

Define una ruta CLI personalizada solo si la detección automática falla. Cualquiera de las siguientes opciones funciona (de la más segura a la menos segura):

1. **Script `.js` (recomendado)** — ej. `C:\Users\YourName\AppData\Roaming\npm\node_modules\@google\gemini-cli\dist\index.js`. Se ejecuta vía `node` (sin pasar por `cmd.exe`).
2. **Ejecutable `.exe`** — ej. `C:\Users\YourName\AppData\Local\Programs\claude\claude.exe`. Se ejecuta directamente.
3. **Wrapper `.cmd` / `.bat`** — ej. `C:\Users\YourName\AppData\Roaming\npm\gemini.cmd`. Debe pasar por `cmd.exe`, por lo que los prompts con `&`, `|`, `>`, `^` o `%VAR%` pueden comportarse mal.

Usa `Get-Command gemini` / `Get-Command claude` / `Get-Command codex` en PowerShell para encontrar la ruta del wrapper; introdúcela directamente (opción 3) o navega al `.js` / `.exe` adyacente para las opciones más seguras.
</details>

<details>
<summary><b>macOS / Linux: Cómo encontrar la ruta del CLI</b></summary>

1. Abre un terminal y ejecuta:
   ```bash
   which gemini
   ```
2. Ingresa la ruta mostrada (ej: `/home/user/.local/bin/gemini`) en la configuración de ruta del CLI

Para Claude CLI, usa `which claude`. Para Codex CLI, usa `which codex`.

**Gestores de versiones Node.js:** Si usas nodenv, nvm, volta, fnm, asdf o mise, el plugin detecta automáticamente el binario de node desde ubicaciones comunes. Si la detección falla, especifica la ruta del script CLI directamente (ej: `~/.npm-global/lib/node_modules/@google/gemini-cli/dist/index.js`).
</details>

> [!TIP]
> **Consejo de Claude CLI:** Las sesiones de chat de LLM Hub se almacenan localmente. Puedes continuar las conversaciones fuera de Obsidian ejecutando `claude --resume` en el directorio de tu vault para ver y reanudar sesiones anteriores.

### Configuración del Espacio de Trabajo
- **Workspace Folder** - Ubicación del historial de chat y configuración
- **System Prompt** - Instrucciones adicionales para la IA
- **Tool Limits** - Controla los límites de llamadas a funciones
- **Edit History** - Rastrea y restaura cambios hechos por IA

![Límite de Herramientas e Historial de Edición](docs/images/setting_tool_history.png)

### Cifrado

Protege tu historial de chat y registros de ejecución de workflows con contraseña por separado.

1. Establece una contraseña en la configuración del plugin (almacenada de forma segura usando criptografía de clave pública)

![Configuración Inicial de Cifrado](docs/images/setting_initial_encryption.png)

2. Después de la configuración, activa el cifrado para cada tipo de registro:
   - **Cifrar historial de chat de IA** - Cifra los archivos de conversación de chat
   - **Cifrar registros de ejecución de workflows** - Cifra los archivos de historial de workflows

![Configuración de Cifrado](docs/images/setting_encryption.png)

Cada configuración puede habilitarse/deshabilitarse de forma independiente.

**Características:**
- **Controles separados** - Elige qué registros cifrar (chat, workflow, o ambos)
- **Cifrado automático** - Los nuevos archivos se cifran al guardar según la configuración
- **Caché de contraseña** - Ingresa la contraseña una vez por sesión
- **Visor dedicado** - Los archivos cifrados se abren en un editor seguro con vista previa
- **Opción de descifrado** - Elimina el cifrado de archivos individuales cuando sea necesario

**Cómo funciona:**

```
[Configuración - una vez al establecer la contraseña]
Contraseña → Generar par de claves (RSA) → Cifrar clave privada → Guardar en configuración

[Cifrado - para cada archivo]
Contenido del archivo → Cifrar con nueva clave AES → Cifrar clave AES con clave pública
→ Guardar en archivo: datos cifrados + clave privada cifrada (de configuración) + salt

[Descifrado]
Contraseña + salt → Restaurar clave privada → Descifrar clave AES → Descifrar contenido
```

- El par de claves se genera una vez (la generación RSA es lenta), la clave AES se genera por archivo
- Cada archivo almacena: contenido cifrado + clave privada cifrada (copiada de la configuración) + salt
- Los archivos son autocontenidos — descifrables solo con la contraseña, sin dependencia del plugin

<details>
<summary>Script Python de descifrado (clic para expandir)</summary>

```python
#!/usr/bin/env python3
"""Descifrar archivos encriptados de LLM Hub sin el plugin."""
import base64, sys, re, getpass
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import padding

def decrypt_file(filepath: str, password: str) -> str:
    with open(filepath, 'r') as f:
        content = f.read()

    match = re.match(r'^---\n([\s\S]*?)\n---\n([\s\S]*)$', content)
    if not match:
        raise ValueError("Formato de archivo encriptado inválido")

    frontmatter, encrypted_data = match.groups()
    key_match = re.search(r'key:\s*(.+)', frontmatter)
    salt_match = re.search(r'salt:\s*(.+)', frontmatter)
    if not key_match or not salt_match:
        raise ValueError("Falta key o salt en frontmatter")

    enc_private_key = base64.b64decode(key_match.group(1).strip())
    salt = base64.b64decode(salt_match.group(1).strip())
    data = base64.b64decode(encrypted_data.strip())

    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=100000)
    derived_key = kdf.derive(password.encode())

    iv, enc_priv = enc_private_key[:12], enc_private_key[12:]
    private_key_pem = AESGCM(derived_key).decrypt(iv, enc_priv, None)
    private_key = serialization.load_der_private_key(base64.b64decode(private_key_pem), None)

    key_len = (data[0] << 8) | data[1]
    enc_aes_key = data[2:2+key_len]
    content_iv = data[2+key_len:2+key_len+12]
    enc_content = data[2+key_len+12:]

    aes_key = private_key.decrypt(enc_aes_key, padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))

    return AESGCM(aes_key).decrypt(content_iv, enc_content, None).decode('utf-8')

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Uso: {sys.argv[0]} <archivo_encriptado>")
        sys.exit(1)
    password = getpass.getpass("Contraseña: ")
    print(decrypt_file(sys.argv[1], password))
```

Requiere: `pip install cryptography`

</details>

> **Advertencia:** Si olvidas tu contraseña, los archivos cifrados no se pueden recuperar. Guarda tu contraseña de forma segura.

> **Consejo:** Para cifrar todos los archivos de un directorio a la vez, usa un workflow. Consulta el ejemplo "Cifrar todos los archivos de un directorio" en [WORKFLOW_NODES_es.md](docs/WORKFLOW_NODES_es.md#obsidian-command).

![Flujo de Cifrado de Archivos](docs/images/enc.png)

**Beneficios de seguridad:**
- **Protegido del chat de IA** - Los archivos cifrados no pueden ser leídos por las operaciones de vault de IA (herramienta `read_note`). Esto mantiene los datos sensibles como claves API a salvo de exposición accidental durante el chat.
- **Acceso desde workflow con contraseña** - Los workflows pueden leer archivos cifrados usando el nodo `note-read`. Al acceder, aparece un diálogo de contraseña, y la contraseña se almacena en caché para la sesión.
- **Almacena secretos de forma segura** - En lugar de escribir claves API directamente en workflows, almacénalas en archivos cifrados. El workflow lee la clave en tiempo de ejecución después de la verificación de contraseña.

### Búsqueda Semántica (RAG)

Búsqueda vectorial local que inyecta contenido relevante del vault en las conversaciones con el LLM. No se requiere un servidor RAG externo — los embeddings se generan y almacenan localmente.

**Configuración:**

1. Ve a Configuración → sección RAG
2. Crea una nueva configuración RAG (haz clic en `+`)
3. Configura el embedding:
   - **Predeterminado (Gemini):** Deja la Embedding Base URL vacía — usa la API de Embedding de Gemini con tu clave API de Gemini
   - **Servidor personalizado (Ollama, etc.):** Establece la Embedding Base URL y selecciona un modelo
4. Haz clic en **Sync** para construir el índice vectorial desde tu vault
5. Selecciona la configuración RAG en el desplegable para activarla

| Configuración | Descripción | Predeterminado |
|---------------|-------------|----------------|
| **Embedding Base URL** | URL del servidor de embedding personalizado (vacío = Gemini API) | vacío |
| **Embedding API Key** | Clave API para servidor personalizado (vacío = clave de Gemini) | vacío |
| **Embedding Model** | Nombre del modelo para generación de embeddings | `gemini-embedding-2-preview` |
| **Chunk Size** | Caracteres por chunk | 500 |
| **Chunk Overlap** | Superposición entre chunks | 100 |
| **Páginas PDF por fragmento** | Número de páginas PDF por fragmento de embedding (1–6) | 6 |
| **Top K** | Máximo de chunks a recuperar por consulta | 5 |
| **Score Threshold** | Puntuación mínima de similitud (0.0–1.0) para incluir en resultados | 0.5 |
| **Target Folders** | Limitar la indexación a carpetas específicas (vacío = todas) | vacío |
| **Exclude Patterns** | Patrones regex para excluir archivos de la indexación | vacío |

> **Indexación multimodal** (imágenes, PDFs, audio, video) se habilita automáticamente al usar modelos de embedding nativos de Gemini (`gemini-embedding-*`). No requiere configuración manual.

**Índice externo:**

Usa un índice preconstruido en lugar de sincronizar desde el vault:

1. Activa el interruptor **Use external index**
2. Establece la ruta absoluta a un directorio que contenga `index.json` y `vectors.bin`
3. Opcionalmente establece la Embedding Base URL para el embedding de consultas (vacío = Gemini API)
4. El modelo de embedding se detecta automáticamente desde el archivo de índice

**Cómo funciona:** Cuando RAG está activo, cada mensaje de chat activa una búsqueda vectorial local. Los chunks relevantes se inyectan en el prompt del sistema como contexto. Las fuentes se muestran en la interfaz del chat — haz clic para abrir la nota referenciada.

### RAG Search Tab

La pestaña **RAG Search** proporciona una interfaz dedicada para buscar, filtrar, editar y enviar resultados RAG a Chat o Discussion.

![RAG Search](docs/images/rag-search.png)

- **Búsqueda semántica** con Top K y umbral de puntuación ajustables
- **Filtro por palabras clave** para reducir los resultados después de la búsqueda
- **Editor de fragmentos** con carga de fragmentos adyacentes (anterior/siguiente) y eliminación de solapamiento
- **Enviar a Chat o Discussion** — los resultados seleccionados se convierten en adjuntos editables
- **Configuración del índice** (icono de engranaje) — configura tamaño de fragmento, solapamiento, carpetas objetivo, sincronización y más

> Para más detalles, consulta la [Documentación de RAG Search](docs/RAG_SEARCH.md) ([日本語](docs/RAG_SEARCH_ja.md) | [中文](docs/RAG_SEARCH_zh.md) | [한국어](docs/RAG_SEARCH_ko.md) | [Français](docs/RAG_SEARCH_fr.md) | [Deutsch](docs/RAG_SEARCH_de.md) | [Español](docs/RAG_SEARCH_es.md) | [Português](docs/RAG_SEARCH_pt.md) | [Italiano](docs/RAG_SEARCH_it.md))

### AI Discussion

La pestaña **Discussion** proporciona una arena de debate multi-modelo donde varios modelos de IA discuten un tema en paralelo, sacan conclusiones y votan por la mejor respuesta.

![AI Discussion](docs/images/ai-discussion.png)

**Cómo funciona:**

1. Abre la pestaña **Discussion**
2. Introduce un tema de discusión
3. Añade participantes — elige cualquier modelo disponible (API, CLI, Local LLM) o User
4. Opcionalmente asigna roles a los participantes (p. ej., "Afirmativo", "Crítico")
5. Establece el número de turnos
6. Haz clic en **Start Discussion**

![Discussion Setup](docs/images/ai-discussion-start.png)

**Flujo de la discusión:**

1. **Turnos de discusión** — Todos los participantes responden en paralelo. Cada turno se basa en las respuestas anteriores.
2. **Conclusión** — En el último turno, cada participante proporciona su conclusión.
3. **Votación** — Los participantes de votación evalúan todas las conclusiones y votan por la mejor.
4. **Resultado** — Se anuncia el ganador (o empate). Guarda la transcripción completa como una nota Markdown.

![Voting Results](docs/images/ai-discussion-voting.png)

**Características:**

- **Cualquier modelo como participante** — Mezcla modelos libremente (p. ej., Gemini vs Claude vs GPT)
- **Participación del usuario** — Añádete como participante o votante para discusiones con intervención humana
- **Asignación de roles** — Dale a cada participante una perspectiva (p. ej., "Optimista", "Escéptico")
- **Participantes de votación separados** — Los participantes de votación se sincronizan automáticamente con los participantes de la discusión, pero pueden personalizarse de forma independiente
- **Configuración persistente** — Los participantes y votantes se guardan y restauran entre sesiones
- **Modal de configuración** — Haz clic en el icono de engranaje para configurar el prompt del sistema, prompt de conclusión, prompt de votación, carpeta de salida y turnos predeterminados
- **Guardar como nota** — Exporta la discusión completa (turnos, conclusiones, votaciones, ganador) como archivo Markdown

### Comandos Slash
- Define plantillas de prompts personalizadas activadas por `/`
- Modelo y búsqueda opcionales por comando

![Comandos Slash](docs/images/setting_slash_command.png)

## Requisitos

- Obsidian v0.15.0+
- Al menos uno de: clave API (Gemini, OpenAI, Anthropic, OpenRouter, Grok), servidor LLM local o herramienta CLI
- Solo escritorio (para móvil, consulta [Gemini Helper](https://github.com/takeshy/obsidian-gemini-helper))

## Privacidad

**Datos almacenados localmente:**
- Claves API (almacenadas en configuración de Obsidian)
- Historial de chat (como archivos Markdown, opcionalmente cifrados)
- Historial de ejecución de workflow (opcionalmente cifrado)
- Índice vectorial RAG (almacenado en la carpeta del workspace)
- Claves de cifrado (clave privada cifrada con tu contraseña)

**Datos enviados a proveedores de LLM:**
- Los mensajes de chat y archivos adjuntos se envían al proveedor de API configurado (Gemini, OpenAI, Anthropic, OpenRouter, Grok o endpoint personalizado)
- Cuando la Búsqueda Web está habilitada (solo Gemini), las consultas se envían a Google Search
- Los proveedores de LLM locales envían datos solo a tu servidor local

**Datos enviados a servicios de terceros:**
- Los nodos `http` de flujos de trabajo pueden enviar datos a cualquier URL especificada en el flujo de trabajo

**Proveedores CLI (opcional):**
- Cuando el modo CLI está habilitado, se ejecutan herramientas CLI externas (gemini, claude, codex) a través de child_process
- Esto solo ocurre cuando está explícitamente configurado y verificado por el usuario
- El modo CLI ejecuta herramientas CLI externas vía child_process

**Bot de Discord (opcional):**
- Cuando está habilitado, el plugin se conecta a Discord a través de WebSocket Gateway y envía los mensajes de los usuarios al proveedor de LLM configurado
- El token del bot se almacena en la configuración de Obsidian
- El contenido de los mensajes de los canales de Discord es procesado por el LLM — configura los canales/usuarios permitidos para restringir el acceso

**Servidores MCP (opcional):**
- Los servidores MCP (Model Context Protocol) pueden configurarse en los ajustes del plugin para nodos `mcp` de workflows
- Los servidores MCP son servicios externos que proporcionan herramientas y capacidades adicionales

**Notas de seguridad:**
- Revisa los flujos de trabajo antes de ejecutarlos - los nodos `http` pueden transmitir datos del vault a endpoints externos
- Los nodos `note` de flujos de trabajo muestran un diálogo de confirmación antes de escribir archivos (comportamiento predeterminado)
- Los comandos slash con `confirmEdits: false` aplicarán automáticamente las ediciones de archivos sin mostrar botones Apply/Discard
- Credenciales sensibles: No almacenes claves API ni tokens directamente en el YAML del workflow (encabezados `http`, configuración `mcp`, etc.). En su lugar, guárdalos en archivos cifrados y usa el nodo `note-read` para obtenerlos en tiempo de ejecución. Los workflows pueden leer archivos cifrados con solicitud de contraseña.

Consulta los términos de servicio de cada proveedor para políticas de retención de datos.

## Licencia

MIT

## Enlaces

- [Documentación de la API de Gemini](https://ai.google.dev/docs)
- [Documentación de la API de OpenAI](https://platform.openai.com/docs)
- [Documentación de la API de Anthropic](https://docs.anthropic.com)
- [Documentación de OpenRouter](https://openrouter.ai/docs)
- [Ollama](https://ollama.com)
- [Documentación de Plugins de Obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## Apoyo

Si encuentras útil este plugin, ¡considera invitarme un café!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/takeshy)
