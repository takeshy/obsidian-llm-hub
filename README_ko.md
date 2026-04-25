# LLM Hub for Obsidian

[![DeepWiki](https://img.shields.io/badge/DeepWiki-takeshy%2Fobsidian--llm--hub-blue.svg?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTQgMTloMTZhMiAyIDAgMCAwIDItMlY3YTIgMiAwIDAgMC0yLTJINWEyIDIgMCAwIDAtMiAydjEyYTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTkgMTV2LTQiLz48cGF0aCBkPSJNMTIgMTV2LTIiLz48cGF0aCBkPSJNMTUgMTV2LTQiLz48L3N2Zz4=)](https://deepwiki.com/takeshy/obsidian-llm-hub)

**무료 오픈소스** Obsidian AI 어시스턴트로 **Chat**, **Workflow 자동화**, **Semantic Search (RAG)** 기능을 제공합니다. 여러 LLM 프로바이더를 지원하여 필요에 맞는 AI를 자유롭게 사용할 수 있습니다.

> **모든 LLM 프로바이더 사용 가능:** [Gemini](https://ai.google.dev), [OpenAI](https://platform.openai.com), [Anthropic](https://console.anthropic.com), [OpenRouter](https://openrouter.ai), [Grok](https://console.x.ai), [OpenCode Zen / Go](https://opencode.ai), 로컬 LLM ([Ollama](https://ollama.com), [LM Studio](https://lmstudio.ai), [vLLM](https://docs.vllm.ai), [OpenCode](https://opencode.ai)), CLI 도구 ([Gemini CLI](https://github.com/google-gemini/gemini-cli), [Claude Code](https://github.com/anthropics/claude-code), [Codex CLI](https://github.com/openai/codex)).

## 주요 기능

- **멀티 프로바이더 LLM Chat** - Gemini, OpenAI, Anthropic, OpenRouter, Grok, OpenCode Zen/Go, 로컬 LLM 또는 CLI 백엔드 사용
- **Vault 작업** - AI가 Function Calling으로 노트를 읽고, 쓰고, 검색하고, 편집 (Gemini, OpenAI, Anthropic, OpenCode Zen/Go, 그리고 LM Studio / vLLM / AnythingLLM을 통한 도구 지원 로컬 LLM)
- **Workflow Builder** - 비주얼 노드 편집기와 25개 노드 유형으로 다단계 작업 자동화
- **Semantic Search (RAG)** - 전용 검색 탭, PDF 미리보기, 검색 결과에서 Chat으로의 연동을 갖춘 로컬 벡터 검색
- **AI Discussion** - 병렬 응답, 투표, 우승자 결정이 가능한 멀티 모델 토론 아레나
- **Edit History** - AI가 만든 변경 사항을 diff 뷰로 추적하고 복원
- **Web Search** - Google Search를 통한 최신 정보 접근 (Gemini)
- **Image Generation** - Gemini 또는 DALL-E로 이미지 생성
- **Discord Integration** - LLM을 Discord bot으로 연결하여 채널별 모델/RAG 전환 가능
- **암호화** - 채팅 기록 및 워크플로우 실행 로그를 비밀번호로 보호


## 지원 프로바이더

| 프로바이더 | Chat | Vault 도구 | Web Search | Image Gen | RAG |
|----------|------|-------------|------------|-----------|-----|
| **Gemini** (API) | ✅ Streaming | ✅ Function calling | ✅ Google Search | ✅ Gemini Image models | ✅ |
| **OpenAI** (API) | ✅ Streaming | ✅ Function calling | ❌ | ✅ DALL-E | ✅ |
| **Anthropic** (API) | ✅ Streaming | ✅ Tool use | ❌ | ❌ | ✅ |
| **OpenRouter** (API) | ✅ Streaming | ✅ Function calling | ❌ | ❌ | ✅ |
| **Grok** (API) | ✅ Streaming | ✅ Function calling | ❌ | ❌ | ✅ |
| **로컬 LLM** (Ollama, LM Studio, vLLM) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |
| **CLI** (Gemini, Claude, Codex) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |

> [!TIP]
> **여러 프로바이더를 동시에 설정할 수 있습니다.** 채팅 중 자유롭게 모델을 전환할 수 있으며, 각 프로바이더는 자체 API 키와 설정을 가집니다.

> [!TIP]
> **CLI 옵션**을 사용하면 계정만으로 플래그십 모델을 사용할 수 있습니다 - API 키가 필요 없습니다!
> - **Gemini CLI**: [Gemini CLI](https://github.com/google-gemini/gemini-cli) 설치 후, `gemini` 실행하고 `/auth`로 인증
> - **Claude CLI**: [Claude Code](https://github.com/anthropics/claude-code) 설치 (`npm install -g @anthropic-ai/claude-code`), `claude` 실행 후 인증
> - **Codex CLI**: [Codex CLI](https://github.com/openai/codex) 설치 (`npm install -g @openai/codex`), `codex` 실행 후 인증

### Gemini 무료 API 키 팁

- **Rate limit**은 모델별로 적용되며 매일 초기화됩니다. 모델을 전환하여 계속 작업할 수 있습니다.
- **Gemma 4**는 Function Calling과 RAG/Web Search를 단일 요청에서 결합할 수 없습니다. RAG 또는 Web Search가 활성화되면 Vault 도구가 자동으로 비활성화됩니다. **CLI 모델**, **Ollama**, **OpenCode (Local)** 은 Vault 도구를 지원하지 않으므로 노트 작업에는 **Workflow** (`note`, `note-read` 등) 또는 `{content}` / `{selection}` 변수를 사용하세요. **LM Studio / vLLM / AnythingLLM** 로컬 LLM은 모델이 OpenAI 형식의 Function Calling을 지원하면 Vault 도구를 사용할 수 있습니다 — 호환되지 않는 모델은 첫 사용 시 자동 감지되어 마커 기반 스킬 모드로 폴백됩니다.

---

# AI Chat

AI Chat 기능은 Obsidian vault와 통합된 선택한 LLM 프로바이더와의 대화형 인터페이스를 제공합니다.

![Chat Interface](docs/images/chat.png)

**채팅 열기:**
- 리본에서 채팅 아이콘 클릭
- 명령어: "LLM Hub: Open chat"
- 토글: "LLM Hub: Toggle chat / editor"

**채팅 컨트롤:**
- **Enter** - 메시지 전송
- **Shift+Enter** - 새 줄
- **Stop 버튼** - 생성 중지
- **+ 버튼** - 새 채팅
- **History 버튼** - 이전 채팅 불러오기

## 슬래시 명령어

`/`로 시작하는 재사용 가능한 프롬프트 템플릿을 만들 수 있습니다:

- `{selection}` (선택된 텍스트) 및 `{content}` (활성 노트)로 템플릿 정의
- 명령어별로 모델 및 검색 설정 재정의 가능
- `/`를 입력하면 사용 가능한 명령어 목록 표시

**기본 제공:** `/infographic` - 콘텐츠를 HTML 인포그래픽으로 변환

![Infographic Example](docs/images/chat_infographic.png)

## @ 멘션

`@`를 입력하여 파일과 변수를 참조할 수 있습니다:

- `{selection}` - 선택된 텍스트
- `{content}` - 활성 노트 내용
- 모든 vault 파일 - 탐색 및 삽입 (경로만 삽입; AI가 도구를 통해 내용 읽기)

> [!NOTE]
> **`{selection}`과 `{content}` 작동 방식:** Markdown View에서 Chat View로 전환할 때, 포커스 변경으로 인해 선택이 해제됩니다. 선택을 유지하기 위해 플러그인은 뷰 전환 시 선택 내용을 캡처하고 Markdown View에서 선택된 영역을 배경색으로 강조 표시합니다. `{selection}` 옵션은 텍스트가 선택된 경우에만 @ 제안에 표시됩니다.
>
> `{selection}`과 `{content}` 모두 입력 영역에서는 의도적으로 **확장되지 않습니다**—채팅 입력창이 좁기 때문에 긴 텍스트를 확장하면 입력이 어려워집니다. 메시지를 보낼 때 내용이 확장되며, 채팅에서 보낸 메시지를 확인하면 이를 확인할 수 있습니다.

> [!NOTE]
> Vault 파일 @멘션은 파일 경로만 삽입하며 AI가 도구를 통해 내용을 읽습니다. CLI 모델, Ollama, OpenCode (Local) 에서는 작동하지 않습니다(vault 도구 미지원). Gemini CLI는 셸을 통해 파일을 읽을 수 있지만, 응답 형식이 다를 수 있습니다. **LM Studio / vLLM / AnythingLLM** 로컬 LLM은 로드된 모델이 tool calling을 지원하면 작동합니다.

## 파일 첨부

파일을 직접 첨부할 수 있습니다: 이미지(PNG, JPEG, GIF, WebP), PDF, 텍스트 파일

## Function Calling (Vault 작업)

AI는 다음 도구를 사용하여 vault와 상호작용할 수 있습니다:

| 도구 | 설명 |
|------|-------------|
| `read_note` | 노트 내용 읽기 |
| `create_note` | 새 노트 생성 |
| `propose_edit` | 확인 대화상자와 함께 편집 |
| `propose_delete` | 확인 대화상자와 함께 삭제 |
| `bulk_propose_edit` | 선택 대화상자로 여러 파일 일괄 편집 |
| `bulk_propose_delete` | 선택 대화상자로 여러 파일 일괄 삭제 |
| `search_notes` | 이름 또는 내용으로 vault 검색 |
| `list_notes` | 폴더 내 노트 목록 |
| `rename_note` | 노트 이름 변경/이동 |
| `create_folder` | 새 폴더 생성 |
| `list_folders` | vault 내 폴더 목록 |
| `get_active_note_info` | 활성 노트 정보 가져오기 |
| `bulk_propose_rename` | 선택 대화상자를 사용한 여러 파일 일괄 이름 변경 |

### Vault 도구 모드

AI가 Chat에서 노트를 처리할 때 Vault 도구를 사용합니다. 첨부 버튼 아래의 데이터베이스 아이콘(📦)을 통해 AI가 사용할 수 있는 Vault 도구를 제어합니다:

| 모드 | 설명 | 사용 가능한 도구 |
|------|------|------------------|
| **Vault: 전체** | 전체 Vault 접근 | 모든 도구 |
| **Vault: 검색 제외** | 검색 도구 제외 | `search_notes`, `list_notes` 제외 전체 |
| **Vault: 끄기** | Vault 접근 없음 | 없음 |

**각 모드 사용 시기:**

- **Vault: 전체** - 일반 사용을 위한 기본 모드입니다. AI가 vault를 읽고, 쓰고, 검색할 수 있습니다.
- **Vault: 검색 제외** - 이미 대상 파일을 알고 있을 때 사용합니다. 중복 vault 검색을 피하여 토큰을 절약하고 응답 시간을 개선합니다.
- **Vault: 끄기** - vault 접근이 전혀 필요 없을 때 사용합니다.

**자동 모드 선택:**

| 조건 | 기본 모드 | 변경 가능 |
|------|-----------|-----------|
| CLI 모델 (Gemini/Claude/Codex CLI) | Vault: 끄기 | 아니오 |
| 로컬 LLM | Vault: 끄기 | 아니오 |
| Gemma 4 + RAG/Web Search | Vault: 끄기 | 예 (RAG/Web Search를 비활성화하면 도구가 다시 활성화) |
| 일반 | Vault: 전체 | 예 |

**일부 모드가 강제되는 이유:**

- **CLI 모델, Ollama, OpenCode (Local)**: OpenAI 형식의 Function Calling을 지원하지 않으므로 Vault 도구를 사용할 수 없습니다. **LM Studio / vLLM / AnythingLLM** 로컬 LLM은 로드된 모델이 tool calling을 지원하면 Vault 도구를 사용할 수 있습니다. 모델이 첫 도구 요청을 거부하면 자동으로 플래그가 설정되고 이후 턴에서 마커 모드로 폴백됩니다 (**설정 → Local LLM → Re-enable tools** 에서 플래그를 해제할 수 있습니다).
- **Gemma 4**: Function Calling과 RAG/Web Search는 단일 요청에서 결합할 수 없습니다. 하나가 활성화되면 다른 하나는 자동으로 비활성화됩니다.

## 안전한 편집

AI가 `propose_edit`을 사용할 때:
1. 확인 대화상자에 제안된 변경 사항이 표시됩니다
2. **Apply**를 클릭하여 파일에 변경 사항 적용
3. **Discard**를 클릭하여 파일 수정 없이 취소

> 변경 사항은 확인하기 전까지 기록되지 않습니다.

## Edit History

노트에 대한 변경 사항을 추적하고 복원합니다:

- **자동 추적** - 모든 AI 편집(채팅, 워크플로우)과 수동 변경 사항이 기록됩니다
- **파일 메뉴 접근** - Markdown 파일을 우클릭하여 접근:
  - **Snapshot** - 현재 상태를 스냅샷으로 저장
  - **History** - 편집 히스토리 모달 열기


- **명령 팔레트** - "Show edit history" 명령어로도 사용 가능
- **Diff 뷰** - 색상으로 구분된 추가/삭제로 정확히 무엇이 변경되었는지 확인
- **복원** - 한 번의 클릭으로 이전 버전으로 되돌리기
- **복사** - 이전 버전을 새 파일로 저장 (기본 이름: `{filename}_{datetime}.md`)
- **크기 조절 가능한 모달** - 드래그하여 이동, 모서리에서 크기 조절

**Diff 표시:**
- `+` 줄은 이전 버전에 있었던 내용
- `-` 줄은 새 버전에 추가된 내용

**작동 방식:**

Edit history는 스냅샷 기반 접근 방식을 사용합니다:

1. **스냅샷 생성** - 파일이 처음 열리거나 AI에 의해 수정될 때 해당 내용의 스냅샷이 저장됩니다
2. **Diff 기록** - 파일이 수정되면 새 내용과 스냅샷 간의 차이가 히스토리 항목으로 기록됩니다
3. **스냅샷 업데이트** - 각 수정 후 스냅샷이 새 내용으로 업데이트됩니다
4. **복원** - 이전 버전으로 복원하려면 스냅샷에서 diff를 역순으로 적용합니다

**히스토리가 기록되는 시점:**
- AI 채팅 편집 (`propose_edit` 도구)
- 워크플로우 노트 수정 (`note` 노드)
- 명령어를 통한 수동 저장
- 파일 열기 시 스냅샷과 다른 경우 자동 감지

**저장:** 편집 기록은 메모리에 저장되며 Obsidian 재시작 시 삭제됩니다. 영구적인 버전 추적은 Obsidian의 내장 파일 복구 기능으로 커버됩니다.

![Edit History Modal](docs/images/edit_history.png)

## MCP 서버

MCP(Model Context Protocol) 서버는 Vault 작업 이외의 AI 기능을 확장하는 추가 도구를 제공합니다.

**두 가지 전송 모드를 지원합니다:**

**HTTP (Streamable HTTP):**

1. 플러그인 설정 → **MCP 서버** 섹션 열기
2. **서버 추가** 클릭 → **HTTP** 선택
3. 서버 이름과 URL 입력
4. 인증을 위한 선택적 헤더 구성 (JSON 형식)
5. **연결 테스트** 클릭하여 확인하고 사용 가능한 도구 가져오기
6. 서버 구성 저장

**Stdio (로컬 프로세스):**

1. 플러그인 설정 → **MCP 서버** 섹션 열기
2. **서버 추가** 클릭 → **Stdio** 선택
3. 서버 이름과 명령어 입력 (예: `npx -y @modelcontextprotocol/server-filesystem /path/to/dir`)
4. 선택적 환경 변수 구성 (JSON 형식)
5. **연결 테스트** 클릭하여 확인하고 사용 가능한 도구 가져오기
6. 서버 구성 저장

> **참고:** Stdio 전송은 로컬 프로세스를 실행하며 데스크톱 전용입니다. 저장하기 전에 연결 테스트가 필요합니다.

![MCP 서버 설정](docs/images/setting_mcp.png)

**MCP 도구 사용:**

- **채팅에서:** 데이터베이스 아이콘(📦)을 클릭하여 도구 설정을 엽니다. 대화별로 MCP 서버를 활성화/비활성화할 수 있습니다.
- **워크플로우에서:** `mcp` 노드를 사용하여 MCP 서버 도구를 호출합니다.

**도구 힌트:** 연결 테스트 성공 후 사용 가능한 도구 이름이 저장되어 설정과 채팅 UI 모두에 표시됩니다.

### MCP Apps (인터랙티브 UI)

일부 MCP 도구는 도구 결과와 시각적으로 상호작용할 수 있는 인터랙티브 UI를 반환합니다. 이 기능은 [MCP Apps 사양](https://github.com/anthropics/anthropic-cookbook/tree/main/misc/mcp_apps)을 기반으로 합니다.


**작동 방식:**

- MCP 도구가 응답 메타데이터에서 `ui://` 리소스 URI를 반환하면, 플러그인이 HTML 콘텐츠를 가져와 렌더링합니다
- UI는 보안을 위해 샌드박스된 iframe 내에 표시됩니다 (`sandbox="allow-scripts allow-forms"`)
- 인터랙티브 앱은 JSON-RPC 브릿지를 통해 추가 MCP 도구를 호출하고 컨텍스트를 업데이트할 수 있습니다

**채팅에서:**
- MCP Apps는 어시스턴트 메시지 내에 인라인으로 표시되며 확장/축소 버튼이 있습니다
- ⊕를 클릭하면 전체 화면으로 확장, ⊖를 클릭하면 축소

**워크플로우에서:**
- MCP Apps는 워크플로우 실행 중 모달 대화상자로 표시됩니다
- 워크플로우는 사용자 상호작용을 위해 일시 중지되고, 모달이 닫히면 계속됩니다

> **보안:** 모든 MCP App 콘텐츠는 제한된 권한으로 샌드박스된 iframe 내에서 실행됩니다. iframe은 상위 페이지의 DOM, 쿠키 또는 로컬 스토리지에 접근할 수 없습니다. `allow-scripts`와 `allow-forms`만 활성화됩니다.

## 에이전트 스킬

맞춤 지시, 참조 자료, 실행 가능한 워크플로우로 AI의 기능을 확장합니다. 스킬은 [OpenAI Codex](https://github.com/openai/codex)의 `.codex/skills/` 등 업계 표준 에이전트 스킬 패턴을 따릅니다.

- **맞춤 지시** - `SKILL.md` 파일로 도메인별 동작 정의
- **참조 자료** - `references/`에 스타일 가이드, 템플릿, 체크리스트 포함
- **워크플로우 통합** - 스킬이 워크플로우를 Function Calling 도구로 노출 가능
- **슬래시 명령어** - `/folder-name`을 입력하여 스킬을 즉시 실행하고 전송
- **CLI 모드 지원** - Gemini CLI, Claude CLI, Codex CLI 백엔드에서도 스킬 사용 가능
- **선택적 활성화** - 대화별로 활성화할 스킬 선택

스킬도 워크플로우와 같은 방법으로 만들 수 있습니다 — **+ New (AI)**를 선택하고, **"에이전트 스킬로 만들기"**를 체크한 후 설명을 입력하세요. AI가 `SKILL.md` 지침과 워크플로우를 모두 생성합니다.

> **설정 방법과 예제는 [SKILLS.md](docs/SKILLS_ko.md)를 참조하세요**

---

# Discord Integration

Obsidian vault의 LLM을 Discord bot으로 연결합니다. 사용자는 Discord에서 AI와 대화하고, 모델을 전환하고, RAG 검색을 사용하고, 슬래시 명령어를 실행할 수 있습니다.

## 설정

### 1. Discord Bot 생성

1. [Discord Developer Portal](https://discord.com/developers/applications)로 이동
2. **New Application** 클릭 → 이름 입력 → **Create**
3. 왼쪽 사이드바에서 **Bot** 선택
4. **Reset Token** 클릭 → bot 토큰 복사 (나중에 필요합니다)
5. **Privileged Gateway Intents**에서 **Message Content Intent** 활성화 (메시지 텍스트를 읽는 데 필요)

### 2. Bot을 서버에 초대

1. 왼쪽 사이드바에서 **OAuth2** 선택
2. **OAuth2 URL Generator**에서 **bot** 스코프 선택
3. **Bot Permissions**에서 다음을 선택:
   - **Send Messages**
   - **Read Message History**
4. 생성된 URL을 복사하여 브라우저에서 열기
5. 서버를 선택하고 bot을 승인

### 3. Obsidian에서 설정

1. 플러그인 설정 → **Discord** 섹션 열기
2. **Discord Bot** 활성화
3. bot 토큰 붙여넣기
4. **Connect** 클릭 (플러그인이 연결 전 토큰을 검증합니다)
5. 상태 표시기에서 bot 연결 여부 확인 가능

## 설정 옵션

| 설정 | 설명 | 기본값 |
|---------|-------------|---------|
| **Enabled** | Discord bot 켜기/끄기 | 끄기 |
| **Bot Token** | Developer Portal에서 발급한 Discord bot 토큰 | — |
| **Respond to DMs** | bot이 DM에 응답할지 여부 | 켜기 |
| **Require @mention** | 서버 채널에서 @멘션 시에만 응답 (DM은 항상 응답) | 켜기 |
| **Allowed Channel IDs** | 제한할 채널 ID를 쉼표로 구분 (비어있으면 = 모든 채널) | 비어있음 |
| **Allowed User IDs** | 제한할 사용자 ID를 쉼표로 구분 (비어있으면 = 모든 사용자) | 비어있음 |
| **Model Override** | Discord에서 사용할 모델 지정 (비어있으면 = 현재 선택된 모델) | 비어있음 |
| **System Prompt Override** | Discord 대화용 커스텀 시스템 프롬프트 | 비어있음 |
| **Max Response Length** | 메시지당 최대 문자 수 (1–2000, Discord 제한) | 2000 |

> [!TIP]
> **채널/사용자 ID 찾기:** Discord에서 **Developer Mode**를 활성화하세요 (설정 → 고급 → Developer Mode). 그런 다음 채널이나 사용자를 우클릭하고 **Copy ID**를 선택합니다.

## Bot 명령어

사용자는 Discord에서 다음 명령어로 bot과 상호작용할 수 있습니다:

| 명령어 | 설명 |
|---------|-------------|
| `!model` | 사용 가능한 모델 목록 표시 |
| `!model <name>` | 이 채널에서 특정 모델로 전환 |
| `!rag` | 사용 가능한 RAG 설정 목록 표시 |
| `!rag <name>` | 이 채널에서 특정 RAG 설정으로 전환 |
| `!rag off` | 이 채널에서 RAG 비활성화 |
| `!skill` | 사용 가능한 슬래시 명령어 목록 표시 |
| `!skill <name>` | 슬래시 명령어 실행 (후속 메시지가 필요할 수 있음) |
| `!discuss <theme>` | 설정된 참가자로 AI Discussion 시작 (백그라운드) |
| `!reset` | 이 채널의 대화 기록 초기화 |
| `!help` | 도움말 메시지 표시 |

## 기능

- **멀티 프로바이더 지원** — 설정된 모든 LLM 프로바이더에서 작동 (Gemini, OpenAI, Anthropic, OpenRouter, Grok, CLI, 로컬 LLM)
- **채널별 상태** — 각 Discord 채널이 자체 대화 기록, 모델 선택, RAG 설정을 유지
- **Vault 도구** — AI가 플러그인 설정에 따라 vault 도구 (노트 읽기, 쓰기, 검색)에 완전히 접근 가능
- **RAG 통합** — `!rag` 명령어로 채널별 시맨틱 검색 활성화 가능
- **슬래시 명령어** — `!skill`로 플러그인 슬래시 명령어 실행
- **긴 메시지 분할** — Discord의 2000자 제한을 초과하는 응답은 자연스러운 구분점에서 자동 분할
- **대화 메모리** — 채널별 기록 (최대 20개 메시지, 30분 TTL)
- **자동 재연결** — 지수 백오프로 연결 끊김에서 복구

> [!NOTE]
> 대화 기록은 메모리에만 보관되며, bot 연결이 끊기거나 Obsidian이 재시작되면 초기화됩니다.

---

# Workflow Builder

Markdown 파일에서 직접 자동화된 다단계 워크플로우를 구축합니다. **프로그래밍 지식이 필요 없습니다** - 자연어로 원하는 것을 설명하면 AI가 워크플로우를 생성합니다.

![Visual Workflow Editor](docs/images/visual_workflow.png)

## AI 기반 워크플로우 & 스킬 생성

**YAML 문법이나 노드 유형을 배울 필요가 없습니다.** 일반 언어로 워크플로우를 설명하기만 하면 됩니다:

1. 플러그인 사이드바에서 **Workflow** 탭 열기
2. 드롭다운에서 **+ New (AI)** 선택
3. 원하는 것을 설명: *"선택한 노트를 요약하고 summaries 폴더에 저장하는 워크플로우 만들어줘"*
4. 독립 워크플로우 대신 에이전트 스킬을 만들려면 **"에이전트 스킬로 만들기"**를 체크
5. **Generate** 클릭 - AI가 완전한 워크플로우 생성

![Create Workflow with AI](docs/images/create_workflow_with_ai.png)

**기존 워크플로우도 같은 방식으로 수정:**
1. 아무 워크플로우나 로드
2. **AI Modify** 버튼 클릭
3. 변경 사항 설명: *"요약을 일본어로 번역하는 단계 추가해줘"*
4. 검토 후 적용


## 사용 가능한 노드 유형

워크플로우 구축에 24개 노드 유형을 사용할 수 있습니다:

| 카테고리 | 노드 |
|----------|-------|
| 변수 | `variable`, `set` |
| 제어 | `if`, `while` |
| LLM | `command` |
| 데이터 | `http`, `json`, `script` |
| 노트 | `note`, `note-read`, `note-search`, `note-list`, `folder-list`, `open` |
| 파일 | `file-explorer`, `file-save` |
| 프롬프트 | `prompt-file`, `prompt-selection`, `dialog` |
| 구성 | `workflow` |
| 외부 | `mcp`, `obsidian-command` |
| 유틸리티 | `sleep` |

> **자세한 노드 사양과 예제는 [WORKFLOW_NODES.md](docs/WORKFLOW_NODES_ko.md)를 참조하세요**

## 단축키 모드

키보드 단축키를 할당하여 워크플로우를 즉시 실행할 수 있습니다:

1. 워크플로우에 `name:` 필드 추가
2. 워크플로우 파일을 열고 드롭다운에서 워크플로우 선택
3. Workflow 패널 하단의 키보드 아이콘 (⌨️) 클릭
4. 설정 → 단축키 → "Workflow: [워크플로우 이름]" 검색
5. 단축키 할당 (예: `Ctrl+Shift+T`)

단축키로 실행 시:
- `prompt-file`은 자동으로 활성 파일 사용 (대화상자 없음)
- `prompt-selection`은 현재 선택 영역 사용, 선택 없으면 전체 파일 내용 사용

## 이벤트 트리거

Obsidian 이벤트에 의해 워크플로우가 자동으로 트리거될 수 있습니다:

![Event Trigger Settings](docs/images/event_setting.png)

| 이벤트 | 설명 |
|-------|-------------|
| File Created | 새 파일이 생성될 때 트리거 |
| File Modified | 파일이 저장될 때 트리거 (5초 디바운스) |
| File Deleted | 파일이 삭제될 때 트리거 |
| File Renamed | 파일 이름이 변경될 때 트리거 |
| File Opened | 파일이 열릴 때 트리거 |

**이벤트 트리거 설정:**
1. 워크플로우에 `name:` 필드 추가
2. 워크플로우 파일을 열고 드롭다운에서 워크플로우 선택
3. Workflow 패널 하단의 번개 아이콘 (⚡) 클릭
4. 워크플로우를 트리거할 이벤트 선택
5. 선택적으로 파일 패턴 필터 추가

**파일 패턴 예제:**
- `**/*.md` - 모든 폴더의 모든 Markdown 파일
- `journal/*.md` - journal 폴더의 Markdown 파일만
- `*.md` - 루트 폴더의 Markdown 파일만
- `**/{daily,weekly}/*.md` - daily 또는 weekly 폴더의 파일
- `projects/[a-z]*.md` - 소문자로 시작하는 파일

**이벤트 변수:** 이벤트에 의해 트리거될 때 다음 변수가 자동으로 설정됩니다:

| 변수 | 설명 |
|----------|-------------|
| `_eventType` | 이벤트 유형: `create`, `modify`, `delete`, `rename`, `file-open` |
| `_eventFilePath` | 영향을 받는 파일의 경로 |
| `_eventFile` | 파일 정보가 포함된 JSON (path, basename, name, extension) |
| `_eventFileContent` | 파일 내용 (create/modify/file-open 이벤트용) |
| `_eventOldPath` | 이전 경로 (rename 이벤트에만 해당) |

> **참고:** `prompt-file` 및 `prompt-selection` 노드는 이벤트에 의해 트리거될 때 자동으로 이벤트 파일을 사용합니다. `prompt-selection`은 전체 파일 내용을 선택 영역으로 사용합니다.

---

# 공통 사항

## 지원 모델

### Gemini

| 모델 | 설명 |
|-------|-------------|
| Gemini 3.1 Pro Preview | 최신 플래그십 모델, 1M 컨텍스트 (권장) |
| Gemini 3.1 Pro Preview (Custom Tools) | 커스텀 도구와 bash를 사용한 에이전트 워크플로우에 최적화 |
| Gemini 3 Flash Preview | 빠른 모델, 1M 컨텍스트, 최고의 비용 대비 성능 |
| Gemini 3.1 Flash Lite Preview | 높은 성능의 가장 비용 효율적인 모델 |
| Gemini 2.5 Flash | 빠른 모델, 1M 컨텍스트 |
| Gemini 2.5 Pro | Pro 모델, 1M 컨텍스트 |
| Gemini 3 Pro (Image) | Pro 이미지 생성, 4K |
| Gemini 3.1 Flash (Image) | 빠르고 저렴한 이미지 생성 |
| Gemma 4 | 무료, Function Calling과 RAG/Web Search는 상호 배타적 |

> **Thinking 모드:** 채팅에서는 메시지에 "생각해", "분석해", "고려해" 같은 키워드가 포함되면 Thinking 모드가 활성화됩니다. 그러나 **Gemini 3.1 Pro**는 키워드와 관계없이 항상 Thinking 모드로 작동합니다 — 이 모델은 Thinking 비활성화를 지원하지 않습니다.

**Always Think 토글:**

키워드 없이도 Flash 모델에서 Thinking 모드를 강제로 활성화할 수 있습니다. 데이터베이스 아이콘(📦)을 클릭하여 도구 메뉴를 열고, **Always Think** 아래의 토글을 확인하세요:

- **Flash** — 기본값 OFF. 체크하면 Flash 모델에서 항상 Thinking을 활성화합니다.
- **Flash Lite** — 기본값 ON. Flash Lite는 Thinking을 활성화해도 비용과 속도 차이가 거의 없으므로 켜둘 것을 권장합니다.

토글이 ON이면 메시지 내용에 관계없이 해당 모델 패밀리에서 항상 Thinking이 활성화됩니다. OFF이면 기존 키워드 기반 감지가 사용됩니다.

![Always Think Settings](docs/images/setting_thinking.png)

### OpenAI

| 모델 | 설명 |
|-------|-------------|
| GPT-5.4 | 최신 플래그십 모델 |
| GPT-5.4-mini | 비용 효율적인 중간 모델 |
| GPT-5.4-nano | 경량, 빠른 모델 |
| O3 | 추론 모델 |
| DALL-E 3 / DALL-E 2 | 이미지 생성 |

### Anthropic

| 모델 | 설명 |
|-------|-------------|
| Claude Opus 4.6 | 가장 강력한 모델, 확장 사고 |
| Claude Sonnet 4.6 | 성능과 비용의 균형 |
| Claude Haiku 4.5 | 빠르고 경량인 모델 |

### OpenRouter / Grok / Custom

커스텀 Base URL과 모델로 모든 OpenAI 호환 엔드포인트를 설정할 수 있습니다. OpenRouter는 다양한 프로바이더의 수백 개 모델에 접근할 수 있습니다.

### OpenCode Zen / Go

OpenCode는 동일한 계정에서 두 개의 호스팅 게이트웨이를 제공하며, 둘 다 프로바이더 드롭다운에서 선택할 수 있습니다:

- **OpenCode Zen** (`https://opencode.ai/zen`) — 사용량 기반 결제. 여러 무료 모델 (Big Pickle, MiniMax M2.5 Free 등) 과 광범위한 모델 카탈로그 (Claude, GPT-5.x 등) 를 포함합니다. OpenAI 호환 `/v1/models` + `/v1/chat/completions` 를 노출하므로 모델이 자동으로 나열됩니다.
- **OpenCode Go** (`https://opencode.ai/zen/go`) — 첫 달 $5, 이후 $10/월 구독. 큐레이션된 코딩 모델 (GLM, Kimi, DeepSeek, MiMo, MiniMax, Qwen) 을 제공합니다. `/v1/chat/completions` 만 노출하므로 Verify 시 플러그인은 문서화된 모델 목록으로 폴백합니다.

### 로컬 LLM

Ollama, LM Studio, vLLM, AnythingLLM 또는 OpenCode 로컬 서버를 통해 로컬에서 실행 중인 모델에 연결합니다. 실행 중인 서버에서 모델이 자동 감지됩니다.

## 설치

### BRAT (권장)
1. [BRAT](https://github.com/TfTHacker/obsidian42-brat) 플러그인 설치
2. BRAT 설정 열기 → "Add Beta plugin"
3. 입력: `https://github.com/takeshy/obsidian-llm-hub`
4. 커뮤니티 플러그인 설정에서 플러그인 활성화

### 수동 설치
1. releases에서 `main.js`, `manifest.json`, `styles.css` 다운로드
2. `.obsidian/plugins/`에 `llm-hub` 폴더 생성
3. 파일 복사 후 Obsidian 설정에서 활성화

### 소스에서 빌드
```bash
git clone https://github.com/takeshy/obsidian-llm-hub
cd obsidian-llm-hub
npm install
npm run build
```

## 설정

### API 프로바이더

플러그인 설정에서 하나 이상의 API 프로바이더를 추가합니다. 각 프로바이더는 자체 API 키와 모델 선택을 가집니다.

| 프로바이더 | API 키 발급 |
|----------|-------------|
| Gemini | [ai.google.dev](https://ai.google.dev) |
| OpenAI | [platform.openai.com](https://platform.openai.com) |
| Anthropic | [console.anthropic.com](https://console.anthropic.com) |
| OpenRouter | [openrouter.ai](https://openrouter.ai) |
| Grok | [console.x.ai](https://console.x.ai) |
| OpenCode Zen | [opencode.ai](https://opencode.ai) |
| OpenCode Go | [opencode.ai](https://opencode.ai) |

커스텀 OpenAI 호환 엔드포인트도 추가할 수 있습니다.

![Basic Settings](docs/images/setting_basic.png)

### 로컬 LLM

로컬에서 실행 중인 LLM 서버에 연결합니다:

1. 로컬 서버 시작 (Ollama, LM Studio, vLLM, AnythingLLM 또는 OpenCode)
2. 플러그인 설정에 서버 URL 입력
3. "Verify" 클릭하여 사용 가능한 모델 감지

> [!NOTE]
> **LM Studio / vLLM / AnythingLLM** 로컬 LLM은 vault 도구에 OpenAI 형식의 Function Calling을 사용합니다 — 도구 지원 모델에서는 기본적으로 활성화됩니다. 모델이 첫 도구 요청을 거부하면 자동으로 플래그가 설정되고 이후 턴에서 마커 기반 스킬 모드로 폴백됩니다. 다시 시도하려면 **설정 → Local LLM → Re-enable tools** 에서 플래그를 해제하세요.
>
> **Ollama** 와 **OpenCode (Local)** 은 여전히 마커 모드만 사용합니다. 해당 프레임워크에서 노트 작업에는 워크플로우 또는 RAG를 사용하세요.

#### OpenCode 로컬 서버

OpenCode 프레임워크는 로컬에서 실행 중인 `opencode serve` 인스턴스에 연결하며, OpenAI 호환 `/v1/chat/completions` 형식 대신 자체 HTTP API를 노출합니다. 스트리밍은 서버의 `/global/event` SSE 엔드포인트를 사용합니다.

##### macOS / Linux

1. OpenCode CLI 설치:
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   ```
2. 서버 시작:
   ```bash
   opencode serve
   ```
   기본적으로 `http://localhost:4096` 에서 수신 대기합니다.
3. 플러그인 설정 → **Local LLM** 에서 **OpenCode (Local)** 을 선택하고 기본 URL (`http://localhost:4096`) 을 유지한 후 **Fetch models** 를 클릭합니다.
4. 모델은 `<providerID>/<modelID>` 형식 (예: `google/gemini-flash-lite-latest`) 으로 나열됩니다. 사용할 모델을 선택하고 저장하세요.

##### Windows (WSL)

OpenCode는 파일 시스템 성능과 도구 호환성을 위해 Windows에서 [WSL을 권장합니다](https://opencode.ai/docs/ja/windows-wsl). Obsidian은 Windows 호스트에서 실행되므로, 서버는 도달 가능한 인터페이스에 바인딩되어야 하며 — WSL 외부에서 접근 가능해지므로 — **반드시 비밀번호로 보호**해야 합니다.

1. WSL 설치 (Microsoft [공식 가이드](https://learn.microsoft.com/windows/wsl/install)) 후 WSL 터미널을 엽니다.
2. WSL 내에서 OpenCode 설치:
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   ```
3. 비밀번호와 함께 모든 인터페이스에 바인딩하여 서버 시작:
   ```bash
   OPENCODE_SERVER_PASSWORD='your-password' opencode serve --hostname 0.0.0.0 --port 4096
   ```
   WSL2는 `localhost` 를 Windows 호스트로 자동 전달하므로 Obsidian에서 URL은 `http://localhost:4096` 입니다. 해결되지 않으면 WSL에서 `hostname -I` 를 실행하고 대신 `http://<wsl-ip>:4096` 을 사용하세요.
4. 플러그인 설정 → **Local LLM** → **OpenCode (Local)** 에서:
   - **Base URL**: `http://localhost:4096` (또는 WSL IP)
   - **Username**: `opencode` (기본값. `OPENCODE_SERVER_USERNAME` 을 설정한 경우 그 값으로 덮어씀)
   - **Password**: `OPENCODE_SERVER_PASSWORD` 에 설정한 값

   **Fetch models** 를 클릭하고 `<providerID>/<modelID>` 형식의 모델을 선택한 후 저장하세요.

### CLI 모드 (Gemini / Claude / Codex)

**Gemini CLI:**
1. [Gemini CLI](https://github.com/google-gemini/gemini-cli) 설치
2. `gemini` → `/auth`로 인증
3. Gemini CLI 섹션에서 "Verify" 클릭

**Claude CLI:**
1. [Claude Code](https://github.com/anthropics/claude-code) 설치: `npm install -g @anthropic-ai/claude-code`
2. `claude`로 인증
3. Claude CLI 섹션에서 "Verify" 클릭

**Codex CLI:**
1. [Codex CLI](https://github.com/openai/codex) 설치: `npm install -g @openai/codex`
2. `codex`로 인증
3. Codex CLI 섹션에서 "Verify" 클릭

**CLI 제한 사항:** Vault 도구 미지원, Web Search 없음, 데스크톱 전용

> [!NOTE]
> **CLI 전용 사용:** API 키 없이 CLI 모드를 사용할 수 있습니다. CLI 도구를 설치하고 확인하기만 하면 됩니다.

**사용자 지정 CLI 경로:** 자동 CLI 감지가 실패하면 Verify 버튼 옆의 톱니바퀴 아이콘(⚙️)을 클릭하여 CLI 경로를 수동으로 지정할 수 있습니다. 플러그인은 버전 관리자(nodenv, nvm, volta, fnm, asdf, mise)를 포함한 일반적인 설치 경로를 자동으로 검색합니다.

<details>
<summary><b>Windows: CLI 경로 찾는 방법</b></summary>

CLI 경로는 비워둔 채 **Verify**를 클릭하세요. 플러그인은 npm 전역 설치(`%APPDATA%\npm\node_modules`, `%PROGRAMFILES%\nodejs\node_modules`, PATH 기반 위치)를 자동 감지하여 실제 `.js` 진입점을 `node`를 통해 실행합니다. Claude의 독립 실행형 설치(`%LOCALAPPDATA%\Programs\claude\claude.exe`)도 자동으로 감지됩니다.

자동 감지에 실패할 때만 커스텀 CLI 경로를 설정하세요. 아래 중 어느 것이든 작동합니다 (가장 안전한 것부터):

1. **`.js` 스크립트 (권장)** — 예: `C:\Users\YourName\AppData\Roaming\npm\node_modules\@google\gemini-cli\dist\index.js`. `node`를 통해 실행 (`cmd.exe` 경유 없음).
2. **`.exe` 실행 파일** — 예: `C:\Users\YourName\AppData\Local\Programs\claude\claude.exe`. 직접 실행.
3. **`.cmd` / `.bat` 래퍼** — 예: `C:\Users\YourName\AppData\Roaming\npm\gemini.cmd`. `cmd.exe`를 거쳐야 하므로 프롬프트의 `&`, `|`, `>`, `^`, `%VAR%` 등이 오작동할 수 있습니다.

PowerShell에서 `Get-Command gemini` / `Get-Command claude` / `Get-Command codex`를 실행하여 래퍼 경로를 확인한 뒤, 이를 직접 입력(옵션 3)하거나 인접한 `.js` / `.exe`로 이동해 더 안전한 옵션을 선택하세요.
</details>

<details>
<summary><b>macOS / Linux: CLI 경로 찾는 방법</b></summary>

1. 터미널을 열고 실행:
   ```bash
   which gemini
   ```
2. 표시된 경로 (예: `/home/user/.local/bin/gemini`)를 CLI 경로 설정에 입력

Claude CLI의 경우 `which claude`를 사용하세요. Codex CLI의 경우 `which codex`를 사용하세요.

**Node.js 버전 관리자:** nodenv, nvm, volta, fnm, asdf 또는 mise를 사용하는 경우, 플러그인이 일반적인 위치에서 node 바이너리를 자동으로 감지합니다. 감지에 실패하면 CLI 스크립트 경로를 직접 지정하세요 (예: `~/.npm-global/lib/node_modules/@google/gemini-cli/dist/index.js`).
</details>

> [!TIP]
> **Claude CLI 팁:** LLM Hub의 채팅 세션은 로컬에 저장됩니다. Obsidian 외부에서 대화를 계속하려면 vault 디렉토리에서 `claude --resume`을 실행하여 이전 세션을 확인하고 재개할 수 있습니다.

### Workspace 설정
- **Workspace Folder** - 채팅 기록 및 설정 저장 위치
- **System Prompt** - 추가 AI 지시사항
- **Tool Limits** - function call 제한 설정
- **Edit History** - AI가 만든 변경 사항을 추적하고 복원

![Tool Limits & Edit History](docs/images/setting_tool_history.png)

### 암호화

채팅 기록과 워크플로우 실행 로그를 개별적으로 비밀번호로 보호합니다.

**설정 방법:**

1. 플러그인 설정에서 비밀번호 설정 (공개키 암호화 방식으로 안전하게 저장)

![암호화 초기 설정](docs/images/setting_initial_encryption.png)

2. 설정 후 각 로그 유형의 암호화를 전환:
   - **AI 채팅 기록 암호화** - 채팅 대화 파일을 암호화
   - **워크플로우 실행 로그 암호화** - 워크플로우 기록 파일을 암호화

![암호화 설정](docs/images/setting_encryption.png)

각 설정은 독립적으로 활성화/비활성화할 수 있습니다.

**기능:**
- **개별 제어** - 암호화할 로그 선택 (채팅, 워크플로우 또는 둘 다)
- **자동 암호화** - 설정에 따라 새 파일이 저장 시 암호화
- **비밀번호 캐싱** - 세션당 한 번만 비밀번호 입력
- **전용 뷰어** - 암호화된 파일은 미리보기가 있는 보안 편집기에서 열림
- **복호화 옵션** - 필요시 개별 파일에서 암호화 제거

**작동 방식:**

```
[설정 - 비밀번호 설정 시 한 번만]
비밀번호 → 키 쌍 생성 (RSA) → 개인 키 암호화 → 설정에 저장

[암호화 - 각 파일]
파일 내용 → 새 AES 키로 암호화 → 공개 키로 AES 키 암호화
→ 파일에 저장: 암호화된 데이터 + 암호화된 개인 키 (설정에서 복사) + salt

[복호화]
비밀번호 + salt → 개인 키 복원 → AES 키 복호화 → 파일 내용 복호화
```

- 키 쌍은 한 번만 생성됨 (RSA 생성이 느림), AES 키는 파일별로 생성
- 각 파일에 저장: 암호화된 콘텐츠 + 암호화된 개인 키 (설정에서 복사) + salt
- 파일은 자체 완결형 — 비밀번호만으로 복호화 가능, 플러그인 의존성 없음

<details>
<summary>Python 복호화 스크립트 (클릭하여 펼치기)</summary>

```python
#!/usr/bin/env python3
"""플러그인 없이 LLM Hub 암호화 파일 복호화"""
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
        raise ValueError("잘못된 암호화 파일 형식")

    frontmatter, encrypted_data = match.groups()
    key_match = re.search(r'key:\s*(.+)', frontmatter)
    salt_match = re.search(r'salt:\s*(.+)', frontmatter)
    if not key_match or not salt_match:
        raise ValueError("frontmatter에 key 또는 salt 없음")

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
        print(f"사용법: {sys.argv[0]} <암호화_파일>")
        sys.exit(1)
    password = getpass.getpass("비밀번호: ")
    print(decrypt_file(sys.argv[1], password))
```

필요: `pip install cryptography`

</details>

> **경고:** 비밀번호를 잊으면 암호화된 파일을 복구할 수 없습니다. 비밀번호를 안전하게 보관하세요.

> **팁:** 디렉토리의 모든 파일을 한 번에 암호화하려면 워크플로우를 사용하세요. [WORKFLOW_NODES_ko.md](docs/WORKFLOW_NODES_ko.md#obsidian-command)의 "디렉토리의 모든 파일 암호화" 예제를 참조하세요.

![파일 암호화 워크플로우](docs/images/enc.png)

**보안 이점:**
- **AI 채팅으로부터 보호** - 암호화된 파일은 AI Vault 작업(`read_note` 도구)으로 읽을 수 없습니다. 이를 통해 API 키와 같은 민감한 데이터가 채팅 중 실수로 노출되는 것을 방지합니다.
- **비밀번호로 워크플로우 접근** - 워크플로우는 `note-read` 노드를 사용하여 암호화된 파일을 읽을 수 있습니다. 접근 시 비밀번호 대화 상자가 나타나고, 비밀번호는 세션 동안 캐시됩니다.
- **시크릿 안전하게 저장** - API 키를 워크플로우에 직접 작성하는 대신 암호화된 파일에 저장하세요. 워크플로우는 비밀번호 확인 후 런타임에 키를 읽습니다.

### Semantic Search (RAG)

Vault 콘텐츠를 LLM 대화에 주입하는 로컬 벡터 기반 검색입니다. 외부 RAG 서버가 필요 없으며, 임베딩 생성 및 저장이 모두 로컬에서 이루어집니다.

**설정 방법:**

1. 설정 → RAG 섹션으로 이동
2. 새 RAG 설정 생성 (`+` 클릭)
3. 임베딩 구성:
   - **기본 (Gemini):** Embedding Base URL을 비워두면 Gemini API 키로 Gemini Embedding API 사용
   - **커스텀 서버 (Ollama 등):** Embedding Base URL을 설정하고 모델 선택
4. **Sync**을 클릭하여 vault에서 벡터 인덱스 구축
5. 드롭다운에서 RAG 설정을 선택하여 활성화

| 설정 | 설명 | 기본값 |
|------|------|--------|
| **Embedding Base URL** | 커스텀 임베딩 서버 URL (비어있음 = Gemini API) | 비어있음 |
| **Embedding API Key** | 커스텀 서버의 API 키 (비어있음 = Gemini 키) | 비어있음 |
| **Embedding Model** | 임베딩 생성에 사용할 모델명 | `gemini-embedding-2-preview` |
| **Chunk Size** | 청크당 문자 수 | 500 |
| **Chunk Overlap** | 청크 간 오버랩 | 100 |
| **PDF 청크 페이지 수** | 임베딩 청크당 PDF 페이지 수 (1–6) | 6 |
| **Top K** | 쿼리당 최대 검색 청크 수 | 5 |
| **Score Threshold** | 결과에 포함할 최소 유사도 점수 (0.0~1.0) | 0.5 |
| **Target Folders** | 인덱싱 대상을 특정 폴더로 제한 (비어있음 = 전체) | 비어있음 |
| **Exclude Patterns** | 인덱싱에서 파일을 제외하는 정규식 패턴 | 비어있음 |

> **멀티모달 인덱싱** (이미지, PDF, 오디오, 비디오)은 Gemini 네이티브 임베딩 모델 (`gemini-embedding-*`)을 사용할 때 자동으로 활성화됩니다. 수동 설정이 필요 없습니다.

**외부 인덱스:**

vault에서 동기화하는 대신 사전 구축된 인덱스를 사용:

1. **Use external index** 토글 활성화
2. `index.json`과 `vectors.bin`이 포함된 디렉토리의 절대 경로 설정
3. 선택적으로 쿼리 임베딩용 Embedding Base URL 설정 (비어있음 = Gemini API)
4. 임베딩 모델은 인덱스 파일에서 자동 감지

**작동 방식:** RAG가 활성화되면 각 채팅 메시지마다 로컬 벡터 검색이 실행됩니다. 관련 청크가 컨텍스트로 시스템 프롬프트에 주입됩니다. 소스가 채팅 UI에 표시되며, 클릭하면 참조된 노트가 열립니다.

### RAG Search 탭

**RAG Search** 탭은 RAG 결과를 검색, 필터링, 편집하고 Chat 또는 Discussion으로 전송하기 위한 전용 인터페이스를 제공합니다.

![RAG Search](docs/images/rag-search.png)

- **시맨틱 검색** — Top K 및 스코어 임계값 조정 가능
- **키워드 필터** — 검색 후 결과를 좁히기
- **청크 편집기** — 인접 청크 로드(이전/다음) 및 오버랩 제거
- **Chat 또는 Discussion으로 전송** — 선택한 결과가 편집 가능한 첨부 파일로 추가
- **인덱스 설정** (톱니바퀴 아이콘) — 청크 크기, 오버랩, 대상 폴더, 동기화 등을 설정

> 자세한 내용은 [RAG Search 문서](docs/RAG_SEARCH.md) ([日本語](docs/RAG_SEARCH_ja.md) | [中文](docs/RAG_SEARCH_zh.md) | [한국어](docs/RAG_SEARCH_ko.md) | [Français](docs/RAG_SEARCH_fr.md) | [Deutsch](docs/RAG_SEARCH_de.md) | [Español](docs/RAG_SEARCH_es.md) | [Português](docs/RAG_SEARCH_pt.md) | [Italiano](docs/RAG_SEARCH_it.md))를 참조하세요.

### AI Discussion

**Discussion** 탭은 여러 AI 모델이 주제에 대해 병렬로 토론하고, 결론을 도출하며, 최고의 답변에 투표하는 멀티 모델 토론 아레나를 제공합니다.

![AI Discussion](docs/images/ai-discussion.png)

**사용 방법:**

1. **Discussion** 탭을 엽니다
2. 토론 주제를 입력합니다
3. 참가자를 추가합니다 — 사용 가능한 모든 모델 (API, CLI, Local LLM) 또는 User를 선택할 수 있습니다
4. 선택적으로 참가자에게 역할을 부여합니다 (예: "찬성측", "비판적")
5. 턴 수를 설정합니다
6. **Start Discussion**을 클릭합니다

![Discussion Setup](docs/images/ai-discussion-start.png)

**토론 흐름:**

1. **토론 턴** — 모든 참가자가 병렬로 응답합니다. 각 턴은 이전 응답을 기반으로 합니다.
2. **결론** — 마지막 턴에서 각 참가자가 자신의 결론을 제시합니다.
3. **투표** — 투표 참가자가 모든 결론을 평가하고 최고의 결론에 투표합니다.
4. **결과** — 우승자 (또는 무승부)가 발표됩니다. 전체 기록을 Markdown 노트로 저장할 수 있습니다.

![Voting Results](docs/images/ai-discussion-voting.png)

**기능:**

- **어떤 모델이든 참가자로** — 모델을 자유롭게 조합 (예: Gemini vs Claude vs GPT)
- **사용자 참여** — 자신을 참가자 또는 투표자로 추가하여 인간 참여형 토론 가능
- **역할 부여** — 각 참가자에게 관점을 부여 (예: "낙관론자", "회의론자")
- **별도의 투표 참가자** — 투표 참가자는 토론 참가자에서 자동 동기화되지만 독립적으로 커스터마이즈 가능
- **영구 설정** — 참가자와 투표자가 세션 간에 저장 및 복원됨
- **설정 모달** — 톱니바퀴 아이콘 (⚙️)을 클릭하여 시스템 프롬프트, 결론 프롬프트, 투표 프롬프트, 출력 폴더, 기본 턴 수를 설정
- **노트로 저장** — 전체 토론 내용 (턴, 결론, 투표, 우승자)을 Markdown 파일로 내보내기

### 슬래시 명령어
- `/`로 시작하는 사용자 정의 프롬프트 템플릿 정의
- 명령어별로 모델 및 검색 설정 재정의 가능

![Slash Commands](docs/images/setting_slash_command.png)

## 요구 사항

- Obsidian v0.15.0+
- 다음 중 하나 이상: API 키 (Gemini, OpenAI, Anthropic, OpenRouter, Grok), 로컬 LLM 서버, 또는 CLI 도구
- 데스크톱 전용 (모바일은 [Gemini Helper](https://github.com/takeshy/obsidian-gemini-helper) 참조)

## 개인정보 보호

**로컬에 저장되는 데이터:**
- API 키 (Obsidian 설정에 저장)
- 채팅 기록 (Markdown 파일, 선택적으로 암호화)
- 워크플로우 실행 기록 (선택적으로 암호화)
- RAG 벡터 인덱스 (workspace 폴더에 저장)
- 암호화 키 (개인 키는 비밀번호로 암호화)

**LLM 프로바이더로 전송되는 데이터:**
- 채팅 메시지와 파일 첨부는 설정된 API 프로바이더 (Gemini, OpenAI, Anthropic, OpenRouter, Grok 또는 커스텀 엔드포인트)로 전송됩니다
- Web Search가 활성화되면 (Gemini만 해당) 쿼리가 Google Search로 전송됩니다
- 로컬 LLM 프로바이더는 데이터를 로컬 서버로만 전송합니다

**타사 서비스로 전송되는 데이터:**
- 워크플로우 `http` 노드는 워크플로우에 지정된 모든 URL로 데이터를 전송할 수 있습니다

**CLI 제공자 (선택 사항):**
- CLI 모드가 활성화되면 외부 CLI 도구 (gemini, claude, codex)가 child_process를 통해 실행됩니다
- 이는 사용자가 명시적으로 구성하고 확인한 경우에만 발생합니다
- CLI 모드는 child_process를 통해 외부 CLI 도구를 실행합니다

**Discord bot (선택 사항):**
- 활성화하면 플러그인이 WebSocket Gateway를 통해 Discord에 연결하고 사용자 메시지를 설정된 LLM 프로바이더로 전송합니다
- Bot 토큰은 Obsidian 설정에 저장됩니다
- Discord 채널의 메시지 내용이 LLM에 의해 처리됩니다 — 허용 채널/사용자를 설정하여 접근을 제한하세요

**MCP 서버 (선택 사항):**
- MCP (Model Context Protocol) 서버는 워크플로우 `mcp` 노드에 대해 플러그인 설정에서 구성할 수 있습니다
- MCP 서버는 추가 도구와 기능을 제공하는 외부 서비스입니다

**보안 참고:**
- 워크플로우 실행 전 검토하세요 - `http` 노드가 vault 데이터를 외부 엔드포인트로 전송할 수 있습니다
- 워크플로우 `note` 노드는 파일 쓰기 전 확인 대화상자를 표시합니다 (기본 동작)
- `confirmEdits: false`가 설정된 슬래시 명령어는 Apply/Discard 버튼 없이 파일 편집을 자동 적용합니다
- 민감한 자격 증명: API 키나 토큰을 워크플로우 YAML에 직접 저장하지 마세요 (`http` 헤더, `mcp` 설정 등). 대신 암호화된 파일에 저장하고 `note-read` 노드를 사용하여 런타임에 가져오세요. 워크플로우는 비밀번호 프롬프트로 암호화된 파일을 읽을 수 있습니다.

데이터 보존 정책은 각 프로바이더의 서비스 약관을 참조하세요.

## 라이선스

MIT

## 링크

- [Gemini API Docs](https://ai.google.dev/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [Ollama](https://ollama.com)
- [Obsidian Plugin Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## 지원

이 플러그인이 유용하다면 커피 한 잔 사주세요!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/takeshy)
