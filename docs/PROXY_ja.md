# プロキシ設定

HTTP CONNECTプロキシを設定して、すべてのLLM APIリクエストを企業ゲートウェイまたはフォワードプロキシ経由でルーティングします。ファイアウォールでAPIエンドポイントへの直接アクセスがブロックされている環境で使用します。

## 想定構成

### APIプロバイダへの直接プロキシ

外向きHTTPSがブロックされているが、フォワードプロキシが利用可能な場合：

```
Obsidian ──CONNECT──> プロキシ (HTTP) ──tunnel──> api.openai.com (HTTPS)
```

- **プロキシURL** — `http://proxy.internal:8080`
- **ベースURL** — デフォルトのまま（例：`https://api.openai.com`）

プロキシURLのみ設定すれば動作します。プロバイダ設定は変更不要です。

### 企業ゲートウェイ経由

組織が独自のLLMゲートウェイを運用し、上流プロバイダに転送する場合：

```
Obsidian ──CONNECT──> プロキシ (HTTP) ──tunnel──> 企業ゲートウェイ (HTTPS) ──> OpenAI / Anthropic / Gemini
```

- **プロキシURL** — `http://proxy.internal:8080`
- **ベースURL**（プロバイダごと） — 企業ゲートウェイのエンドポイント（例：`https://llm-gateway.corp.example.com`）

プロキシがゲートウェイに必要な追加ヘッダー（`x-api-key`など）を付与してからリクエストを転送します。

---

いずれの場合も、プラグインはプロキシを通じてHTTP CONNECTトンネルを確立し、トンネル内でターゲットへのTLS接続を開きます。

## 設定方法

**設定 > LLM Hub > プロキシ** を開きます。

| 設定 | 説明 | 例 |
|------|------|-----|
| **プロキシURL** | CONNECTトンネル用のHTTP(S)プロキシ | `http://proxy.internal:8080` |
| **除外リスト** | プロキシを経由しないホスト（カンマ区切り） | `localhost, 127.0.0.1, ollama.local` |

プロキシ認証はURL内の資格情報で対応：`http://user:pass@proxy:8080`

> **注意:** プロキシ設定はデスクトップ専用です。モバイルでは設定UIは表示されません。

## プロキシ対象

以下のプロバイダからのすべてのHTTPリクエストがプロキシを経由します：

| プロバイダ | プロキシ対象のリクエスト |
|-----------|----------------------|
| **OpenAI / OpenRouter / Grok / カスタム** | チャット、モデル検証、画像生成 |
| **Anthropic** | チャット、モデル検証 |
| **Gemini** | チャット（Interactions API含む）、モデル検証 |
| **Embeddings** | モデル検出、エンベディング生成（OpenAI互換・Geminiネイティブ両対応） |

ローカルLLMサーバー（Ollama、LM Studio、vLLM）およびCLIバックエンドはプロキシを経由しません。必要に応じてホスト名を除外リストに追加してください。

## 除外リスト

除外リストに含まれるホストはプロキシを経由せず直接接続します。対応フォーマット：

| フォーマット | マッチ対象 |
|------------|----------|
| `localhost` | 完全一致 |
| `.example.com` | `example.com` およびすべてのサブドメイン |
| `*.example.com` | `.example.com` と同じ |

複数エントリはカンマ区切り：`localhost, 127.0.0.1, .local`

## TLS証明書

企業ゲートウェイへのTLS接続はCONNECTトンネル内で実行されます。証明書の検証にはOS（Electron/Node.js経由）の証明書ストアが使用されます。企業ゲートウェイが内部CAで署名された証明書を使用している場合は、マシンにCA証明書がインストールされていることを確認してください。

## トラブルシューティング

| 症状 | 原因 | 対処法 |
|------|------|--------|
| 接続タイムアウト | プロキシURLが間違いまたはプロキシに到達不可 | プロキシURLとネットワークアクセスを確認 |
| `407 Proxy Authentication Required` | プロキシが認証を要求 | プロキシURLに `user:pass@` を追加 |
| `SELF_SIGNED_CERT` エラー | 企業ゲートウェイが内部CAを使用 | CA証明書をOSの信頼ストアにインストール |
| ローカルLLMが動作しない | ローカルサーバーがプロキシ経由になっている | ローカルサーバーのホスト名を除外リストに追加 |

## 自前プロキシサーバーの構築

`x-api-key`の付与やログ記録など、カスタムCONNECTプロキシを構築する場合、結合テストに動作するプロキシサーバーの実装例があります：

**[`src/core/proxyFetch.test.ts`](../src/core/proxyFetch.test.ts)**

| 関数 | 説明 |
|------|------|
| `createProxyServer()` | 基本的なHTTP CONNECTプロキシ（Proxy-Authorization Basic認証オプション付き） |
| `createProxyServer({ requireAuth })` | 認証付きプロキシ（資格情報なしのリクエストを407で拒否） |
| `createLlmGateway()` | 擬似LLM APIサーバー（CORSヘッダーなし）— `/v1/models`、`/v1/chat/completions`、`/v1/embeddings`、`/api/tags` に応答 |
| `createHttpsLlmGateway()` | 上記のHTTPS版 — CONNECTトンネル内のTLS接続テスト用 |

テストは以下のシナリオをend-to-endでカバーしています：

| シナリオ | テスト名 |
|---------|---------|
| GET `/v1/models` プロキシ経由（プロバイダ検証） | `fetches /v1/models through proxy` |
| POST `/v1/chat/completions` プロキシ経由（チャット） | `posts /v1/chat/completions through proxy` |
| POST `/v1/embeddings` プロキシ経由（RAG） | `posts /v1/embeddings through proxy` |
| GET `/api/tags` プロキシ経由（Ollamaモデル検出） | `fetches /api/tags through proxy` |
| プロキシ認証（Basic） | `works through authenticated proxy` |
| プロキシ認証失敗（407） | `rejects with 407 when proxy credentials are wrong` |
| CONNECTトンネル内のHTTPSターゲット（TLS） | `tunnels GET /v1/models through proxy to HTTPS target` |
| HTTPSターゲットへのPOST | `tunnels POST /v1/chat/completions through proxy to HTTPS target` |
| ターゲットの非2xxレスポンス | `returns 401 for invalid API key`、`returns 404 for unknown endpoints` |
| ターゲット到達不可 | `rejects when target behind proxy is unreachable` |
| AbortControllerによるリクエスト中断 | `aborts in-flight request via AbortController` |
