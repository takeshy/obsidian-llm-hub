# Proxy Settings

Configure an HTTP CONNECT proxy to route all LLM API requests through a corporate gateway or forward proxy. This is useful when direct access to API endpoints is blocked by a firewall.

## Typical Setups

### Direct proxy to API provider

Use when outbound HTTPS is blocked but a forward proxy is available:

```
Obsidian ──CONNECT──> Proxy (HTTP) ──tunnel──> api.openai.com (HTTPS)
```

- **Proxy URL** — `http://proxy.internal:8080`
- **Base URL** — Leave as default (e.g. `https://api.openai.com`)

Only the Proxy URL needs to be configured. Provider settings remain unchanged.

### Via corporate gateway

Use when the organization operates its own LLM gateway that forwards to upstream providers:

```
Obsidian ──CONNECT──> Proxy (HTTP) ──tunnel──> Corporate Gateway (HTTPS) ──> OpenAI / Anthropic / Gemini
```

- **Proxy URL** — `http://proxy.internal:8080`
- **Base URL** (per provider) — The corporate gateway endpoint (e.g. `https://llm-gateway.corp.example.com`)

The proxy may inject additional headers required by the gateway (e.g. `x-api-key`) before forwarding the request.

---

In both cases, the plugin establishes an HTTP CONNECT tunnel through the proxy, then opens a TLS connection to the target inside the tunnel.

## Configuration

Open **Settings > LLM Hub > Proxy**.

| Setting | Description | Example |
|---------|-------------|---------|
| **Proxy URL** | HTTP(S) proxy for the CONNECT tunnel | `http://proxy.internal:8080` |
| **Bypass list** | Comma-separated hosts that skip the proxy | `localhost, 127.0.0.1, ollama.local` |

Proxy authentication is supported via URL credentials: `http://user:pass@proxy:8080`.

> **Note:** Proxy settings are desktop only. The setting UI is hidden on mobile.

## What Gets Proxied

All HTTP requests from the following providers are routed through the proxy:

| Provider | Proxied Requests |
|----------|-----------------|
| **OpenAI / OpenRouter / Grok / Custom** | Chat, model verification, image generation |
| **Anthropic** | Chat, model verification |
| **Gemini** | Chat (including Interactions API), model verification |
| **Embeddings** | Model discovery, embedding generation (both OpenAI-compatible and Gemini native) |

Local LLM servers (Ollama, LM Studio, vLLM) and CLI backends are **not** proxied — add their hostnames to the bypass list if needed.

## Bypass List

Hosts in the bypass list connect directly without the proxy. Supported formats:

| Format | Matches |
|--------|---------|
| `localhost` | Exact match |
| `.example.com` | `example.com` and all subdomains |
| `*.example.com` | Same as `.example.com` |

Multiple entries are comma-separated: `localhost, 127.0.0.1, .local`.

## TLS Certificates

The TLS connection to the corporate gateway runs inside the CONNECT tunnel. Certificate verification uses the operating system's certificate store (via Electron/Node.js). If your corporate gateway uses a certificate signed by an internal CA, ensure the CA certificate is installed on the machine.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Connection timeout | Proxy URL incorrect or proxy unreachable | Verify proxy URL and network access |
| `407 Proxy Authentication Required` | Proxy requires credentials | Add `user:pass@` to the proxy URL |
| `SELF_SIGNED_CERT` error | Corporate gateway uses internal CA | Install the CA certificate in the OS trust store |
| Local LLM not working | Local server routed through proxy | Add the local server hostname to the bypass list |

## Building Your Own Proxy Server

If you need to build a custom CONNECT proxy (e.g. to add `x-api-key` injection or logging), the integration test suite includes working proxy server implementations that can serve as a starting point:

**[`src/core/proxyFetch.test.ts`](../src/core/proxyFetch.test.ts)**

| Function | Description |
|----------|-------------|
| `createProxyServer()` | Basic HTTP CONNECT proxy with optional Proxy-Authorization (Basic auth) |
| `createProxyServer({ requireAuth })` | Authenticated proxy that rejects requests without valid credentials (407) |
| `createLlmGateway()` | Fake LLM API server (no CORS headers) — responds to `/v1/models`, `/v1/chat/completions`, `/v1/embeddings`, `/api/tags` |
| `createHttpsLlmGateway()` | HTTPS version of the above — used to test TLS inside CONNECT tunnels |

The tests cover the following scenarios end-to-end:

| Scenario | Test |
|----------|------|
| GET `/v1/models` through proxy (provider verification) | `fetches /v1/models through proxy` |
| POST `/v1/chat/completions` through proxy (chat) | `posts /v1/chat/completions through proxy` |
| POST `/v1/embeddings` through proxy (RAG) | `posts /v1/embeddings through proxy` |
| GET `/api/tags` through proxy (Ollama model discovery) | `fetches /api/tags through proxy` |
| Proxy authentication (Basic) | `works through authenticated proxy` |
| Proxy authentication failure (407) | `rejects with 407 when proxy credentials are wrong` |
| HTTPS target through CONNECT tunnel (TLS) | `tunnels GET /v1/models through proxy to HTTPS target` |
| HTTPS target with POST body | `tunnels POST /v1/chat/completions through proxy to HTTPS target` |
| Target returns non-2xx through proxy | `returns 401 for invalid API key`, `returns 404 for unknown endpoints` |
| Unreachable target | `rejects when target behind proxy is unreachable` |
| Request abort via AbortController | `aborts in-flight request via AbortController` |
