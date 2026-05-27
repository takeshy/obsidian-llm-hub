# LLM Hub for Obsidian

[![DeepWiki](https://img.shields.io/badge/DeepWiki-takeshy%2Fobsidian--llm--hub-blue.svg?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTQgMTloMTZhMiAyIDAgMCAwIDItMlY3YTIgMiAwIDAgMC0yLTJINWEyIDIgMCAwIDAtMiAydjEyYTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTkgMTV2LTQiLz48cGF0aCBkPSJNMTIgMTV2LTIiLz48cGF0aCBkPSJNMTUgMTV2LTQiLz48L3N2Zz4=)](https://deepwiki.com/takeshy/obsidian-llm-hub)

**免费开源的** Obsidian AI 助手，提供**聊天**、**工作流自动化**和**语义搜索（RAG）**功能。支持多种 LLM 提供商 — 使用最适合您需求的 AI。

> **使用任何 LLM 提供商：** [Gemini](https://ai.google.dev)、[OpenAI](https://platform.openai.com)、[Anthropic](https://console.anthropic.com)、[OpenRouter](https://openrouter.ai)、[Grok](https://console.x.ai)、[OpenCode Zen / Go](https://opencode.ai)、本地 LLM（[Ollama](https://ollama.com)、[LM Studio](https://lmstudio.ai)、[vLLM](https://docs.vllm.ai)、[OpenCode](https://opencode.ai)），或 CLI 工具（[Antigravity CLI](https://antigravity.google)、[Claude Code](https://github.com/anthropics/claude-code)、[Codex CLI](https://github.com/openai/codex)）。

## 主要特性

- **多提供商 LLM 聊天** - 使用 Gemini、OpenAI、Anthropic、OpenRouter、Grok、OpenCode Zen/Go、本地 LLM 或 CLI 后端
- **仓库操作** - AI 通过函数调用读取、写入、搜索和编辑您的笔记（Gemini、OpenAI、Anthropic、OpenCode Zen/Go，以及通过 LM Studio / vLLM / AnythingLLM 的支持工具的本地 LLM）
- **工作流构建器** - 使用可视化节点编辑器和 25 种节点类型自动化多步骤任务
- **语义搜索（RAG）** - 本地向量搜索，提供专用搜索标签页、PDF 预览和结果发送至聊天功能
- **AI Discussion** - 多模型辩论竞技场，支持并行回复、投票和获胜者裁定
- **编辑历史** - 使用差异视图追踪和恢复 AI 所做的更改
- **网页搜索** - 通过 Google 搜索获取最新信息（Gemini）
- **图像生成** - 使用 Gemini 或 DALL-E 创建图像
- **Discord 集成** - 将您的 LLM 连接到 Discord 作为聊天 bot，支持按频道切换模型/RAG
- **加密** - 使用密码保护聊天历史和工作流执行日志


## 支持的提供商

| 提供商 | 聊天 | Vault 工具 | 网页搜索 | 图像生成 | RAG |
|--------|------|------------|----------|----------|-----|
| **Gemini** (API) | ✅ 流式传输 | ✅ 函数调用 | ✅ Google 搜索 | ✅ Gemini 图像模型 | ✅ |
| **OpenAI** (API) | ✅ 流式传输 | ✅ 函数调用 | ❌ | ✅ DALL-E | ✅ |
| **Anthropic** (API) | ✅ 流式传输 | ✅ Tool use | ❌ | ❌ | ✅ |
| **OpenRouter** (API) | ✅ 流式传输 | ✅ 函数调用 | ❌ | ❌ | ✅ |
| **Grok** (API) | ✅ 流式传输 | ✅ 函数调用 | ❌ | ❌ | ✅ |
| **OpenCode Zen / Go** (API) | ✅ 流式传输 | ✅ 函数调用 | ❌ | ❌ | ✅ |
| **本地 LLM** (LM Studio, vLLM, AnythingLLM) | ✅ 流式传输 | ✅ 函数调用（自动回退） | ❌ | ❌ | ✅ |
| **本地 LLM** (Ollama, OpenCode) | ✅ 流式传输 | ❌（标记模式） | ❌ | ❌ | ✅ |
| **CLI** (Antigravity, Claude, Codex) | ✅ 流式传输 | ❌ | ❌ | ❌ | ✅ |

> [!TIP]
> **可以同时配置多个提供商。** 在聊天过程中自由切换模型 — 每个提供商拥有独立的 API 密钥和设置。

> [!TIP]
> **CLI 选项** 让您只需一个账户即可使用旗舰模型 - 无需 API 密钥！
> - **Antigravity CLI**：安装 [Antigravity CLI](https://antigravity.google)，使用 `agy` 进行身份验证
> - **Claude CLI**：安装 [Claude Code](https://github.com/anthropics/claude-code)（`npm install -g @anthropic-ai/claude-code`），运行 `claude` 并进行身份验证
> - **Codex CLI**：安装 [Codex CLI](https://github.com/openai/codex)（`npm install -g @openai/codex`），运行 `codex` 并进行身份验证

### Gemini 免费 API 密钥使用技巧

- **速率限制** 按模型计算，每日重置。切换模型可继续使用。
- **Gemma 4** 无法在单个请求中同时使用函数调用和 RAG/Web Search。当 RAG 或 Web Search 启用时，Vault 工具会自动禁用。**CLI 模型**、**Ollama** 和 **OpenCode (Local)** 不支持 Vault 工具（请使用 **工作流**（`note`、`note-read` 等）或 `{content}` / `{selection}` 变量进行笔记操作）。**LM Studio / vLLM / AnythingLLM** 本地 LLM 在底层模型支持 OpenAI 风格函数调用时支持 Vault 工具 — 不兼容的模型会在首次使用时自动检测并降级到基于标记的 skill 模式。

---

# AI 聊天

AI 聊天功能提供与您所选 LLM 提供商的交互式对话界面，与您的 Obsidian 仓库深度集成。

![聊天界面](docs/images/chat.png)

**打开聊天:**
- 点击功能区中的聊天图标
- 命令："LLM Hub: Open chat"
- 切换："LLM Hub: Toggle chat / editor"

**聊天控制:**
- **Enter** - 发送消息
- **Shift+Enter** - 换行
- **停止按钮** - 停止生成
- **+ 按钮** - 新建聊天
- **历史按钮** - 加载之前的聊天

## 斜杠命令

创建可通过 `/` 触发的可复用提示词模板：

- 使用 `{selection}`（选中文本）和 `{content}`（当前笔记）定义模板
- 可为每个命令单独设置模型和搜索覆盖
- 输入 `/` 查看可用命令

**默认命令：** `/infographic` - 将内容转换为 HTML 信息图

![信息图示例](docs/images/chat_infographic.png)

## @ 提及

输入 `@` 来引用文件和变量：

- `{selection}` - 选中的文本
- `{content}` - 当前笔记内容
- 任意仓库文件 - 浏览并插入（仅路径；AI 通过工具读取内容）

> [!NOTE]
> **`{selection}` 和 `{content}` 的工作原理：** 当您从 Markdown 视图切换到聊天视图时，由于焦点变化，选择通常会被清除。为了保留您的选择，插件会在切换视图时捕获它，并在 Markdown 视图中用背景色高亮显示选中区域。`{selection}` 选项仅在有文本被选中时才会出现在 @ 建议中。
>
> `{selection}` 和 `{content}` 都**故意不在输入区域展开**——由于聊天输入框较小，展开长文本会使输入变得困难。内容会在您发送消息时展开，您可以通过查看聊天中已发送的消息来验证这一点。

> [!NOTE]
> 仓库文件的 @ 提及仅插入文件路径 - AI 通过工具读取内容。这不适用于 CLI 模型，也不适用于 Ollama/OpenCode 等仅支持标记模式的本地 LLM。**LM Studio / vLLM / AnythingLLM** 等支持工具的本地 LLM 在加载的模型支持 Function Calling 时，可以通过 vault 工具读取文件。Antigravity CLI 可以通过 shell 读取文件，但响应格式可能有所不同。

## 文件附件

直接附加文件：图像（PNG、JPEG、GIF、WebP）、PDF、文本文件

## 函数调用（仓库操作）

AI 可以使用以下工具与您的仓库交互：

| 工具 | 描述 |
|------|-------------|
| `read_note` | 读取笔记内容 |
| `create_note` | 创建新笔记 |
| `propose_edit` | 带确认对话框的编辑 |
| `propose_delete` | 带确认对话框的删除 |
| `bulk_propose_edit` | 带选择对话框的批量编辑多个文件 |
| `bulk_propose_delete` | 带选择对话框的批量删除多个文件 |
| `search_notes` | 按名称或内容搜索仓库 |
| `list_notes` | 列出文件夹中的笔记 |
| `rename_note` | 重命名/移动笔记 |
| `create_folder` | 创建新文件夹 |
| `list_folders` | 列出仓库中的文件夹 |
| `get_active_note_info` | 获取当前笔记的信息 |
| `bulk_propose_rename` | 通过选择对话框批量重命名多个文件 |

### Vault 工具模式

当 AI 在聊天中处理笔记时，它会使用 Vault 工具。通过附件按钮下方的数据库图标（📦）控制 AI 可以使用哪些 Vault 工具：

| 模式 | 描述 | 可用工具 |
|------|------|----------|
| **Vault: 全部** | 完全访问 Vault | 所有工具 |
| **Vault: 无搜索** | 排除搜索工具 | 除 `search_notes`、`list_notes` 外的所有工具 |
| **Vault: 关闭** | 无 Vault 访问 | 无 |

**何时使用各模式：**

- **Vault: 全部** - 通用默认模式。AI 可以读取、写入和搜索您的 vault。
- **Vault: 无搜索** - 当您已经知道目标文件时使用。这可以避免多余的 vault 搜索，节省 token 并提高响应速度。
- **Vault: 关闭** - 当您完全不需要访问 vault 时使用。

**自动模式选择：**

| 条件 | 默认模式 | 可更改 |
|------|----------|--------|
| CLI 模型（Antigravity/Claude/Codex CLI） | Vault: 关闭 | 否 |
| 本地 LLM | Vault: 关闭 | 否 |
| Gemma 4 + RAG/Web Search | Vault: 关闭 | 是（禁用 RAG/Web Search 后工具会重新启用） |
| 普通 | Vault: 全部 | 是 |

**为什么某些模式是强制的：**

- **CLI 模型、Ollama、OpenCode (Local)**：不公开 OpenAI 风格的函数调用，因此无法使用 Vault 工具。**LM Studio / vLLM / AnythingLLM** 本地 LLM 在加载的模型支持 tool calling 时**可以**使用 Vault 工具；如果模型拒绝首次 tools 请求，会自动设置标记并在后续轮次回退到标记模式（在 **设置 → Local LLM → Re-enable tools** 中可清除该标记）。
- **Gemma 4**：函数调用和 RAG/Web Search 无法在单个请求中同时使用。当一个启用时，另一个会自动禁用。

**LLM vault 工具文件夹：**

在 **设置 → Workspace → LLM vault tool folders** 中，可以限制 LLM 驱动的 vault 工具能够访问哪些 vault 文件夹。此设置适用于 API 提供商、支持工具的本地 LLM，以及由 LLM 触发的 skill workflow。留空表示允许访问整个 vault。CLI 模型不使用这些 vault 工具，因此不受此设置限制。

## 安全编辑

当 AI 使用 `propose_edit` 时：
1. 确认对话框会显示建议的更改
2. 点击**应用**将更改写入文件
3. 点击**放弃**取消而不修改文件

> 在您确认之前，更改不会被写入。

## 编辑历史

追踪和恢复对笔记所做的更改：

- **自动追踪** - 所有 AI 编辑（聊天、工作流）和手动更改都会被记录
- **文件菜单访问** - 右键点击 markdown 文件可访问：
  - **快照** - 将当前状态保存为快照
  - **历史** - 打开编辑历史模态框


- **命令面板** - 也可通过"Show edit history"命令访问
- **差异视图** - 使用颜色编码的添加/删除准确显示更改内容
- **恢复** - 一键恢复到任何之前的版本
- **复制** - 将历史版本保存为新文件（默认名称：`{filename}_{datetime}.md`）
- **可调整大小的模态框** - 拖动移动，从角落调整大小

**差异显示：**
- `+` 行存在于旧版本中
- `-` 行是在新版本中添加的

**工作原理：**

编辑历史使用基于快照的方法：

1. **快照创建** - 当文件首次打开或被 AI 修改时，其内容的快照会被保存
2. **差异记录** - 当文件被修改时，新内容与快照之间的差异会作为历史条目记录
3. **快照更新** - 每次修改后，快照会更新为新内容
4. **恢复** - 要恢复到之前的版本，从快照反向应用差异

**何时记录历史：**
- AI 聊天编辑（`propose_edit` 工具）
- 工作流笔记修改（`note` 节点）
- 通过命令手动保存
- 打开文件时如果与快照不同则自动检测

**存储：** 编辑历史存储在内存中，Obsidian 重启时会被清除。持久的版本跟踪由 Obsidian 内置的文件恢复功能覆盖。

![编辑历史模态框](docs/images/edit_history.png)

## MCP 服务器

MCP（Model Context Protocol）服务器提供额外的工具，扩展 AI 在 Vault 操作之外的能力。

**支持两种传输模式：**

**HTTP（Streamable HTTP）：**

1. 打开插件设置 → **MCP 服务器**部分
2. 点击**添加服务器** → 选择 **HTTP**
3. 输入服务器名称和 URL
4. 配置可选的认证头信息（JSON 格式）
5. 点击**测试连接**以验证并获取可用工具
6. 保存服务器配置

**Stdio（本地进程）：**

1. 打开插件设置 → **MCP 服务器**部分
2. 点击**添加服务器** → 选择 **Stdio**
3. 输入服务器名称和命令（例如 `npx -y @modelcontextprotocol/server-filesystem /path/to/dir`）
4. 配置可选的环境变量（JSON 格式）
5. 点击**测试连接**以验证并获取可用工具
6. 保存服务器配置

> **注意：** Stdio 传输会启动本地进程，仅限桌面端使用。保存前必须测试连接。

![MCP 服务器设置](docs/images/setting_mcp.png)

**使用 MCP 工具：**

- **在聊天中：** 点击数据库图标（📦）打开工具设置。按对话启用/禁用 MCP 服务器。
- **在工作流中：** 使用 `mcp` 节点调用 MCP 服务器工具。

**工具提示：** 连接测试成功后，可用工具名称会被保存，并在设置和聊天界面中显示以供参考。

### MCP Apps（交互式 UI）

一些 MCP 工具返回交互式 UI，允许您以可视化方式与工具结果进行交互。此功能基于 [MCP Apps 规范](https://github.com/anthropics/anthropic-cookbook/tree/main/misc/mcp_apps)。


**工作原理：**

- 当 MCP 工具在响应元数据中返回 `ui://` 资源 URI 时，插件会获取并渲染 HTML 内容
- UI 在沙盒 iframe 中显示以确保安全（`sandbox="allow-scripts allow-forms"`）
- 交互式应用可以通过 JSON-RPC 桥接调用其他 MCP 工具并更新上下文

**在聊天中：**
- MCP Apps 在助手消息中内联显示，带有展开/折叠按钮
- 点击 ⊕ 展开为全屏，⊖ 折叠

**在工作流中：**
- MCP Apps 在工作流执行期间以模态对话框形式显示
- 工作流会暂停以允许用户交互，然后在关闭模态框后继续

> **安全性：** 所有 MCP App 内容都在具有受限权限的沙盒 iframe 中运行。iframe 无法访问父页面的 DOM、Cookie 或本地存储。仅启用 `allow-scripts` 和 `allow-forms`。

## 代理技能

通过自定义指令、参考资料和可执行工作流扩展 AI 的能力。技能遵循业界标准的代理技能模式（如 [OpenAI Codex](https://github.com/openai/codex) 的 `.codex/skills/`）。

- **自定义指令** - 通过 `SKILL.md` 文件定义特定领域的行为
- **参考资料** - 在 `references/` 中包含风格指南、模板和检查清单
- **工作流集成** - 技能可以将工作流作为 Function Calling 工具公开
- **斜杠命令** - 输入 `/folder-name` 即可立即调用技能并发送
- **CLI 模式支持** - 技能可在 Antigravity CLI、Claude CLI 和 Codex CLI 后端中使用
- **选择性激活** - 按对话选择哪些技能处于活动状态

创建技能的方式与工作流相同 — 选择 **+ New (AI)**，勾选 **"作为代理技能创建"**，然后描述您想要的功能。AI 会同时生成 `SKILL.md` 指令和工作流。

> **有关设置说明和示例，请参阅 [SKILLS.md](docs/SKILLS_zh.md)**

---

# Discord 集成

将 Obsidian 仓库的 LLM 连接到 Discord 作为聊天 bot。用户可以在 Discord 中与 AI 聊天、切换模型、使用 RAG 搜索和激活斜杠命令。

## 设置

### 1. 创建 Discord Bot

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 点击 **New Application** → 输入名称 → **Create**
3. 在左侧边栏点击 **Bot**
4. 点击 **Reset Token** → 复制 bot token（稍后需要使用）
5. 在 **Privileged Gateway Intents** 下启用 **Message Content Intent**（读取消息文本所需）

### 2. 邀请 Bot 到您的服务器

1. 在左侧边栏点击 **OAuth2**
2. 在 **OAuth2 URL Generator** 下选择 **bot** 范围
3. 在 **Bot Permissions** 下选择：
   - **Send Messages**
   - **Read Message History**
4. 复制生成的 URL 并在浏览器中打开
5. 选择服务器并授权 bot

### 3. 在 Obsidian 中配置

1. 打开插件设置 → **Discord** 部分
2. 启用 **Discord Bot**
3. 粘贴 bot token
4. 点击 **Connect**（插件会在连接前验证 token）
5. 状态指示器显示 bot 是否已连接

## 配置选项

| 设置 | 描述 | 默认值 |
|------|------|--------|
| **Enabled** | 开关 Discord bot | 关闭 |
| **Bot Token** | 来自 Developer Portal 的 Discord bot token | — |
| **Respond to DMs** | bot 是否响应私信 | 开启 |
| **Require @mention** | 在服务器频道中仅在被 @提及时响应（DM 始终响应） | 开启 |
| **Allowed Channel IDs** | 逗号分隔的频道 ID 用于限制范围（留空 = 所有频道） | 空 |
| **Allowed User IDs** | 逗号分隔的用户 ID 用于限制范围（留空 = 所有用户） | 空 |
| **Model Override** | 指定 Discord 使用的模型（留空 = 当前选中的模型） | 空 |
| **System Prompt Override** | Discord 对话的自定义系统提示词 | 空 |
| **Max Response Length** | 每条消息的最大字符数（1–2000，Discord 的限制） | 2000 |

> [!TIP]
> **查找频道/用户 ID：** 在 Discord 中启用 **Developer Mode**（设置 → 高级 → Developer Mode）。然后右键点击频道或用户并选择 **Copy ID**。

## Bot 命令

用户可以在 Discord 中使用以下命令与 bot 交互：

| 命令 | 描述 |
|------|------|
| `!model` | 列出可用模型 |
| `!model <name>` | 为此频道切换到指定模型 |
| `!rag` | 列出可用的 RAG 设置 |
| `!rag <name>` | 为此频道切换到指定 RAG 设置 |
| `!rag off` | 为此频道禁用 RAG |
| `!skill` | 列出可用的斜杠命令 |
| `!skill <name>` | 激活斜杠命令（可能需要后续消息） |
| `!discuss <theme>` | 使用已配置的参与者启动 AI Discussion（后台运行） |
| `!reset` | 清除此频道的对话历史 |
| `!help` | 显示帮助信息 |

## 功能

- **多提供商支持** — 兼容所有已配置的 LLM 提供商（Gemini、OpenAI、Anthropic、OpenRouter、Grok、CLI、本地 LLM）
- **按频道状态** — 每个 Discord 频道维护各自的对话历史、模型选择和 RAG 设置
- **Vault 工具** — AI 可根据您的插件设置读取、写入和搜索笔记，并遵循 Workspace LLM vault 工具文件夹限制
- **RAG 集成** — 可通过 `!rag` 命令按频道启用语义搜索
- **斜杠命令** — 通过 `!skill` 激活插件斜杠命令
- **长消息分割** — 超过 Discord 2000 字符限制的响应会在自然断点处自动分割
- **对话记忆** — 按频道的历史记录（最多 20 条消息，30 分钟 TTL）
- **自动重连** — 使用指数退避策略从连接中断中恢复

> [!NOTE]
> 对话历史仅保存在内存中，当 bot 断开连接或 Obsidian 重启时会被清除。

---

# 工作流构建器

直接在 Markdown 文件中构建自动化多步骤工作流。**无需编程知识** - 只需用自然语言描述您想要的内容，AI 就会为您创建工作流。

![可视化工作流编辑器](docs/images/visual_workflow.png)

## AI 驱动的工作流和技能创建

**您不需要学习 YAML 语法或节点类型。** 只需用自然语言描述您的工作流：

1. 在 插件侧边栏中打开**工作流**标签
2. 从下拉菜单中选择 **+ New (AI)**
3. 描述您想要的内容：*"创建一个工作流，总结选中的笔记并保存到 summaries 文件夹"*
4. 如果要创建代理技能而非独立工作流，请勾选 **"作为代理技能创建"**
5. 点击**生成** - AI 会创建完整的工作流

![使用 AI 创建工作流](docs/images/create_workflow_with_ai.png)

**以同样的方式修改现有工作流：**
1. 加载任意工作流
2. 点击 **AI Modify** 按钮
3. 描述更改：*"添加一个步骤将摘要翻译成日语"*
4. 查看并应用


## 可用节点类型

24 种节点类型可用于构建工作流：

| 类别 | 节点 |
|----------|-------|
| 变量 | `variable`, `set` |
| 控制 | `if`, `while` |
| LLM | `command` |
| 数据 | `http`, `json`, `script` |
| 笔记 | `note`, `note-read`, `note-search`, `note-list`, `folder-list`, `open` |
| 文件 | `file-explorer`, `file-save` |
| 提示 | `prompt-file`, `prompt-selection`, `dialog` |
| 组合 | `workflow` |
| 外部 | `mcp`, `obsidian-command` |
| 实用工具 | `sleep` |

> **详细的节点规范和示例，请参阅 [WORKFLOW_NODES.md](docs/WORKFLOW_NODES_zh.md)**

## 快捷键模式

分配键盘快捷键以即时运行工作流：

1. 在工作流中添加 `name:` 字段
2. 打开工作流文件并从下拉菜单中选择工作流
3. 点击工作流面板页脚中的键盘图标（⌨️）
4. 前往设置 → 快捷键 → 搜索"Workflow: [您的工作流名称]"
5. 分配快捷键（例如 `Ctrl+Shift+T`）

通过快捷键触发时：
- `prompt-file` 自动使用当前文件（无对话框）
- `prompt-selection` 使用当前选择，如果没有选择则使用完整文件内容

## 事件触发器

工作流可以由 Obsidian 事件自动触发：

![事件触发器设置](docs/images/event_setting.png)

| 事件 | 描述 |
|-------|-------------|
| File Created | 创建新文件时触发 |
| File Modified | 保存文件时触发（5秒防抖） |
| File Deleted | 删除文件时触发 |
| File Renamed | 重命名文件时触发 |
| File Opened | 打开文件时触发 |

**事件触发器设置：**
1. 在工作流中添加 `name:` 字段
2. 打开工作流文件并从下拉菜单中选择工作流
3. 点击工作流面板页脚中的闪电图标（⚡）
4. 选择哪些事件应触发工作流
5. 可选择添加文件模式过滤器

**文件模式示例：**
- `**/*.md` - 任意文件夹中的所有 Markdown 文件
- `journal/*.md` - 仅 journal 文件夹中的 Markdown 文件
- `*.md` - 仅根文件夹中的 Markdown 文件
- `**/{daily,weekly}/*.md` - daily 或 weekly 文件夹中的文件
- `projects/[a-z]*.md` - 以小写字母开头的文件

**事件变量：** 当由事件触发时，以下变量会自动设置：

| 变量 | 描述 |
|----------|-------------|
| `_eventType` | 事件类型：`create`、`modify`、`delete`、`rename`、`file-open` |
| `_eventFilePath` | 受影响文件的路径 |
| `_eventFile` | 包含文件信息的 JSON（path、basename、name、extension） |
| `_eventFileContent` | 文件内容（用于 create/modify/file-open 事件） |
| `_eventOldPath` | 之前的路径（仅用于 rename 事件） |

> **注意：** `prompt-file` 和 `prompt-selection` 节点在由事件触发时会自动使用事件文件。`prompt-selection` 使用整个文件内容作为选择。

---

# 通用设置

## 支持的模型

### Gemini

| 模型 | 描述 |
|-------|-------------|
| Gemini 3.1 Pro Preview | 最新旗舰模型，1M 上下文（推荐） |
| Gemini 3.1 Pro Preview (Custom Tools) | 针对自定义工具和 bash 的代理工作流优化 |
| Gemini 3.5 Flash | 快速模型，1M 上下文，最佳性价比 |
| Gemini 3.1 Flash Lite | 最具成本效益的高性能模型 |
| Gemini 2.5 Flash | 快速模型，1M 上下文 |
| Gemini 2.5 Pro | Pro 模型，1M 上下文 |
| Gemini 3 Pro (Image) | Pro 图像生成，4K |
| Gemini 3.1 Flash (Image) | 快速、低成本图像生成 |
| Gemma 4 | 免费，函数调用和 RAG/Web Search 互斥 |

> **Thinking 模式：** 对于支持的聊天模型，请使用 **Always Think** 开关。**Gemini 3.1 Pro** 始终使用 Thinking 模式，无法关闭。

**Always Think 开关：**

点击数据库图标（📦）打开工具菜单，在 **Always Think** 下勾选对应的开关：

- **Flash** — 默认关闭。勾选后，Flash 模型将始终启用 Thinking。
- **Flash Lite** — 默认开启。启用 Thinking 后，Flash Lite 的成本和速度几乎没有差异，建议保持开启。

开关处于开启状态时，无论消息内容如何，该模型系列都将始终启用 Thinking。关闭时，将使用现有的基于关键词的检测机制。

![Always Think Settings](docs/images/setting_thinking.png)

### OpenAI

| 模型 | 描述 |
|-------|-------------|
| GPT-5.4 | 最新旗舰模型 |
| GPT-5.4-mini | 高性价比中端模型 |
| GPT-5.4-nano | 轻量级、快速模型 |
| O3 | 推理模型 |
| DALL-E 3 / DALL-E 2 | 图像生成 |

### Anthropic

| 模型 | 描述 |
|-------|-------------|
| Claude Opus 4.6 | 最强大模型，扩展思考 |
| Claude Sonnet 4.6 | 性能与成本平衡 |
| Claude Haiku 4.5 | 快速、轻量级模型 |

### OpenRouter / Grok / 自定义

使用自定义 Base URL 和模型配置任何 OpenAI 兼容端点。OpenRouter 提供来自各种提供商的数百个模型。

### OpenCode Zen / Go

OpenCode 通过同一账户提供两种托管网关，均可在提供商下拉菜单中选择：

- **OpenCode Zen** (`https://opencode.ai/zen`) — 按使用量付费，包含多个免费模型（Big Pickle、MiniMax M2.5 Free 等）和广泛的模型目录（Claude、GPT-5.x 等）。公开 OpenAI 兼容的 `/v1/models` + `/v1/chat/completions`，因此模型会自动列出。
- **OpenCode Go** (`https://opencode.ai/zen/go`) — 首月 $5，之后每月 $10 的订阅，提供精选编程模型（GLM、Kimi、DeepSeek、MiMo、MiniMax、Qwen）。仅公开 `/v1/chat/completions`，因此插件在 Verify 时回退到内置模型列表。

### 本地 LLM

通过 Ollama、LM Studio、vLLM、AnythingLLM 或 OpenCode 本地服务器连接本地运行的模型。模型会从运行的服务器自动检测。

## 安装

### BRAT（推荐）
1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件
2. 打开 BRAT 设置 → "Add Beta plugin"
3. 输入：`https://github.com/takeshy/obsidian-llm-hub`
4. 在社区插件设置中启用该插件

### 手动安装
1. 从 releases 下载 `main.js`、`manifest.json`、`styles.css`
2. 在 `.obsidian/plugins/` 中创建 `llm-hub` 文件夹
3. 复制文件并在 Obsidian 设置中启用

### 从源码构建
```bash
git clone https://github.com/takeshy/obsidian-llm-hub
cd obsidian-llm-hub
npm install
npm run build
```

## 配置

### API 提供商

在插件设置中添加一个或多个 API 提供商。每个提供商拥有独立的 API 密钥和模型选择。

| 提供商 | 获取 API 密钥 |
|--------|---------------|
| Gemini | [ai.google.dev](https://ai.google.dev) |
| OpenAI | [platform.openai.com](https://platform.openai.com) |
| Anthropic | [console.anthropic.com](https://console.anthropic.com) |
| OpenRouter | [openrouter.ai](https://openrouter.ai) |
| Grok | [console.x.ai](https://console.x.ai) |
| OpenCode Zen | [opencode.ai](https://opencode.ai) |
| OpenCode Go | [opencode.ai](https://opencode.ai) |

您也可以添加自定义的 OpenAI 兼容端点。

![基础设置](docs/images/setting_basic.png)

### 本地 LLM

连接本地运行的 LLM 服务器：

1. 启动您的本地服务器（Ollama、LM Studio、vLLM、AnythingLLM 或 OpenCode）
2. 在插件设置中输入服务器 URL
3. 点击"Verify"以检测可用模型

> [!NOTE]
> **LM Studio / vLLM / AnythingLLM** 本地 LLM 对 vault 工具使用 OpenAI 风格的函数调用 — 在支持 tools 的模型上默认启用。如果模型拒绝首次 tools 请求，会自动设置标记并在后续轮次降级到基于标记的 skill 模式；在 **设置 → Local LLM → Re-enable tools** 中清除标记可重试。
>
> 这些工具遵循 **设置 → Workspace → LLM vault tool folders**，也就是 API 提供商和 LLM 触发的 skill workflow 使用的同一文件夹限制。
>
> **Ollama** 和 **OpenCode (Local)** 仍仅使用标记模式。请对这些框架使用工作流或 RAG 进行笔记操作。

#### OpenCode 本地服务器

OpenCode 框架连接到本地的 `opencode serve` 实例，该实例公开自己的 HTTP API，而不是 OpenAI 兼容的 `/v1/chat/completions` 形式。流式传输使用服务器的 `/global/event` SSE 端点。

##### macOS / Linux

1. 安装 OpenCode CLI：
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   ```
2. 启动服务器：
   ```bash
   opencode serve
   ```
   默认监听 `http://localhost:4096`。
3. 在插件设置 → **本地 LLM** 中选择 **OpenCode (Local)**，保持默认 URL（`http://localhost:4096`），然后点击 **Fetch models**。
4. 模型以 `<providerID>/<modelID>` 格式列出（例如 `google/gemini-flash-lite-latest`）。选择一个并保存。

##### Windows (WSL)

OpenCode 在 Windows 上[推荐使用 WSL](https://opencode.ai/docs/ja/windows-wsl)，以获得文件系统性能和工具兼容性。由于 Obsidian 在 Windows 主机上运行，服务器必须绑定到可访问的接口，并且 — 因为它会从 WSL 外部可访问 — **必须用密码保护**。

1. 安装 WSL（Microsoft [官方指南](https://learn.microsoft.com/windows/wsl/install)），打开 WSL 终端。
2. 在 WSL 内安装 OpenCode：
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   ```
3. 使用密码并绑定到所有接口启动服务器：
   ```bash
   OPENCODE_SERVER_PASSWORD='your-password' opencode serve --hostname 0.0.0.0 --port 4096
   ```
   WSL2 会自动将 `localhost` 转发到 Windows 主机，因此从 Obsidian 中 URL 是 `http://localhost:4096`。如果无法解析，请在 WSL 中运行 `hostname -I` 并改用 `http://<wsl-ip>:4096`。
4. 在插件设置 → **本地 LLM** → **OpenCode (Local)**：
   - **Base URL**：`http://localhost:4096`（或 WSL 的 IP）
   - **Username**：`opencode`（默认值；如设置了 `OPENCODE_SERVER_USERNAME` 则使用该值）
   - **Password**：`OPENCODE_SERVER_PASSWORD` 设置的值

   点击 **Fetch models**，选择一个 `<providerID>/<modelID>` 格式的模型并保存。

### CLI 模式（Antigravity / Claude / Codex）

**Antigravity CLI：**
1. 安装 [Antigravity CLI](https://antigravity.google)
2. 使用 `agy`
3. 在 Antigravity CLI 部分点击"Verify"

**Claude CLI：**
1. 安装 [Claude Code](https://github.com/anthropics/claude-code)：`npm install -g @anthropic-ai/claude-code`
2. 使用 `claude` 进行身份验证
3. 在 Claude CLI 部分点击"Verify"

**Codex CLI：**
1. 安装 [Codex CLI](https://github.com/openai/codex)：`npm install -g @openai/codex`
2. 使用 `codex` 进行身份验证
3. 在 Codex CLI 部分点击"Verify"

**CLI 限制：** 不支持 Vault 工具，不支持网页搜索，仅限桌面端

> [!NOTE]
> **仅使用 CLI：** 您可以在没有任何 API 密钥的情况下使用 CLI 模式。只需安装并验证 CLI 工具即可。

**自定义 CLI 路径：** 如果 CLI 自动检测失败，点击 Verify 按钮旁边的齿轮图标（⚙️）手动指定 CLI 路径。插件会自动搜索常见安装路径，包括版本管理器（nodenv、nvm、volta、fnm、asdf、mise）。

<details>
<summary><b>Windows：如何查找 CLI 路径</b></summary>

Leave the CLI path empty and click **Verify** — the plugin looks for `agy` on PATH. Claude's standalone installer at `%LOCALAPPDATA%\Programs\claude\claude.exe` is also picked up automatically.

仅在自动检测失败时才设置自定义 CLI 路径。以下任一方式均可（按安全性从高到低）：

1. **`.exe` executable** — e.g. `C:\Users\YourName\AppData\Local\Programs\Antigravity\agy.exe`. Runs directly.
2. **`.exe` 可执行文件** — 如 `C:\Users\YourName\AppData\Local\Programs\claude\claude.exe`。直接运行。
3. **`.cmd` / `.bat` 包装脚本** — 如 `C:\Users\YourName\AppData\Roaming\npm\agy.cmd`。必须经过 `cmd.exe`，提示词中的 `&`、`|`、`>`、`^`、`%VAR%` 等可能导致异常。

在 PowerShell 中运行 `Get-Command agy` / `Get-Command claude` / `Get-Command codex` 可查看包装脚本路径；可直接填入（方式 3），或定位到相邻的 `.js` / `.exe` 以获得更安全的方式。
</details>

<details>
<summary><b>macOS / Linux：如何查找 CLI 路径</b></summary>

1. 打开终端并运行：
   ```bash
   which agy
   ```
2. 将显示的路径（例如：`/home/user/.local/bin/agy`）输入到 CLI 路径设置中

对于 Claude CLI，使用 `which claude`。对于 Codex CLI，使用 `which codex`。

**Node.js 版本管理器：** 如果您使用 nodenv、nvm、volta、fnm、asdf 或 mise，插件会自动从常见位置检测 node 二进制文件。如果检测失败，请直接指定 CLI 脚本路径（例如：`~/.local/bin/agy`）。
</details>

> [!TIP]
> **Claude CLI 技巧：** 来自 LLM Hub 的聊天会话会本地存储。您可以在 Obsidian 之外继续对话，方法是在您的仓库目录中运行 `claude --resume` 来查看和恢复之前的会话。

### 工作区设置
- **工作区文件夹** - 聊天历史和设置存储位置
- **系统提示词** - 额外的 AI 指令
- **工具限制** - 控制函数调用限制
- **编辑历史** - 追踪和恢复 AI 所做的更改

![工具限制和编辑历史](docs/images/setting_tool_history.png)

### 加密

分别使用密码保护您的聊天历史和工作流执行日志。

**设置步骤：**

1. 在插件设置中设置密码（使用公钥加密安全存储）

![加密初始设置](docs/images/setting_initial_encryption.png)

2. 设置后，为每种日志类型切换加密：
   - **加密 AI 聊天历史** - 加密聊天对话文件
   - **加密工作流执行日志** - 加密工作流历史文件

![加密设置](docs/images/setting_encryption.png)

每个设置可以独立启用/禁用。

**功能：**
- **独立控制** - 选择要加密的日志（聊天、工作流或两者）
- **自动加密** - 根据设置，新文件在保存时加密
- **密码缓存** - 每个会话只需输入一次密码
- **专用查看器** - 加密文件在带预览的安全编辑器中打开
- **解密选项** - 需要时可从单个文件移除加密

**工作原理：**

```
【设置 - 设置密码时仅一次】
密码 → 生成密钥对（RSA） → 加密私钥 → 存储在设置中

【加密 - 每个文件】
文件内容 → 用新 AES 密钥加密 → 用公钥加密 AES 密钥
→ 保存到文件：加密数据 + 加密私钥（从设置复制） + salt

【解密】
密码 + salt → 恢复私钥 → 解密 AES 密钥 → 解密文件内容
```

- 密钥对只生成一次（RSA 生成较慢），AES 密钥为每个文件生成
- 每个文件存储：加密内容 + 加密私钥（从设置复制） + salt
- 文件是自包含的 — 仅需密码即可解密，无需插件依赖

<details>
<summary>Python 解密脚本（点击展开）</summary>

```python
#!/usr/bin/env python3
"""无需插件解密 LLM Hub 加密文件"""
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
        raise ValueError("无效的加密文件格式")

    frontmatter, encrypted_data = match.groups()
    key_match = re.search(r'key:\s*(.+)', frontmatter)
    salt_match = re.search(r'salt:\s*(.+)', frontmatter)
    if not key_match or not salt_match:
        raise ValueError("frontmatter 中缺少 key 或 salt")

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
        print(f"用法: {sys.argv[0]} <加密文件>")
        sys.exit(1)
    password = getpass.getpass("密码: ")
    print(decrypt_file(sys.argv[1], password))
```

需要: `pip install cryptography`

</details>

> **警告：** 如果您忘记密码，加密文件将无法恢复。请妥善保管您的密码。

> **提示：** 要一次性加密目录中的所有文件，请使用工作流。参见 [WORKFLOW_NODES_zh.md](docs/WORKFLOW_NODES_zh.md#obsidian-command) 中的"加密目录中的所有文件"示例。

![文件加密工作流](docs/images/enc.png)

**安全优势：**
- **受 AI 聊天保护** - 加密文件无法被 AI 仓库操作（`read_note` 工具）读取。这可以保护 API 密钥等敏感数据在聊天过程中不会意外泄露。
- **工作流通过密码访问** - 工作流可以使用 `note-read` 节点读取加密文件。访问时会弹出密码对话框，密码会在会话期间缓存。
- **安全存储机密** - 无需在工作流中直接写入 API 密钥，而是将其存储在加密文件中。工作流在密码验证后运行时读取密钥。

### 语义搜索（RAG）

基于本地向量的搜索，将 Vault 中的相关内容注入 LLM 对话。无需外部 RAG 服务器 — Embedding 在本地生成和存储。

**设置步骤：**

1. 前往设置 → RAG 部分
2. 创建新的 RAG 设置（点击 `+`）
3. 配置 Embedding：
   - **默认（Gemini）：** 将 Embedding Base URL 留空 — 使用 Gemini Embedding API 和您的 Gemini API 密钥
   - **自定义服务器（Ollama 等）：** 设置 Embedding Base URL 并选择模型
4. 点击 **Sync** 从 Vault 构建向量索引
5. 在下拉菜单中选择 RAG 设置以激活

| 设置 | 描述 | 默认值 |
|------|------|--------|
| **Embedding Base URL** | 自定义 Embedding 服务器 URL（空 = Gemini API） | 空 |
| **Embedding API Key** | 自定义服务器的 API 密钥（空 = Gemini 密钥） | 空 |
| **Embedding Model** | 用于生成 Embedding 的模型名称 | `gemini-embedding-2-preview` |
| **Chunk Size** | 每个分块的字符数 | 500 |
| **Chunk Overlap** | 分块之间的重叠字符数 | 100 |
| **PDF分块页数** | 每个嵌入分块的PDF页数（1–6） | 6 |
| **Top K** | 每次查询检索的最大分块数 | 5 |
| **Score Threshold** | 结果中包含的最低相似度分数（0.0–1.0） | 0.5 |
| **Target Folders** | 限制索引到特定文件夹（空 = 全部） | 空 |
| **Exclude Patterns** | 排除文件的正则表达式模式 | 空 |

> **多模态索引**（图像、PDF、音频、视频）在使用 Gemini 原生 Embedding 模型（`gemini-embedding-*`）时自动启用。无需手动配置。

**外部索引：**

使用预构建的索引代替从 Vault 同步：

1. 启用**使用外部索引**开关
2. 设置包含 `index.json` 和 `vectors.bin` 的目录的绝对路径
3. 可选设置 Embedding Base URL 用于查询 Embedding（空 = Gemini API）
4. Embedding 模型从索引文件中自动检测

**工作原理：** 当 RAG 处于活动状态时，每条聊天消息都会触发本地向量搜索。相关分块会作为上下文注入系统提示词。来源显示在聊天界面中 — 点击可打开引用的笔记。

### RAG 搜索标签页

**RAG Search** 标签页提供了一个专用界面，用于搜索、筛选、编辑 RAG 结果，以及将结果发送到 Chat 或 Discussion。

![RAG Search](docs/images/rag-search.png)

- **语义搜索** — 可调整 Top K 和分数阈值
- **关键词筛选** — 在搜索后进一步缩小结果范围
- **分块编辑器** — 支持加载相邻分块（上一个/下一个）和去除重叠
- **发送到 Chat 或 Discussion** — 选中的结果将作为可编辑的附件添加
- **索引设置**（齿轮图标）— 配置分块大小、重叠、目标文件夹、同步等

> 详细信息请参阅 [RAG Search 文档](docs/RAG_SEARCH.md)（[日本語](docs/RAG_SEARCH_ja.md) | [中文](docs/RAG_SEARCH_zh.md) | [한국어](docs/RAG_SEARCH_ko.md) | [Français](docs/RAG_SEARCH_fr.md) | [Deutsch](docs/RAG_SEARCH_de.md) | [Español](docs/RAG_SEARCH_es.md) | [Português](docs/RAG_SEARCH_pt.md) | [Italiano](docs/RAG_SEARCH_it.md)）

### AI Discussion

**Discussion** 标签页提供了一个多模型辩论竞技场，多个 AI 模型可以并行讨论某个话题、得出结论并投票选出最佳答案。

![AI Discussion](docs/images/ai-discussion.png)

**使用方法：**

1. 打开 **Discussion** 标签页
2. 输入讨论主题
3. 添加参与者 — 选择任何可用的模型（API、CLI、Local LLM）或 User
4. 可选地为参与者分配角色（例如"正方"、"批判方"）
5. 设置轮数
6. 点击 **Start Discussion**

![Discussion Setup](docs/images/ai-discussion-start.png)

**讨论流程：**

1. **讨论轮次** — 所有参与者并行回复。每轮都基于之前的回复进行讨论。
2. **结论** — 在最后一轮中，每位参与者给出自己的结论。
3. **投票** — 投票参与者评估所有结论并为最佳结论投票。
4. **结果** — 公布获胜者（或平局）。可将完整记录保存为 Markdown 笔记。

![Voting Results](docs/images/ai-discussion-voting.png)

**功能特点：**

- **任何模型均可作为参与者** — 自由组合模型（例如 Gemini vs Claude vs GPT）
- **用户参与** — 将自己添加为参与者或投票者，实现人机协同讨论
- **角色分配** — 为每位参与者指定一个视角（例如"乐观主义者"、"怀疑论者"）
- **独立的投票参与者** — 投票参与者从讨论参与者自动同步，但可以独立自定义
- **持久化配置** — 参与者和投票者在会话之间保存和恢复
- **设置弹窗** — 点击齿轮图标（⚙️）配置系统提示词、结论提示词、投票提示词、输出文件夹和默认轮数
- **保存为笔记** — 将完整讨论（轮次、结论、投票、获胜者）导出为 Markdown 文件

### 斜杠命令
- 定义通过 `/` 触发的自定义提示词模板
- 可为每个命令单独设置模型和搜索

![斜杠命令](docs/images/setting_slash_command.png)

## 系统要求

- Obsidian v0.15.0+
- 至少具备以下之一：API 密钥（Gemini、OpenAI、Anthropic、OpenRouter、Grok）、本地 LLM 服务器或 CLI 工具
- 仅限桌面端（移动端请参阅 [Gemini Helper](https://github.com/takeshy/obsidian-gemini-helper)）

## 隐私

**本地存储的数据：**
- API 密钥（存储在 Obsidian 设置中）
- 聊天历史（Markdown 文件，可选加密）
- 工作流执行历史（可选加密）
- RAG 向量索引（存储在工作区文件夹中）
- 加密密钥（私钥使用您的密码加密）

**发送到 LLM 提供商的数据：**
- 聊天消息和文件附件会发送到已配置的 API 提供商（Gemini、OpenAI、Anthropic、OpenRouter、Grok 或自定义端点）
- 启用网页搜索时（仅 Gemini），查询会发送到 Google 搜索
- 本地 LLM 提供商仅将数据发送到您的本地服务器

**发送到第三方服务的数据：**
- 工作流 `http` 节点可以向工作流中指定的任何 URL 发送数据

**CLI 提供程序（可选）：**
- 启用 CLI 模式时，外部 CLI 工具（agy、claude、codex）通过 child_process 执行
- 仅在用户明确配置和验证时才会发生
- CLI 模式通过 child_process 执行外部 CLI 工具

**Discord bot（可选）：**
- 启用后，插件通过 WebSocket Gateway 连接到 Discord，并将用户消息发送到已配置的 LLM 提供商
- Bot token 存储在 Obsidian 设置中
- 来自 Discord 频道的消息内容由 LLM 处理 — 配置允许的频道/用户以限制访问

**MCP 服务器（可选）：**
- MCP（模型上下文协议）服务器可以在插件设置中为工作流 `mcp` 节点配置
- MCP 服务器是提供额外工具和功能的外部服务

**安全注意事项：**
- 运行前请审查工作流 - `http` 节点可以将仓库数据传输到外部端点
- 工作流 `note` 节点在写入文件前会显示确认对话框（默认行为）
- 设置 `confirmEdits: false` 的斜杠命令将自动应用文件编辑，不显示应用/放弃按钮
- 敏感凭据：不要将 API 密钥或令牌直接存储在工作流 YAML 中（`http` 头、`mcp` 设置等）。请将它们存储在加密文件中，并使用 `note-read` 节点在运行时获取。工作流可以通过密码提示读取加密文件。

有关数据保留政策，请参阅各提供商的服务条款。

## 许可证

MIT

## 链接

- [Gemini API 文档](https://ai.google.dev/docs)
- [OpenAI API 文档](https://platform.openai.com/docs)
- [Anthropic API 文档](https://docs.anthropic.com)
- [OpenRouter 文档](https://openrouter.ai/docs)
- [Ollama](https://ollama.com)
- [Obsidian 插件文档](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## 支持

如果您觉得这个插件有用，请考虑请我喝杯咖啡！

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/takeshy)
