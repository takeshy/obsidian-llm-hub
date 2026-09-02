# LLM Hub for Obsidian

[![DeepWiki](https://img.shields.io/badge/DeepWiki-takeshy%2Fobsidian--llm--hub-blue.svg?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTQgMTloMTZhMiAyIDAgMCAwIDItMlY3YTIgMiAwIDAgMC0yLTJINWEyIDIgMCAwIDAtMiAydjEyYTIgMiAwIDAgMSAyLTJ6Ii8+PHBhdGggZD0iTTkgMTV2LTQiLz48cGF0aCBkPSJNMTIgMTV2LTIiLz48cGF0aCBkPSJNMTUgMTV2LTQiLz48L3N2Zz4=)](https://deepwiki.com/takeshy/obsidian-llm-hub)

**無料・オープンソース**の Obsidian 向け AI アシスタント。**チャット**、**ワークフロー自動化**、**セマンティック検索（RAG）**を搭載。複数の LLM プロバイダーに対応 — ニーズに合った AI を自由に選択できます。

> **任意の LLM プロバイダーを利用可能：** [Gemini](https://ai.google.dev)、[OpenAI](https://platform.openai.com)、[Anthropic](https://console.anthropic.com)、[OpenRouter](https://openrouter.ai)、[Grok](https://console.x.ai)、[OpenCode Zen / Go](https://opencode.ai)、ローカル LLM（[Ollama](https://ollama.com)、[LM Studio](https://lmstudio.ai)、[vLLM](https://docs.vllm.ai)、[OpenCode](https://opencode.ai)）、または CLI ツール（[Antigravity CLI](https://antigravity.google)、[Claude Code](https://github.com/anthropics/claude-code)、[Codex CLI](https://github.com/openai/codex)）。

## 主な機能

- **マルチプロバイダー LLM チャット** - Gemini、OpenAI、Anthropic、OpenRouter、Grok、OpenCode Zen/Go、ローカル LLM、CLI バックエンドに対応
- **Vault 操作** - AI が Function Calling でノートの読み書き・検索・編集を実行（Gemini、OpenAI、Anthropic、OpenCode Zen/Go、および LM Studio / vLLM / AnythingLLM 経由でツール対応モデルを使うローカル LLM）
- **ワークフロービルダー** - ビジュアルノードエディタと 25 種類のノードでマルチステップタスクを自動化
- **Dashboard Hub 連携** - 別プラグインの [Dashboard Hub](https://github.com/takeshy/obsidian-dashboard-hub) に AI モデル、チャット、Base 生成、ワークフロー実行機能を提供
- **セマンティック検索（RAG）** - 専用検索タブ、PDF プレビュー、検索結果からチャットへの連携を備えたローカルベクトル検索
- **Discussion Hub 連携** - 別プラグインのマルチプロバイダー [Discussion Hub](https://github.com/takeshy/obsidian-discussion-hub) に API、CLI、ローカルモデルを提供
- **編集履歴** - AI による変更を差分表示で追跡・復元
- **Web 検索** - Gemini、OpenAI 公式 API、Anthropic 公式 API、xAI 公式 API から引用付きの最新情報を取得
- **画像生成** - Gemini または DALL-E で画像を作成
- **Discord 連携** - LLM を Discord の chat bot として接続し、チャンネルごとにモデル/RAG を切り替え可能
- **暗号化** - チャット履歴とワークフロー実行ログをパスワード保護


## 対応プロバイダー

| プロバイダー | チャット | Vault ツール | Web 検索 | 画像生成 | RAG |
|----------|------|-------------|------------|-----------|-----|
| **Gemini** (API) | ✅ Streaming | ✅ Function calling | ✅ Google Search | ✅ Gemini 画像モデル | ✅ |
| **OpenAI** (API) | ✅ Streaming | ✅ Function calling | ✅ ネイティブ検索（公式 API） | ✅ DALL-E | ✅ |
| **Anthropic** (API) | ✅ Streaming | ✅ Tool use | ✅ ネイティブ検索（公式 API） | ❌ | ✅ |
| **OpenRouter** (API) | ✅ Streaming | ✅ Function calling | ❌ | ❌ | ✅ |
| **Grok** (API) | ✅ Streaming | ✅ Function calling | ✅ ネイティブ検索（xAI 公式 API） | ❌ | ✅ |
| **OpenCode Zen / Go** (API) | ✅ Streaming | ✅ Function calling | ❌ | ❌ | ✅ |
| **ローカル LLM** (LM Studio, vLLM, AnythingLLM) | ✅ Streaming | ✅ Function calling（自動フォールバック） | ❌ | ❌ | ✅ |
| **ローカル LLM** (Ollama, OpenCode) | ✅ Streaming | ❌（マーカーモード） | ❌ | ❌ | ✅ |
| **CLI** (Antigravity, Claude, Codex) | ✅ Streaming | ❌ | ❌ | ❌ | ✅ |

Web 検索は Gemini、および公式 API ホストを使用する OpenAI / Anthropic / Grok プロバイダーで表示されます。プロンプトを送信する前に検索メニューを開き、**Web search** をチェックしてください。Web 検索と 1 つのセマンティック検索（RAG）設定を同時に有効にできるため、モデルは最新の Web 情報と Vault から取得したコンテキストを統合できます。モデルに検索を依頼するだけではツールは有効になりません。有効化後も検索するかどうかはモデルが判断します。回答にはインラインの引用リンクと、引用元をまとめたクリック可能な一覧が表示されます。カスタムゲートウェイや OpenAI 互換ゲートウェイは、プロバイダー固有のネイティブ検索には対応扱いになりません。

> [!TIP]
> **複数のプロバイダーを同時に設定可能。** チャット中にモデルを自由に切り替えられます — 各プロバイダーは独自の API キーと設定を持ちます。

> [!TIP]
> **CLI オプション**を使えば、アカウントだけでフラッグシップモデルが使えます（API キー不要）！
> - **Antigravity CLI**: [Antigravity CLI](https://antigravity.google) をインストールし、`agy` で認証
> - **Claude CLI**: [Claude Code](https://github.com/anthropics/claude-code) をインストール（`npm install -g @anthropic-ai/claude-code`）し、`claude` で認証
> - **Codex CLI**: [Codex CLI](https://github.com/openai/codex) をインストール（`npm install -g @openai/codex`）し、`codex` で認証

### Gemini 無料 API キーのヒント

- **レート制限**はモデルごとで毎日リセット。別モデルに切り替えて作業を継続。
- **Gemma 4** は Function Calling と RAG/Web Search を同一リクエストで併用できません。RAG または Web Search が有効な場合、Vault ツールは自動的に無効になります。**CLI モデル**、**Ollama**、**OpenCode (Local)** は Vault ツールに非対応のため、ノート操作は**ワークフロー**（`note`、`note-read` など）または `{content}` / `{selection}` 変数を使用してください。**LM Studio / vLLM / AnythingLLM** のローカル LLM は、モデルが OpenAI 形式の Function Calling に対応していれば Vault ツールを利用可能 — 非対応モデルは初回利用時に自動検出されてマーカー方式のスキルモードにフォールバックします。

---

# AI チャット

AI チャット機能は、Obsidian Vault と統合された、選択した LLM プロバイダーとの対話型インターフェースを提供します。

![チャット画面](docs/images/chat.png)

**チャットを開く:**
- リボンの チャットアイコンをクリック
- コマンド: "LLM Hub: Open chat"
- トグル: "LLM Hub: Toggle chat / editor"

**チャット操作:**
- **Enter** - メッセージ送信
- **Shift+Enter** - 改行
- **停止ボタン** - 生成を停止
- **+ ボタン** - 新規チャット
- **履歴ボタン** - 過去のチャットを読み込み
- **拡大・縮小ボタン** - サイドバーを通常幅と拡張幅で切り替え
- **ノートとして保存ボタン** - コンパクトなMarkdownを出力し、同じチャットの再保存時は上書き
- **入力欄の ↑ / ↓** - チャットやObsidianの再起動をまたいで、送信済みプロンプトを最大100件遡ります。↑は先頭行、↓は末尾行にカーソルがある場合だけ履歴移動するため、複数行では通常どおりカーソルを移動できます。最新より先へ進むと未送信の下書きに戻ります。

## Web 検索

対応する API モデルを選び、モデル選択の横にある検索メニューを開いて **Web search** をチェックしてから送信します。同じメニューで 1 つのセマンティック検索設定も選択できます。両方が有効な場合、Vault から取得したコンテキストを追加したうえで、プロバイダーのネイティブ Web 検索ツールを利用できます。プロンプトに「Web を検索して」と書くだけでは検索は有効になりません。

Web と RAG の選択はワークスペースごとに保存されます。非対応モデルへ切り替えた場合も設定は保持され、一時的に無効として表示されます。対応モデルへ戻ると自動的に再有効化されます。複数のインデックスを検索する場合は、既存の結合 RAG 設定を使用してください。

- **Gemini:** Google Search Grounding を使用します。
- **OpenAI:** `api.openai.com` のみ対応し、Responses API で検索します。Vault / MCP の Function Tool と併用できます。画像生成モデルは対象外です。
- **Anthropic:** `api.anthropic.com` のみ対応し、ネイティブの Server Tool で検索します。Vault / MCP の Client Tool と併用できます。
- **Grok:** `api.x.ai` のみ対応し、xAI の Responses API で検索します。Vault / MCP の Function Tool と併用できます。画像・動画生成モデルは対象外です。
- **その他:** OpenRouter、カスタムゲートウェイ、ローカル LLM、CLI プロバイダーはネイティブ検索の対象外です。

チャットモデルの固定許可リストはありません。互換性のある現在および将来のモデルは検索を利用でき、非対応モデルではプロバイダーのエラーがそのまま表示されます。開発時のライブ確認では OpenAI GPT-5.6 Sol、Anthropic Claude Opus 4.8、Sonnet 5、Fable 5、Haiku 4.5 を検証し、Grok 4.5 は Responses ストリームの自動テストで確認しています。

表示されるのは引用されたソースのみです。引用位置には番号付き Markdown リンクが挿入され、xAI が返すインライン Markdown 引用はそのまま保持されます。重複を除いたソースは **Used web search** バッジの下にクリック可能な項目として表示されます。検索ソースとプロバイダー固有の継続データはチャット履歴に保存され、エンドポイント、モデル、履歴範囲が一致する後続ターンで再利用されます。OpenAI / Anthropic の検索料金は現在 1 回 `$0.01` として見積もり、xAI はレスポンスに含まれる正確な請求額（Web 検索は現在 1 回 `$0.005`）を使用します。

## スラッシュコマンド

`/` で呼び出せる再利用可能なプロンプトテンプレート：

- `{selection}`（選択テキスト）と `{content}`（アクティブノート）を含むテンプレート定義
- コマンドごとにモデルと検索設定を指定可能
- `/` を入力すると利用可能なコマンドを表示

**デフォルト:** `/infographic` - コンテンツを HTML インフォグラフィックに変換

![インフォグラフィック例](docs/images/chat_infographic.png)

## @ メンション

`@` を入力してファイルや変数を参照：

- `{selection}` - 選択テキスト
- `{content}` - アクティブノートの内容
- 任意の Vault ファイル - 参照して挿入（パスのみ挿入、内容は AI がツール経由で読み込み）

> [!NOTE]
> **`{selection}` と `{content}` の動作について：** Markdown View から Chat View にフォーカスが移動すると、通常は選択が解除されます。これを防ぐため、ビュー切替時に選択内容を変数に保持し、Markdown View 上の選択箇所を背景色でハイライト表示します。`{selection}` は選択テキストがある場合のみ @ の候補に表示されます。
>
> `{selection}` と `{content}` はどちらも入力エリアでは**意図的に展開されません**。チャット入力欄は狭いため、長いテキストを展開すると入力が困難になるためです。実際にメッセージを送信する際に展開され、送信済みメッセージを確認すると展開後の内容が表示されます。

> [!NOTE]
> Vault ファイルの@メンションは、ファイルパスのみが挿入され、AI がツール経由でファイル内容を読み込みます。CLI モデルや Ollama/OpenCode などのマーカー専用ローカル LLM では機能しません。LM Studio / vLLM / AnythingLLM などのツール対応ローカル LLM は、読み込んだモデルが Function Calling に対応していれば Vault ツール経由でファイルを読み込めます。Antigravity CLI はシェル経由でファイルを読み込めますが、応答形式が異なる場合があります。

## ファイル添付

ファイルを直接添付：画像（PNG, JPEG, GIF, WebP）、PDF、テキストファイル

## Function Calling（Vault 操作）

AI が Vault を直接操作するツール：

| ツール                 | 説明                                         |
| ---------------------- | -------------------------------------------- |
| `read_note`            | ノート内容を読み取り                         |
| `create_note`          | 新規ノート作成                               |
| `propose_edit`         | 確認ダイアログ付き編集                       |
| `propose_delete`       | 確認ダイアログ付き削除                       |
| `bulk_propose_edit`    | 複数ファイルの一括編集（選択ダイアログ付き） |
| `bulk_propose_delete`  | 複数ファイルの一括削除（選択ダイアログ付き） |
| `search_notes`         | 名前またはコンテンツで Vault を検索          |
| `list_notes`           | フォルダ内ノート一覧                         |
| `rename_note`          | リネーム/移動                                |
| `create_folder`        | 新規フォルダ作成                             |
| `list_folders`         | Vault 内フォルダ一覧                         |
| `get_active_note_info` | アクティブノートの情報取得                   |
| `bulk_propose_rename`  | 選択ダイアログ付き一括リネーム               |

### Vault ツールモード

AI が Chat でノートを扱う際は Vault ツールを経由します。添付ボタンの下にあるデータベースアイコン（📦）から、AI が使用できる Vault ツールを制御できます：

| モード              | 説明                   | 使用可能なツール                  |
| ------------------- | ---------------------- | --------------------------------- |
| **Vault: 全て**     | Vault への完全アクセス | すべてのツール                    |
| **Vault: 検索なし** | 検索ツールを除外       | `search_notes`、`list_notes` 以外 |
| **Vault: オフ**     | Vault アクセスなし     | なし                              |

同じデータベースアイコンのメニューにある **過去メッセージ数（0〜99）** では、現在のプロンプトより前のメッセージを何件会話コンテキストとしてモデルへ送るか指定できます。**0** にすると現在のプロンプトだけを送信するため、互いに無関係なファイルを1件ずつ処理する場合などに利用できます。値はワークスペースに保存されます。

**各モードの使い分け：**

- **Vault: 全て** - 通常使用のデフォルトモード。AI は Vault の読み書き・検索が可能です。
- **Vault: 検索なし** - 対象ファイルが事前にわかっている場合に使用。Vault 検索を省略することでトークンを節約し、レスポンスも速くなります。
- **Vault: オフ** - Vault へのアクセスが不要な場合に使用。

**自動モード選択：**

| 条件                                  | デフォルトモード | 変更可能 |
| ------------------------------------- | ---------------- | -------- |
| CLI モデル（Antigravity/Claude/Codex CLI） | Vault: オフ      | 不可     |
| ローカル LLM                          | Vault: オフ      | 不可     |
| Gemma 4 + RAG/Web Search              | Vault: オフ      | 可（RAG/Web Search を無効にするとツールが再有効化） |
| 通常                                  | Vault: 全て      | 可       |

**一部モードが強制される理由：**

- **CLI モデル、Ollama、OpenCode (Local)**: OpenAI 形式の Function Calling に対応していないため、Vault ツールは使用できません。**LM Studio / vLLM / AnythingLLM** のローカル LLM はツール対応モデルであれば Vault ツールを利用可能です。モデルが初回のツール送信を拒否した場合は自動的にフラグが立ち、以降のターンはマーカーモードにフォールバックします（**設定 → ローカル LLM → ツールを再有効化** でフラグをクリアできます）。
- **Gemma 4**: Function Calling と RAG/Web Search は同一リクエストで併用できません。一方が有効な場合、もう一方は自動的に無効になります。

**LLM の Vault ツール許可フォルダ:**

**設定 → Workspace → LLM の Vault tool 許可フォルダ** で、LLM が起動する Vault ツールがアクセスできる Vault フォルダを制限できます。この設定は API プロバイダーとツール対応ローカル LLM、および LLM から起動された skill workflow に適用されます。空のままにすると Vault 全体を許可します。CLI モデルはこれらの Vault ツールを使わないため、この設定の制限対象ではありません。

## 安全な編集

AI が `propose_edit` を使用時：

1. 確認ダイアログで変更内容をプレビュー
2. **適用** をクリックでファイルに書き込み
3. **破棄** をクリックでファイルを変更せずキャンセル

> 確認するまでファイルは変更されません。

## 編集履歴

ノートへの変更を追跡・復元：

- **自動追跡** - すべての AI 編集（チャット、ワークフロー）と手動変更を記録
- **ファイルメニューからアクセス** - Markdown ファイルを右クリック：
  - **スナップショット** - 現在の状態をスナップショットとして保存
  - **履歴** - 編集履歴モーダルを開く


- **コマンドパレット** - "Show edit history" コマンドからもアクセス可能
- **差分表示** - 追加・削除を色分けして変更箇所を正確に表示
- **復元** - ワンクリックで以前のバージョンに戻す
- **コピー** - 履歴バージョンを新しいファイルとして保存（デフォルト名: `{filename}_{datetime}.md`）
- **リサイズ可能なモーダル** - ドラッグで移動、角からリサイズ

**差分の表示形式：**

- `+` 行は古いバージョンに存在していた内容
- `-` 行は新しいバージョンで追加された内容

**仕組み：**

編集履歴はスナップショットベースのアプローチを使用：

1. **スナップショット作成** - ファイルが初めて開かれるか AI によって変更されると、その内容のスナップショットが保存される
2. **差分記録** - ファイルが変更されると、新しい内容とスナップショットの差分が履歴エントリとして記録される
3. **スナップショット更新** - 各変更後、スナップショットは新しい内容に更新される
4. **復元** - 以前のバージョンに復元するには、スナップショットから差分を逆順に適用

**履歴が記録されるタイミング：**

- AI チャット編集（`propose_edit` ツール）
- ワークフローのノート変更（`note` ノード）
- コマンドによる手動保存
- ファイルを開いた時にスナップショットと異なる場合の自動検出

**保存場所：** 編集履歴はメモリ上に保存され、Obsidian の再起動時にクリアされます。永続的なバージョン管理は Obsidian 組み込みのファイル復元機能でカバーされます。


![編集履歴モーダル](docs/images/edit_history.png)

## MCPサーバー

MCP（Model Context Protocol）サーバーは、Vault操作以外のAI機能を拡張する追加ツールを提供します。

**2つのトランスポートモードに対応：**

**HTTP（Streamable HTTP）：**

1. プラグイン設定 → **MCPサーバー**セクションを開く
2. **サーバーを追加** → **HTTP** を選択
3. サーバー名とURLを入力
4. 認証用のオプションヘッダー（JSON形式）を設定
5. **接続テスト**をクリックして接続を確認し、利用可能なツールを取得
6. サーバー設定を保存

**Stdio（ローカルプロセス）：**

1. プラグイン設定 → **MCPサーバー**セクションを開く
2. **サーバーを追加** → **Stdio** を選択
3. サーバー名とコマンドを入力（例：`npx -y @modelcontextprotocol/server-filesystem /path/to/dir`）
4. オプションの環境変数（JSON形式）を設定
5. **接続テスト**をクリックして接続を確認し、利用可能なツールを取得
6. サーバー設定を保存

> **注意：** Stdio トランスポートはローカルプロセスを起動するため、デスクトップ版のみ対応です。保存前に接続テストが必須です。

![MCPサーバー設定](docs/images/setting_mcp.png)

**MCPツールの使用方法：**

- **チャットで：** データベースアイコン（📦）をクリックしてツール設定を開きます。会話ごとにMCPサーバーを有効/無効にできます。
- **ワークフローで：** `mcp`ノードを使用してMCPサーバーツールを呼び出します。

**ツールヒント：** 接続テスト成功後、利用可能なツール名が保存され、設定画面とチャットUIの両方に表示されます。

### MCP Apps（インタラクティブUI）

一部のMCPツールは、ツール結果を視覚的に操作できるインタラクティブUIを返します。この機能は[MCP Apps仕様](https://github.com/anthropics/anthropic-cookbook/tree/main/misc/mcp_apps)に基づいています。


**仕組み：**

- MCPツールがレスポンスメタデータで`ui://`リソースURIを返すと、プラグインはHTMLコンテンツを取得してレンダリングします
- UIはセキュリティのためサンドボックス化されたiframe内で表示されます（`sandbox="allow-scripts allow-forms"`）
- インタラクティブアプリはJSON-RPCブリッジを通じて追加のMCPツールを呼び出したり、コンテキストを更新できます

**チャットでの表示：**
- MCP Appsはアシスタントメッセージ内にインラインで表示され、展開/折りたたみボタンがあります
- ⊕をクリックでフルスクリーン展開、⊖で折りたたみ

**ワークフローでの表示：**
- MCP Appsはワークフロー実行中にモーダルダイアログで表示されます
- ワークフローはユーザー操作を待機し、モーダルが閉じられると続行します

> **セキュリティ：** すべてのMCP Appコンテンツは制限された権限でサンドボックス化されたiframe内で実行されます。iframeは親ページのDOM、Cookie、ローカルストレージにアクセスできません。`allow-scripts`と`allow-forms`のみが有効です。

## エージェントスキル

カスタム指示、参考資料、実行可能なワークフローでAIの機能を拡張します。スキルは[OpenAI Codex](https://github.com/openai/codex)の`.codex/skills/`など、業界標準のエージェントスキルパターンに従います。

- **カスタム指示** - `SKILL.md`ファイルでドメイン固有の動作を定義
- **参考資料** - `references/`にスタイルガイド、テンプレート、チェックリストを含める
- **ワークフロー統合** - スキルがワークフローをFunction Callingツールとして公開可能
- **スラッシュコマンド** - `/folder-name` と入力してスキルを即座に実行・送信
- **CLIモード対応** - Antigravity CLI、Claude CLI、Codex CLI バックエンドでもスキルが動作
- **選択的有効化** - 会話ごとにアクティブなスキルを選択

スキルの作成もワークフローと同じ方法で — **+ New (AI)** を選択し、**「エージェントスキルとして作成」** にチェックを入れて説明を記述するだけ。AI が `SKILL.md` の指示とワークフローの両方を生成します。

> **セットアップ手順と例については、[Agent Skills](docs/okf/llm-hub-help/features/agent-skills.md)を参照してください**

---

# Discord 連携

Obsidian Vault の LLM を Discord の chat bot として接続できます。ユーザーは Discord から AI とチャットしたり、モデルの切り替え、RAG 検索の利用、スラッシュコマンドの実行が可能です。

## セットアップ

### 1. Discord Bot の作成

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. **New Application** → 名前を入力 → **Create**
3. 左サイドバーの **Bot** を選択
4. **Reset Token** をクリック → bot token をコピー（後で使用します）
5. **Privileged Gateway Intents** で **Message Content Intent** を有効化（メッセージテキストの読み取りに必要）

### 2. Bot をサーバーに招待

1. 左サイドバーの **OAuth2** を選択
2. **OAuth2 URL Generator** で **bot** スコープを選択
3. **Bot Permissions** で以下を選択：
   - **Send Messages**
   - **Read Message History**
4. 生成された URL をコピーしてブラウザで開く
5. サーバーを選択して bot を認可

### 3. Obsidian で設定

1. プラグイン設定 → **Discord** セクションを開く
2. **Discord Bot** を有効化
3. bot token を貼り付け
4. **Connect** をクリック（接続前にトークンが検証されます）
5. ステータスインジケーターで bot の接続状態を確認

## 設定オプション

| 設定 | 説明 | デフォルト |
|---------|-------------|---------|
| **Enabled** | Discord bot のオン/オフ切り替え | オフ |
| **Bot Token** | Developer Portal の Discord bot token | — |
| **Respond to DMs** | DM に応答するかどうか | オン |
| **Require @mention** | サーバーチャンネルで @メンション時のみ応答（DM は常に応答） | オン |
| **Allowed Channel IDs** | 制限するチャンネル ID（カンマ区切り、空 = 全チャンネル） | 空 |
| **Allowed User IDs** | 制限するユーザー ID（カンマ区切り、空 = 全ユーザー） | 空 |
| **Model Override** | Discord 用のモデルを指定（空 = 現在選択中のモデル） | 空 |
| **System Prompt Override** | Discord 会話用のカスタムシステムプロンプト | 空 |
| **Max Response Length** | メッセージあたりの最大文字数（1〜2000、Discord の制限） | 2000 |

> [!TIP]
> **チャンネル/ユーザー ID の確認方法：** Discord で**開発者モード**を有効にします（設定 → 詳細設定 → 開発者モード）。チャンネルまたはユーザーを右クリックして **ID をコピー** を選択してください。

## Bot コマンド

Discord で以下のコマンドを使って bot とやり取りできます：

| コマンド | 説明 |
|---------|-------------|
| `!model` | 利用可能なモデルを一覧表示 |
| `!model <name>` | このチャンネルのモデルを切り替え |
| `!rag` | 利用可能な RAG 設定を一覧表示 |
| `!rag <name>` | このチャンネルの RAG 設定を切り替え |
| `!rag off` | このチャンネルの RAG を無効化 |
| `!skill` | 利用可能なスラッシュコマンドを一覧表示 |
| `!skill <name>` | スラッシュコマンドを実行（追加メッセージが必要な場合あり） |
| `!discuss <theme>` | 設定済みの参加者でAI Discussionを開始（バックグラウンド実行） |
| `!reset` | このチャンネルの会話履歴をクリア |
| `!help` | ヘルプメッセージを表示 |

## 機能

- **マルチプロバイダー対応** — 設定済みのすべての LLM プロバイダーで動作（Gemini、OpenAI、Anthropic、OpenRouter、Grok、CLI、ローカル LLM）
- **チャンネルごとの状態管理** — 各 Discord チャンネルが独自の会話履歴、モデル選択、RAG 設定を保持
- **Vault ツール** — プラグイン設定に基づき、AI がノートの読み書き・検索を実行可能。Workspace の LLM Vault ツール許可フォルダ制限も適用されます
- **RAG 連携** — `!rag` コマンドでチャンネルごとにセマンティック検索を有効化可能
- **スラッシュコマンド** — `!skill` でプラグインのスラッシュコマンドを実行
- **長文メッセージの自動分割** — Discord の 2000 文字制限を超えるレスポンスは自然な区切りで自動分割
- **会話メモリ** — チャンネルごとの履歴（最大 20 メッセージ、30 分 TTL）
- **自動再接続** — 指数バックオフによる接続切断からの自動復旧

> [!NOTE]
> 会話履歴はメモリ上にのみ保持され、bot の切断や Obsidian の再起動時にクリアされます。

---

# ワークフロービルダー

Markdown ファイル内で自動化ワークフローを構築。**プログラミング知識は不要**です。やりたいことを自然言語で説明するだけで、AI がワークフローを作成します。

![ビジュアルワークフローエディタ](docs/images/visual_workflow.png)

## AI によるワークフロー & スキル作成

**YAML 構文やノードタイプを学ぶ必要はありません。** やりたいことを自然言語で説明するだけ：

1. プラグインサイドバーの **Workflow** タブを開く
2. ドロップダウンから **+ New (AI)** を選択
3. やりたいことを記述：_「選択したノートを要約して summaries フォルダに保存するワークフローを作成して」_
4. ワークフローではなくエージェントスキルを作成したい場合は **「エージェントスキルとして作成」** にチェック
5. **Generate** をクリック - AI が完全なワークフローを作成

![AI でワークフロー作成](docs/images/create_workflow_with_ai.png)

**既存ワークフローの修正も同様に：**

1. 任意のワークフローを読み込み
2. **AI Modify** ボタンをクリック
3. 変更内容を記述：_「要約を日本語に翻訳するステップを追加して」_
4. 確認して適用


## 利用可能なノードタイプ

24 種類のノードタイプでワークフローを構築できます：

| カテゴリ       | ノード                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| 変数           | `variable`, `set`                                                      |
| 制御           | `if`, `while`                                                          |
| LLM            | `command`                                                              |
| データ         | `http`, `json`, `script`                                               |
| ノート         | `note`, `note-read`, `note-search`, `note-list`, `folder-list`, `open` |
| ファイル       | `file-explorer`, `file-save`                                           |
| プロンプト     | `prompt-file`, `prompt-selection`, `dialog`                            |
| 合成           | `workflow`                                                             |
| 外部連携       | `mcp`, `obsidian-command`                                              |
| ユーティリティ | `sleep`                                                                |

> **詳細なノード仕様と実例は [Workflow Nodes](docs/okf/llm-hub-help/features/workflow-nodes.md) を参照してください**

## ホットキーモード

キーボードショートカットでワークフローを即座に実行：

1. ワークフローに `name:` フィールドを追加
2. ワークフローファイルを開いてドロップダウンから選択
3. Workflow パネルフッターのキーボードアイコン（⌨️）をクリック
4. 設定 → ホットキー → "Workflow: [ワークフロー名]" を検索
5. ホットキーを割り当て（例：`Ctrl+Shift+T`）

ホットキー実行時：

- `prompt-file` はアクティブファイルを自動使用（ダイアログなし）
- `prompt-selection` は現在の選択を使用、選択がなければファイル全体を使用

## イベントトリガー

Obsidian のイベントでワークフローを自動実行：

![イベントトリガー設定](docs/images/event_setting.png)

| イベント       | 説明                                      |
| -------------- | ----------------------------------------- |
| ファイル作成   | 新規ファイル作成時にトリガー              |
| ファイル変更   | ファイル保存時にトリガー（5秒デバウンス） |
| ファイル削除   | ファイル削除時にトリガー                  |
| ファイル名変更 | ファイル名変更時にトリガー                |
| ファイルを開く | ファイルを開いた時にトリガー              |

**イベントトリガーの設定：**

1. ワークフローに `name:` フィールドを追加
2. ワークフローファイルを開いてドロップダウンから選択
3. Workflow パネルフッターの zap アイコン（⚡）をクリック
4. トリガーするイベントを選択
5. 必要に応じてファイルパターンフィルターを追加

**ファイルパターン例：**

- `**/*.md` - 全フォルダのすべての Markdown ファイル
- `journal/*.md` - journal フォルダ内の Markdown ファイルのみ
- `*.md` - ルートフォルダ内の Markdown ファイルのみ
- `**/{daily,weekly}/*.md` - daily または weekly フォルダ内のファイル
- `projects/[a-z]*.md` - 小文字で始まるファイル

**イベント変数：** イベント実行時、以下の変数が自動設定されます：

| 変数                   | 説明                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| `_eventType`        | イベント種別：`create`, `modify`, `delete`, `rename`, `file-open` |
| `_eventFilePath`    | 対象ファイルのパス                                                |
| `_eventFile`        | ファイル情報 JSON（path, basename, name, extension）              |
| `_eventFileContent` | ファイル内容（create/modify/file-open イベント時）                |
| `_eventOldPath`     | 変更前パス（rename イベント時のみ）                               |

> **Note:** `prompt-file` と `prompt-selection` ノードはイベント実行時に自動的にイベントファイルを使用します。`prompt-selection` はファイル全体を選択として扱います。

---

# Dashboard Hub 連携

ダッシュボード機能は、別プラグインの [Dashboard Hub](https://github.com/takeshy/obsidian-dashboard-hub) が提供します。両方のプラグインを有効にすると、LLM Hub は Dashboard Hub に設定済みの AI モデル、チャット連携、Base 生成、テキスト書き換え、ワークフローの生成・実行機能を提供します。また、Dashboard Hub は `dashboard` Agent Skill を実行時に LLM Hub へ登録します。

ダッシュボードの機能、ウィジェット、保存形式、スキーマについては [Dashboard Hub のドキュメント](https://github.com/takeshy/obsidian-dashboard-hub/blob/main/docs/dashboard.md) を参照してください。

---

# Discussion Hub 連携

AI Discussion は、別プラグインの [Discussion Hub](https://github.com/takeshy/obsidian-discussion-hub) が提供します。両方のプラグインを有効にすると、LLM Hub は Discussion Hub に設定済みの API、CLI、ローカルテキストモデルを提供します。Gemini Helper や Local LLM Hub が提供するモデルも同じ討論に参加できます。

討論機能、設定、使い方については [Discussion Hub のドキュメント](https://github.com/takeshy/obsidian-discussion-hub) を参照してください。

---

# 共通

## 対応モデル

### Gemini

| モデル                   | 説明                                      |
| ------------------------ | ----------------------------------------- |
| Gemini 3.1 Pro Preview | 最新のフラッグシップモデル、1Mコンテキスト（推奨） |
| Gemini 3.1 Pro Preview (Custom Tools) | カスタムツールとbash向けに最適化されたエージェントワークフロー |
| Gemini 3.8 Flash | 最新の高速モデル、1Mコンテキスト（推奨） |
| Gemini 3.5 Flash Lite | 最新の高速・低コストモデル、1Mコンテキスト |
| Gemini 3 Pro (Image)     | Pro品質の画像生成、4K                          |
| Gemini 3.1 Flash (Image) | 高速・低コストの画像生成 |
| Gemma 4 | 無料、Function Calling と RAG/Web Search は排他的 |

> **Thinking モード:** チャットでは、メッセージに「考えて」「分析して」「検討して」などのキーワードが含まれると Thinking モードが有効になります。ただし、**Gemini 3.1 Pro** はキーワードに関係なく常に Thinking モードで動作します。このモデルは Thinking の無効化をサポートしていません。

**Always Think トグル:**

キーワードなしで Flash モデルの Thinking モードを強制的に ON にできます。Database icon（📦）をクリックしてツールメニューを開き、**Always Think** のトグルを確認してください：

- **Flash** — デフォルトは OFF。チェックすると Flash モデルで常に Thinking を有効にします。
- **Flash Lite** — デフォルトは ON。Flash Lite は Thinking を有効にしてもコストと速度の差がほとんどないため、ON のままにすることを推奨します。

トグルが ON の場合、メッセージの内容に関わらずそのモデルファミリーで常に Thinking が有効になります。OFF の場合は、既存のキーワードベースの検出が使用されます。

![Always Think Settings](docs/images/setting_thinking.png)

### OpenAI

| モデル | 説明 |
|-------|-------------|
| GPT-5.6 Sol | GPT-5.6 の最高品質モデル、Web 検索をライブ検証済み |
| GPT-5.6 Terra | 性能とコストのバランスを重視した GPT-5.6 モデル |
| GPT-5.6 Luna | 高速・低コストの GPT-5.6 モデル |
| GPT-5.4 | 以前のフラッグシップモデル |
| GPT-5.4-mini | コスト効率の高い中間モデル |
| GPT-5.4-nano | 軽量・高速モデル |
| O3 | 推論モデル |
| DALL-E 3 / DALL-E 2 | 画像生成 |

### Anthropic

| モデル | 説明 |
|-------|-------------|
| Claude Opus 5 | 複雑なエージェント型コーディングと業務用途、Adaptive Thinking対応 |
| Claude Opus 4.8 | 高度な推論とエージェント処理、Web 検索をライブ検証済み |
| Claude Sonnet 5 | バランスの取れたフロンティアモデル、Web 検索をライブ検証済み |
| Claude Fable 5 | 高性能モデル、Web 検索をライブ検証済み |
| Claude Opus 4.6 | 最高性能モデル、拡張思考 |
| Claude Sonnet 4.6 | パフォーマンスとコストのバランス |
| Claude Haiku 4.5 | 高速・軽量モデル、Web 検索をライブ検証済み |

### OpenRouter / Grok / カスタム

カスタムベース URL とモデルで任意の OpenAI 互換エンドポイントを設定可能。OpenRouter は様々なプロバイダーの数百のモデルにアクセスできます。

### OpenCode Zen / Go

OpenCode は同じアカウントから 2 種類のゲートウェイを提供しており、どちらもプロバイダードロップダウンから選択できます。

- **OpenCode Zen** (`https://opencode.ai/zen`) — 都度課金。Big Pickle、MiniMax M2.5 Free など複数の無料モデルを含み、Claude・GPT-5.x など幅広いモデルを提供。`/v1/models` と `/v1/chat/completions` の OpenAI 互換 API を公開しているため、Verify 時にモデルが自動で一覧取得されます。
- **OpenCode Go** (`https://opencode.ai/zen/go`) — 初月 $5、以降 $10/月のサブスクリプション。Grok、GLM、Kimi、DeepSeek、MiMo、MiniMax、Qwen などを厳選。Verify 時に最新の `/v1/models` を取得するため、モデルの追加・廃止が自動で反映されます。

### ローカル LLM

Ollama、LM Studio、vLLM、AnythingLLM、または OpenCode ローカルサーバー経由でローカル実行中のモデルに接続。稼働中のサーバーからモデルが自動検出されます。

## インストール

### コミュニティプラグイン（推奨）

1. Obsidian の **設定 → コミュニティプラグイン** を開く
2. **閲覧**を選び、**LLM Hub** を検索
3. **インストール**し、続けて**有効化**

### 手動インストール

1. リリースから `main.js`, `manifest.json`, `styles.css` をダウンロード
2. `.obsidian/plugins/` に `llm-hub` フォルダを作成
3. ファイルをコピーして Obsidian 設定で有効化

### ソースからビルド

```bash
git clone https://github.com/takeshy/obsidian-llm-hub
cd obsidian-llm-hub
npm install
npm run build
```

## 設定

### API プロバイダー

プラグイン設定で1つ以上の API プロバイダーを追加します。各プロバイダーは独自の API キーとモデル選択を持ちます。

| プロバイダー | API キーの取得 |
|----------|-------------|
| Gemini | [ai.google.dev](https://ai.google.dev) |
| OpenAI | [platform.openai.com](https://platform.openai.com) |
| Anthropic | [console.anthropic.com](https://console.anthropic.com) |
| OpenRouter | [openrouter.ai](https://openrouter.ai) |
| Grok | [console.x.ai](https://console.x.ai) |
| OpenCode Zen | [opencode.ai](https://opencode.ai) |
| OpenCode Go | [opencode.ai](https://opencode.ai) |

カスタム OpenAI 互換エンドポイントも追加できます。

![基本設定](docs/images/setting_basic.png)

### プロキシ

企業ゲートウェイ環境向けに、すべての API リクエストを HTTP CONNECT プロキシ経由でルーティングします。詳しくは[プロキシ設定](docs/okf/llm-hub-help/operations/proxy.md)を参照してください。

### ローカル LLM

ローカルで稼働中の LLM サーバーに接続：

1. ローカルサーバーを起動（Ollama、LM Studio、vLLM、AnythingLLM、OpenCode）
2. プラグイン設定でサーバー URL を入力
3. 「Verify」をクリックして利用可能なモデルを検出

> [!NOTE]
> **LM Studio / vLLM / AnythingLLM** のローカル LLM は OpenAI 形式の Function Calling で Vault ツールを利用できます — ツール対応モデルでは既定で有効です。モデルが初回のツール送信を拒否した場合は自動的にフラグが立ち、以降のターンはマーカー方式のスキルモードにフォールバックします。**設定 → ローカル LLM → ツールを再有効化** で再試行可能。
>
> これらのツールには **設定 → Workspace → LLM の Vault tool 許可フォルダ** が適用されます。API プロバイダーや LLM から起動された skill workflow と同じフォルダ制限です。
>
> **Ollama** と **OpenCode (Local)** は引き続きマーカーモードのみです。これらのフレームワークではノート操作にワークフローまたは RAG を使用してください。

#### OpenCode ローカルサーバー

OpenCode フレームワークは、ローカルで起動した `opencode serve` に接続します。OpenAI 互換の `/v1/chat/completions` ではなく OpenCode 独自の HTTP API を利用し、ストリーミングは `/global/event` SSE 経由で行います。

##### macOS / Linux

1. OpenCode CLI をインストール：
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   ```
2. サーバーを起動：
   ```bash
   opencode serve
   ```
   既定で `http://localhost:4096` で待ち受けます。
3. プラグイン設定 → **ローカル LLM** で **OpenCode (Local)** を選択し、URL は既定の `http://localhost:4096` のまま **Fetch models** をクリックすると、サーバーからプロバイダーとモデルの一覧を取得します。
4. モデルは `<providerID>/<modelID>` 形式（例：`google/gemini-flash-lite-latest`）で表示されます。使うモデルを選んで保存してください。

##### Windows（WSL）

Windows では[公式ドキュメント](https://opencode.ai/docs/ja/windows-wsl)で **WSL 経由の利用が推奨**されています（ファイルシステム性能とツール互換性のため）。Obsidian は Windows ホスト側で動くので、サーバーを外部から到達できるアドレスにバインドし、**必ずパスワードで保護**してください。

1. WSL をインストール（Microsoft の[公式ガイド](https://learn.microsoft.com/windows/wsl/install)）し、WSL ターミナルを開く。
2. WSL 内で OpenCode をインストール：
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   ```
3. パスワード付きで、すべてのインターフェースにバインドして起動：
   ```bash
   OPENCODE_SERVER_PASSWORD='your-password' opencode serve --hostname 0.0.0.0 --port 4096
   ```
   WSL2 は `localhost` を Windows ホストへ自動転送するため、Obsidian からは `http://localhost:4096` で接続できます。解決できない場合は WSL で `hostname -I` を実行し、表示された IP を使って `http://<wsl-ip>:4096` を指定してください。
4. プラグイン設定 → **ローカル LLM** → **OpenCode (Local)** で：
   - **Base URL**: `http://localhost:4096`（または WSL の IP）
   - **Username**: `opencode`（既定値。`OPENCODE_SERVER_USERNAME` を設定した場合はその値）
   - **Password**: `OPENCODE_SERVER_PASSWORD` に設定した値

   **Fetch models** をクリックし、`<providerID>/<modelID>` 形式のモデルを選んで保存してください。

### CLI モード（Antigravity / Claude / Codex）

**Antigravity CLI:**

1. [Antigravity CLI](https://antigravity.google) をインストール
2. `agy` で認証
3. Antigravity CLI セクションで「Verify」をクリック

**Claude CLI:**

1. [Claude Code](https://github.com/anthropics/claude-code) をインストール: `npm install -g @anthropic-ai/claude-code`
2. `claude` で認証
3. Claude CLI セクションで「Verify」をクリック

**Codex CLI:**

1. [Codex CLI](https://github.com/openai/codex) をインストール: `npm install -g @openai/codex`
2. `codex` で認証
3. Codex CLI セクションで「Verify」をクリック

**CLI の制限:** Vault ツール非対応、Web 検索なし、デスクトップ版のみ

**TTY ターミナル:** コマンドパレットから「LLM Hub: Open CLI terminal」を実行すると、Obsidian 内に CLI ターミナルビューを開けます。このビューは `node-pty` と `@xterm/xterm` が利用可能なデスクトップ環境で、Vault ルートを作業ディレクトリにして Antigravity / Claude / Codex の完全な TTY セッションを起動します。

> [!NOTE]
> **CLI のみの利用:** API キーなしで CLI モードを使用できます。CLI ツールをインストールして Verify するだけです。

**カスタム CLI パス:** CLI の自動検出に失敗した場合は、Verify ボタンの横にある歯車アイコン（⚙️）をクリックして、CLI パスを手動で指定できます。プラグインはバージョンマネージャー（nodenv、nvm、volta、fnm、asdf、mise）を含む一般的なインストールパスを自動検索します。

<details>
<summary><b>Windows: CLI パスの確認方法</b></summary>

Leave the CLI path empty and click **Verify** — the plugin looks for `agy` on PATH. Claude's standalone installer at `%LOCALAPPDATA%\Programs\claude\claude.exe` is also picked up automatically.

自動検出に失敗した場合のみ、カスタム CLI パスを指定してください。以下のいずれでも動作します（上が最も安全）:

1. **`.exe` executable** — e.g. `C:\Users\YourName\AppData\Local\Programs\Antigravity\agy.exe`. Runs directly.
2. **`.exe` 実行ファイル** — 例: `C:\Users\YourName\AppData\Local\Programs\claude\claude.exe`。直接実行。
3. **`.cmd` / `.bat` ラッパー** — 例: `C:\Users\YourName\AppData\Roaming\npm\agy.cmd`。`cmd.exe` 経由での実行が必須となるため、プロンプト内の `&`、`|`、`>`、`^`、`%VAR%` 等が誤動作する可能性があります。

PowerShell で `Get-Command agy` / `Get-Command claude` / `Get-Command codex` を実行するとラッパーのパスが表示されます。それを直接指定する（選択肢 3）か、隣接する `.js` / `.exe` に辿ってより安全な選択肢を選んでください。
</details>

<details>
<summary><b>macOS / Linux: CLI パスの確認方法</b></summary>

1. ターミナルを開いて以下を実行：
   ```bash
   which agy
   ```
2. 表示されたパス（例: `/home/user/.local/bin/agy`）を CLI パス設定に入力

Claude CLI の場合は `which claude`、Codex CLI の場合は `which codex` を実行してください。

**Node.js バージョンマネージャー:** nodenv、nvm、volta、fnm、asdf、mise を使用している場合、プラグインは一般的な場所から node バイナリを自動検出します。検出に失敗した場合は、CLI スクリプトのパスを直接指定してください（例: `~/.local/bin/agy`）。
</details>

> [!TIP]
> **Claude CLI ヒント:** LLM Hub のチャットセッションはローカルに保存されます。Obsidian の外で会話を続けるには、Vault ディレクトリで `claude --resume` を実行して過去のセッションを表示・再開できます。

### ワークスペース設定

- **Workspace Folder** - チャット履歴と設定の保存先
- **チャット履歴を自動保存** - 復元可能な履歴をワークスペースフォルダに保存
- **チャット履歴の最大保存件数** - 上限超過時に古い自動履歴を削除。`0`は無制限
- **System Prompt** - AI への追加指示
- **Tool Limits** - 関数呼び出し制限の設定
- **Edit History** - AI による変更を追跡・復元

![ツール制限・編集履歴](docs/images/setting_tool_history.png)

### Chat 設定
- **チャットの手動保存先** - 「ノートとして保存」ボタンで使うVault相対フォルダ。空欄はVault直下
- `YYYYMMDD-HHmmss_チャットタイトル.md`形式で、frontmatterや復元用メタデータを含まない本文のみを出力

### 暗号化

チャット履歴とワークフロー実行ログを個別にパスワード保護。

**設定手順:**

1. プラグイン設定でパスワードを設定（公開鍵暗号方式で安全に保存）

![暗号化初期設定](docs/images/setting_initial_encryption.png)

2. 設定後、各ログタイプの暗号化を切り替え:
   - **AIチャット履歴を暗号化** - チャット会話ファイルを暗号化
   - **ワークフロー実行ログを暗号化** - ワークフロー履歴ファイルを暗号化

![暗号化設定](docs/images/setting_encryption.png)

各設定は独立して有効/無効を切り替えできます。

**機能:**

- **個別制御** - どのログを暗号化するか選択可能（チャット、ワークフロー、または両方）
- **自動暗号化** - 設定に基づいて新規ファイルは保存時に暗号化
- **パスワードキャッシュ** - セッション中は一度入力すればOK
- **専用ビューア** - 暗号化ファイルはプレビュー付きの専用エディタで開く
- **復号オプション** - 必要に応じて個別ファイルの暗号化を解除

**仕組み:**

```
【セットアップ - パスワード設定時に1回だけ】
パスワード → 鍵ペア生成（RSA） → 秘密鍵を暗号化 → 設定に保存

【暗号化 - ファイルごと】
ファイル内容 → 新しいAES鍵で暗号化 → AES鍵を公開鍵で暗号化
→ ファイルに保存: 暗号化データ + 暗号化秘密鍵（設定からコピー） + salt

【復号】
パスワード + salt → 秘密鍵を復元 → AES鍵を復号 → ファイル内容を復号
```

- 鍵ペアは1回だけ生成（RSA生成は重い）、AES鍵はファイルごとに生成
- 各ファイルに保存: 暗号化コンテンツ + 暗号化秘密鍵（設定からコピー） + salt
- ファイルは自己完結型 — パスワードだけで復号可能、プラグイン依存なし

<details>
<summary>Python復号スクリプト（クリックで展開）</summary>

```python
#!/usr/bin/env python3
"""プラグインなしでLLM Hub暗号化ファイルを復号"""
import base64, sys, re, getpass
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import padding

def decrypt_file(filepath: str, password: str) -> str:
    with open(filepath, 'r') as f:
        content = f.read()

    # YAMLフロントマターを解析
    match = re.match(r'^---\n([\s\S]*?)\n---\n([\s\S]*)$', content)
    if not match:
        raise ValueError("無効な暗号化ファイル形式")

    frontmatter, encrypted_data = match.groups()
    key_match = re.search(r'key:\s*(.+)', frontmatter)
    salt_match = re.search(r'salt:\s*(.+)', frontmatter)
    if not key_match or not salt_match:
        raise ValueError("フロントマターにkeyまたはsaltがありません")

    enc_private_key = base64.b64decode(key_match.group(1).strip())
    salt = base64.b64decode(salt_match.group(1).strip())
    data = base64.b64decode(encrypted_data.strip())

    # パスワードから鍵を導出
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=100000)
    derived_key = kdf.derive(password.encode())

    # 秘密鍵を復号
    iv, enc_priv = enc_private_key[:12], enc_private_key[12:]
    private_key_pem = AESGCM(derived_key).decrypt(iv, enc_priv, None)
    private_key = serialization.load_der_private_key(base64.b64decode(private_key_pem), None)

    # 暗号化データを解析: key_length(2) + enc_aes_key + iv(12) + enc_content
    key_len = (data[0] << 8) | data[1]
    enc_aes_key = data[2:2+key_len]
    content_iv = data[2+key_len:2+key_len+12]
    enc_content = data[2+key_len+12:]

    # RSA秘密鍵でAES鍵を復号
    aes_key = private_key.decrypt(enc_aes_key, padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))

    # コンテンツを復号
    return AESGCM(aes_key).decrypt(content_iv, enc_content, None).decode('utf-8')

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"使用法: {sys.argv[0]} <暗号化ファイル>")
        sys.exit(1)
    password = getpass.getpass("パスワード: ")
    print(decrypt_file(sys.argv[1], password))
```

必要: `pip install cryptography`

</details>

> **警告:** パスワードを忘れると、暗号化ファイルは復元できません。パスワードは安全に保管してください。

> **ヒント:** ディレクトリ内のすべてのファイルを一括暗号化するには、ワークフローを使用します。[Workflow Nodes](docs/okf/llm-hub-help/features/workflow-nodes.md#obsidian-command) の「ディレクトリ内の全ファイルを暗号化」の例を参照してください。

![ファイル暗号化ワークフロー](docs/images/enc.png)

**セキュリティ上のメリット:**

- **AIチャットからの保護** - 暗号化ファイルはAIのVault操作（`read_note`ツール）で読み取ることができません。これにより、APIキーなどの機密データがチャット中に誤って漏洩することを防ぎます。
- **ワークフローからのアクセス** - ワークフローでは`note-read`ノードを使用して暗号化ファイルを読み取れます。アクセス時にパスワードダイアログが表示され、入力後はセッション中キャッシュされます。
- **シークレットの安全な保管** - APIキーをワークフローに直接記述する代わりに、暗号化ファイルに保存できます。ワークフローはパスワード認証後に実行時にキーを読み取ります。

### セマンティック検索（RAG）

Vault のコンテンツを LLM の会話に注入するローカルベクトルベースの検索。外部 RAG サーバーは不要 — Embedding の生成と保存はすべてローカルで行われます。

**セットアップ：**

1. 設定 → RAG セクションに移動
2. 新しい RAG 設定を作成（`+` をクリック）
3. Embedding を設定：
   - **デフォルト（Gemini）：** Embedding Base URL を空のまま — Gemini API キーで Gemini Embedding API を使用
   - **カスタムサーバー（Ollama 等）：** Embedding Base URL を設定してモデルを選択
4. **Sync** をクリックして Vault からベクトルインデックスを構築
5. 検索メニューで RAG 設定を選択して有効化（Web Search は同時にチェック可能）

| 設定 | 説明 | デフォルト |
|------|------|-----------|
| **Embedding Base URL** | カスタム Embedding サーバー URL（空 = Gemini API） | 空 |
| **Embedding API Key** | カスタムサーバーの API キー（空 = Gemini キー） | 空 |
| **Embedding Model** | Embedding 生成に使用するモデル名 | `gemini-embedding-2-preview` |
| **Chunk Size** | チャンクあたりの文字数 | 500 |
| **Chunk Overlap** | チャンク間のオーバーラップ | 100 |
| **PDF分割ページ数** | 埋め込みチャンクあたりのPDFページ数（1–6） | 6 |
| **Top K** | クエリごとに取得するチャンクの最大数 | 5 |
| **Score Threshold** | 結果に含める最小類似度スコア（0.0〜1.0） | 0.5 |
| **Target Folders** | インデックス対象を特定フォルダに限定（空 = すべて） | 空 |
| **Exclude Patterns** | インデックスからファイルを除外する正規表現パターン | 空 |

> **マルチモーダルインデックス**（画像、PDF、音声、動画）は、Gemini ネイティブ Embedding モデル（`gemini-embedding-*`）を使用している場合に自動的に有効になります。手動設定は不要です。

**大きな Vault と複数インデックス：**

大きな Vault では、フォルダごとに複数の RAG 設定を作成してそれぞれ同期し、別の RAG 設定で **内部を結合** を選択できます。同期済みの結合元設定を選ぶと、チャットや検索では 1 つの RAG 設定としてまとめて検索できます。結合用設定は、最初に選択した結合元設定の Embedding サーバー、API キー、モデルを使用します。

同期時は、変更されたファイルを少数ずつ処理・保存します。これは RAG の chunk size 設定とは別の、同期処理の保存単位です。大規模な初回同期中に Obsidian がクラッシュしても、次回は保存済みのインデックス状態から再開しやすくなります。

PDF のテキスト抽出に失敗した場合は、同期後に対象 PDF の一覧を表示し、checksum を保存します。その PDF はインデックス済みファイル一覧に `0 chunks` として表示され、PDF ファイル自体が変わらない限り次回以降の同期では再試行されません。再取り込みしたい場合は、PDF のファイル名を変更する、ファイルを更新する、または RAG インデックスを削除して再構築してください。

**外部インデックス：**

Vault からの同期の代わりに、事前構築済みのインデックスを使用：

1. **Index mode** を **外部** に設定
2. `index.json` と `vectors.bin` を含むインデックスディレクトリの絶対パスを 1 行に 1 つずつ入力
3. オプションでクエリ Embedding 用の Embedding Base URL を設定（空 = Gemini API）
4. Embedding モデルはインデックスファイルから自動検出

**仕組み：** RAG が有効な場合、チャットメッセージごとにローカルベクトル検索が実行されます。関連するチャンクがコンテキストとしてシステムプロンプトに注入されます。ソースはチャット UI に表示され、クリックすると参照先のノートが開きます。

### RAG Search タブ

**RAG Search** タブは、RAG 結果の検索、フィルタリング、編集、および Chat や Discussion への送信のための専用インターフェースを提供します。

![RAG Search](docs/images/rag-search.png)

- **セマンティック検索** — Top K とスコア閾値を調整可能
- **キーワードフィルター** — 検索後に結果を絞り込み
- **チャンクエディター** — 前後のチャンク読み込み（前へ/次へ）とオーバーラップ除去
- **Chat または Discussion に送信** — 選択した結果が編集可能な添付ファイルとして追加
- **インデックス設定**（歯車アイコン）— チャンクサイズ、オーバーラップ、対象フォルダ、同期などを設定

> 詳細は [RAG Search ドキュメント](docs/okf/llm-hub-help/features/rag-search.md)をご覧ください。

### スラッシュコマンド

- `/` で呼び出すカスタムプロンプトテンプレートを定義
- コマンドごとにモデルと検索設定を指定可能

![スラッシュコマンド](docs/images/setting_slash_command.png)

## 動作要件

- Obsidian v0.15.0 以上
- API キー（Gemini、OpenAI、Anthropic、OpenRouter、Grok）、ローカル LLM サーバー、CLI ツールのいずれか1つ以上
- デスクトップ版のみ（モバイル版は [Gemini Helper](https://github.com/takeshy/obsidian-gemini-helper) を参照）

## プライバシー

**ローカルに保存されるデータ：**

- API キー（Obsidian 設定に保存）
- チャット履歴（Markdown ファイル、暗号化オプションあり）
- ワークフロー実行履歴（暗号化オプションあり）
- RAG ベクトルインデックス（ワークスペースフォルダに保存）
- 暗号化キー（秘密鍵はパスワードで暗号化）

**LLM プロバイダーに送信されるデータ：**

- チャットメッセージと添付ファイルは、設定された API プロバイダー（Gemini、OpenAI、Anthropic、OpenRouter、Grok、またはカスタムエンドポイント）に送信されます
- Web 検索を有効にすると、検索クエリが選択したプロバイダーのネイティブ検索サービス（Gemini は Google、OpenAI は OpenAI Web Search、Anthropic は Anthropic Web Search、Grok は xAI Web Search）に送信されます
- ローカル LLM プロバイダーはローカルサーバーにのみデータを送信します

**サードパーティサービスへの送信：**

- ワークフローの `http` ノードは、ワークフローで指定された任意の URL にデータを送信できます

**CLI プロバイダー（オプション）：**

- CLI モードを有効にすると、外部 CLI ツール（agy, claude, codex）が child_process 経由で実行されます
- これはユーザーが明示的に設定・検証した場合のみ発生します
- CLI モードは child_process 経由で外部 CLI ツールを実行します

**Discord bot（オプション）：**

- 有効にすると、プラグインは WebSocket Gateway 経由で Discord に接続し、ユーザーメッセージを設定済みの LLM プロバイダーに送信します
- Bot token は Obsidian の設定に保存されます
- Discord チャンネルのメッセージコンテンツは LLM で処理されます — アクセスを制限するには許可チャンネル/ユーザーを設定してください

**MCP サーバー（オプション）：**

- MCP（Model Context Protocol）サーバーは、ワークフローの `mcp` ノード用にプラグイン設定で構成できます
- MCP サーバーは追加のツールと機能を提供する外部サービスです

**セキュリティに関する注意：**

- 実行前にワークフローを確認してください。`http` ノードは Vault データを外部エンドポイントに送信できます
- ワークフローの `note` ノードはデフォルトで書き込み前に確認ダイアログを表示します
- `confirmEdits: false` を設定したスラッシュコマンドは、Apply/Discard ボタンを表示せずにファイル編集を自動適用します
- 機密情報の管理：API キーやトークンをワークフロー YAML（`http` ヘッダー、`mcp` 設定など）に直接記載しないでください。代わりに暗号化ファイルに保存し、`note-read` ノードで実行時に読み込んでください。ワークフローはパスワード入力で暗号化ファイルを読み取れます。

データ保持ポリシーについては各プロバイダーの利用規約を参照してください。

## ライセンス

MIT

## リンク

- [Gemini API ドキュメント](https://ai.google.dev/docs)
- [OpenAI API ドキュメント](https://platform.openai.com/docs)
- [Anthropic API ドキュメント](https://docs.anthropic.com)
- [OpenRouter ドキュメント](https://openrouter.ai/docs)
- [Ollama](https://ollama.com)
- [Obsidian プラグインドキュメント](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## サポート

このプラグインが役に立ったら、コーヒーをおごってください！

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/takeshy)
