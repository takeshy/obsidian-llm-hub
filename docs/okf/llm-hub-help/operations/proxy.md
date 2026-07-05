---
type: Operations
title: Proxy Settings
description: HTTP CONNECT proxy configuration for routing LLM API requests through corporate gateways or forward proxies.
tags: [proxy, network, api, settings]
timestamp: 2026-07-05T00:00:00Z
---

# Proxy Settings

LLM Hub can route LLM API traffic through an HTTP CONNECT proxy. Use this when direct outbound access to API providers is blocked, or when a corporate gateway must mediate provider traffic.

# Typical Setups

Direct forward proxy:

```text
Obsidian --CONNECT--> HTTP proxy --TLS tunnel--> API provider
```

Configure Proxy URL, and leave provider Base URL at its normal provider endpoint.

Corporate gateway:

```text
Obsidian --CONNECT--> HTTP proxy --TLS tunnel--> corporate LLM gateway --> upstream providers
```

Configure Proxy URL, and set each provider Base URL to the corporate gateway endpoint when required. The gateway may inject headers or apply policy before forwarding requests.

# Configuration

Open Settings -> LLM Hub -> Proxy.

Settings:

- Proxy URL - HTTP or HTTPS proxy used for the CONNECT tunnel, for example `http://proxy.internal:8080`.
- Bypass list - comma-separated hosts that connect directly, for example `localhost, 127.0.0.1, ollama.local`.

Proxy authentication is encoded in the URL: `http://user:pass@proxy:8080`.

Proxy settings are desktop-only. Mobile Obsidian hides the proxy UI.

# Proxied Requests

The proxy applies to remote HTTP requests for:

- OpenAI, OpenRouter, Grok, and custom OpenAI-compatible providers: chat, model verification, image generation.
- Anthropic: chat and model verification.
- Gemini: chat, Interactions API, and model verification.
- Embeddings: model discovery and embedding generation for OpenAI-compatible and Gemini-native embeddings.

Local LLM servers and CLI backends are not meant to be proxied. Add local hostnames to the bypass list if needed.

# Bypass Rules

Bypass entries are comma-separated:

- `localhost` matches exactly.
- `.example.com` matches `example.com` and subdomains.
- `*.example.com` behaves like `.example.com`.

# TLS and Certificates

TLS to the target API or corporate gateway runs inside the CONNECT tunnel. The tunnel uses Node.js TLS, which verifies certificates against Node's bundled Mozilla CA list — not the operating system trust store. If a corporate gateway presents an internal CA, provide that CA bundle to Node, for example by setting the `NODE_EXTRA_CA_CERTS` environment variable before launching Obsidian. Installing the CA only in the OS trust store does not affect the tunnel.

# Troubleshooting

- Connection timeout - verify proxy URL and network reachability.
- `407 Proxy Authentication Required` - add proxy credentials to the URL.
- `SELF_SIGNED_CERT` - provide the corporate CA certificate via `NODE_EXTRA_CA_CERTS`.
- Local LLM unreachable - bypass the local server hostname.

# Implementation Notes

The proxy integration is covered by tests in `src/core/proxyFetch.test.ts`. The tests include basic CONNECT proxy behavior, authenticated proxy behavior, fake LLM gateway endpoints, HTTPS tunneling, non-2xx target responses, unreachable targets, and AbortController cancellation.

# Related

- [Settings](./settings.md) lists operational settings.
- [Privacy and Data Flow](./privacy-data-flow.md) explains which integrations can receive data.
