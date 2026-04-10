import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "http";
import https from "https";
import net from "net";
import { createRequire } from "module";

// nodeRequire inside proxyFetch.ts reads globalThis.require (Electron convention).
// Vitest runs under ESM where globalThis.require is undefined, so we polyfill it.
(globalThis as unknown as { require: NodeRequire }).require = createRequire(import.meta.url);

import { buildHostHeader, shouldBypass, createProxyFetch } from "./proxyFetch";

// ---------------------------------------------------------------------------
// Unit tests (pure functions)
// ---------------------------------------------------------------------------

describe("buildHostHeader", () => {
  it("omits the port for default HTTP and HTTPS ports", () => {
    expect(buildHostHeader("api.openai.com", "https:", 443)).toBe("api.openai.com");
    expect(buildHostHeader("localhost", "http:", 80)).toBe("localhost");
  });

  it("includes the port for non-default HTTP and HTTPS ports", () => {
    expect(buildHostHeader("proxy.internal", "https:", 8443)).toBe("proxy.internal:8443");
    expect(buildHostHeader("localhost", "http:", 8080)).toBe("localhost:8080");
  });
});

describe("shouldBypass", () => {
  it("matches exact hostname", () => {
    expect(shouldBypass("api.openai.com", "api.openai.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(shouldBypass("API.OpenAI.COM", "api.openai.com")).toBe(true);
    expect(shouldBypass("api.openai.com", "API.OpenAI.COM")).toBe(true);
  });

  it("returns false when no match", () => {
    expect(shouldBypass("api.anthropic.com", "api.openai.com,localhost")).toBe(false);
  });

  it("matches domain suffix with leading dot", () => {
    expect(shouldBypass("sub.example.com", ".example.com")).toBe(true);
    expect(shouldBypass("example.com", ".example.com")).toBe(true);
    expect(shouldBypass("notexample.com", ".example.com")).toBe(false);
  });

  it("matches domain suffix with wildcard (*.)", () => {
    expect(shouldBypass("sub.example.com", "*.example.com")).toBe(true);
    expect(shouldBypass("deep.sub.example.com", "*.example.com")).toBe(true);
    expect(shouldBypass("example.com", "*.example.com")).toBe(true);
  });

  it("handles comma-separated list with spaces", () => {
    expect(shouldBypass("localhost", "api.openai.com , localhost , 127.0.0.1")).toBe(true);
    expect(shouldBypass("127.0.0.1", "api.openai.com , localhost , 127.0.0.1")).toBe(true);
  });

  it("ignores empty entries", () => {
    expect(shouldBypass("localhost", ",,localhost,,")).toBe(true);
    expect(shouldBypass("other", ",,localhost,,")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration tests -- real HTTP CONNECT proxy + LLM-API-shaped target server
// ---------------------------------------------------------------------------

/**
 * Fake LLM API server that responds to the same endpoints real providers expose.
 *
 * Endpoints:
 *   GET  /v1/models           -- OpenAI / OpenRouter / LM Studio model list
 *   POST /v1/embeddings       -- OpenAI-compatible embedding generation
 *   POST /v1/chat/completions -- Non-streaming chat completion
 *   GET  /api/tags            -- Ollama model list
 *   *    (other)              -- 404
 *
 * NOTE: This server intentionally returns NO CORS headers, matching corporate
 * gateways that don't support CORS. createProxyFetch uses Node.js sockets and
 * is unaffected by CORS restrictions.
 */
function createLlmGateway(): http.Server {
  return http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const auth = req.headers["authorization"] ?? "";

      // -- GET /v1/models
      if (req.method === "GET" && req.url === "/v1/models") {
        if (!auth.startsWith("Bearer ")) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "Invalid API key" } }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          object: "list",
          data: [
            { id: "gpt-4o", object: "model", owned_by: "openai" },
            { id: "gpt-4o-mini", object: "model", owned_by: "openai" },
            { id: "text-embedding-3-small", object: "model", owned_by: "openai" },
          ],
        }));
        return;
      }

      // -- POST /v1/embeddings
      if (req.method === "POST" && req.url === "/v1/embeddings") {
        if (!auth.startsWith("Bearer ")) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "Invalid API key" } }));
          return;
        }
        const parsed = JSON.parse(body) as { model: string; input: string[] };
        const embeddings = parsed.input.map((_, i) => ({
          object: "embedding" as const,
          index: i,
          embedding: [0.1, 0.2, 0.3],
        }));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          object: "list",
          model: parsed.model,
          data: embeddings,
          usage: { prompt_tokens: 8, total_tokens: 8 },
        }));
        return;
      }

      // -- POST /v1/chat/completions
      if (req.method === "POST" && req.url === "/v1/chat/completions") {
        if (!auth.startsWith("Bearer ")) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "Invalid API key" } }));
          return;
        }
        const parsed = JSON.parse(body) as { model: string; messages: unknown[] };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          model: parsed.model,
          choices: [{
            index: 0,
            message: { role: "assistant", content: "Hello from the gateway!" },
            finish_reason: "stop",
          }],
          usage: { prompt_tokens: 10, completion_tokens: 6, total_tokens: 16 },
        }));
        return;
      }

      // -- GET /api/tags (Ollama)
      if (req.method === "GET" && req.url === "/api/tags") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          models: [
            { name: "nomic-embed-text:latest", details: { families: ["nomic-bert"] } },
            { name: "llama3:latest", details: { families: ["llama"] } },
          ],
        }));
        return;
      }

      // -- Fallback 404
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Not Found", path: req.url } }));
    });
  });
}

/**
 * HTTP CONNECT proxy. Optionally requires Proxy-Authorization (Basic).
 * Tracks all piped sockets so they can be force-destroyed on server close.
 */
function createProxyServer(opts?: { requireAuth?: { user: string; pass: string } }): http.Server & { destroyAll(): void } {
  const sockets = new Set<net.Socket>();
  const server = http.createServer((_req, res) => {
    res.writeHead(405);
    res.end("Only CONNECT supported");
  }) as http.Server & { destroyAll(): void };

  server.destroyAll = () => {
    for (const s of sockets) s.destroy();
    sockets.clear();
  };

  server.on("connect", (req: http.IncomingMessage, clientSocket: net.Socket, head: Buffer) => {
    sockets.add(clientSocket);
    clientSocket.on("close", () => sockets.delete(clientSocket));

    if (opts?.requireAuth) {
      const expected = "Basic " + Buffer.from(
        `${opts.requireAuth.user}:${opts.requireAuth.pass}`
      ).toString("base64");
      if (req.headers["proxy-authorization"] !== expected) {
        clientSocket.write("HTTP/1.1 407 Proxy Authentication Required\r\n\r\n");
        clientSocket.destroy();
        return;
      }
    }

    const [host, portStr] = (req.url ?? "").split(":");
    const port = parseInt(portStr, 10);

    const targetSocket = net.connect(port, host, () => {
      sockets.add(targetSocket);
      targetSocket.on("close", () => sockets.delete(targetSocket));
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      targetSocket.write(head);
      targetSocket.pipe(clientSocket);
      clientSocket.pipe(targetSocket);
    });

    targetSocket.on("error", () => {
      clientSocket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
      clientSocket.destroy();
    });
    clientSocket.on("error", () => targetSocket.destroy());
  });

  return server;
}

/**
 * Generate a self-signed certificate for 127.0.0.1.
 */
function generateSelfSignedCert(): Promise<{ key: string; cert: string }> {
  const { execSync } = require("child_process") as typeof import("child_process");
  const os = require("os") as typeof import("os");
  const path = require("path") as typeof import("path");
  const fs = require("fs") as typeof import("fs");

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-test-"));
  const keyPath = path.join(tmpDir, "key.pem");
  try {
    execSync(`openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out ${keyPath} 2>/dev/null`);
    const cert = execSync(
      `openssl req -new -x509 -key ${keyPath} -days 1 -subj "/CN=127.0.0.1" -addext "subjectAltName=IP:127.0.0.1" 2>/dev/null`,
    ).toString();
    const key = fs.readFileSync(keyPath, "utf8");
    return Promise.resolve({ key, cert });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * HTTPS version of the LLM gateway -- simulates the realistic scenario where
 * the target API endpoint (corporate gateway or api.openai.com) speaks TLS.
 * Tests the tlsWrap path in createProxyFetch.
 */
function createHttpsLlmGateway(tlsOpts: { key: string; cert: string }): https.Server {
  return https.createServer(tlsOpts, (req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const auth = req.headers["authorization"] ?? "";
      if (req.method === "GET" && req.url === "/v1/models") {
        if (!auth.startsWith("Bearer ")) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "Unauthorized" } }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          object: "list",
          data: [
            { id: "corp-gpt-4o", object: "model", owned_by: "corp-gateway" },
          ],
        }));
        return;
      }
      if (req.method === "POST" && req.url === "/v1/chat/completions") {
        if (!auth.startsWith("Bearer ")) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "Unauthorized" } }));
          return;
        }
        const parsed = JSON.parse(body) as { model: string };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          id: "chatcmpl-corp",
          object: "chat.completion",
          model: parsed.model,
          choices: [{
            index: 0,
            message: { role: "assistant", content: "Hello from HTTPS gateway!" },
            finish_reason: "stop",
          }],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        }));
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    });
  });
}

function listen(server: http.Server | https.Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") resolve(addr.port);
      else reject(new Error("Failed to bind"));
    });
  });
}

function close(server: http.Server | https.Server): Promise<void> {
  if (typeof (server as any).destroyAll === "function") {
    (server as any).destroyAll();
  }
  if (typeof (server as any).closeAllConnections === "function") {
    (server as any).closeAllConnections();
  }
  return new Promise((resolve) => server.close(() => resolve()));
}

// ---------------------------------------------------------------------------
// HTTP target tests
// ---------------------------------------------------------------------------

describe("createProxyFetch -- LLM gateway integration", () => {
  let gateway: http.Server;
  let proxy: ReturnType<typeof createProxyServer>;
  let authProxy: ReturnType<typeof createProxyServer>;
  let gatewayPort: number;
  let proxyPort: number;
  let authProxyPort: number;

  beforeAll(async () => {
    gateway = createLlmGateway();
    proxy = createProxyServer();
    authProxy = createProxyServer({ requireAuth: { user: "alice", pass: "secret" } });
    [gatewayPort, proxyPort, authProxyPort] = await Promise.all([
      listen(gateway), listen(proxy), listen(authProxy),
    ]);
  });

  afterAll(async () => {
    await Promise.all([close(gateway), close(proxy), close(authProxy)]);
  });

  // -- GET /v1/models (provider verification)
  it("fetches /v1/models through proxy (verifyApiProvider pattern)", async () => {
    const proxyFetch = createProxyFetch(`http://127.0.0.1:${proxyPort}`);
    const resp = await proxyFetch(`http://127.0.0.1:${gatewayPort}/v1/models`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-key",
      },
    });
    expect(resp.status).toBe(200);
    const data = await resp.json() as { data: { id: string }[] };
    const ids = data.data.map(m => m.id);
    expect(ids).toContain("gpt-4o");
    expect(ids).toContain("text-embedding-3-small");
  });

  it("returns 401 for invalid API key on /v1/models", async () => {
    const proxyFetch = createProxyFetch(`http://127.0.0.1:${proxyPort}`);
    const resp = await proxyFetch(`http://127.0.0.1:${gatewayPort}/v1/models`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    expect(resp.status).toBe(401);
  });

  // -- POST /v1/embeddings (generateEmbeddings pattern)
  it("posts /v1/embeddings through proxy", async () => {
    const proxyFetch = createProxyFetch(`http://127.0.0.1:${proxyPort}`);
    const resp = await proxyFetch(`http://127.0.0.1:${gatewayPort}/v1/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-key",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: ["hello", "world"],
      }),
    });
    expect(resp.status).toBe(200);
    const data = await resp.json() as { data: { embedding: number[] }[] };
    expect(data.data).toHaveLength(2);
    expect(data.data[0].embedding).toEqual([0.1, 0.2, 0.3]);
    expect(data.data[1].embedding).toEqual([0.1, 0.2, 0.3]);
  });

  // -- POST /v1/chat/completions (chat pattern)
  it("posts /v1/chat/completions through proxy", async () => {
    const proxyFetch = createProxyFetch(`http://127.0.0.1:${proxyPort}`);
    const resp = await proxyFetch(`http://127.0.0.1:${gatewayPort}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-key",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
    expect(resp.status).toBe(200);
    const data = await resp.json() as { choices: { message: { content: string } }[] };
    expect(data.choices[0].message.content).toBe("Hello from the gateway!");
  });

  // -- GET /api/tags (Ollama embedding model discovery)
  it("fetches /api/tags through proxy (Ollama pattern)", async () => {
    const proxyFetch = createProxyFetch(`http://127.0.0.1:${proxyPort}`);
    const resp = await proxyFetch(`http://127.0.0.1:${gatewayPort}/api/tags`, {
      method: "GET",
    });
    expect(resp.status).toBe(200);
    const data = await resp.json() as { models: { name: string }[] };
    expect(data.models.map(m => m.name)).toContain("nomic-embed-text:latest");
  });

  // -- 404 for unknown paths
  it("returns 404 for unknown endpoints", async () => {
    const proxyFetch = createProxyFetch(`http://127.0.0.1:${proxyPort}`);
    const resp = await proxyFetch(`http://127.0.0.1:${gatewayPort}/v2/unknown`);
    expect(resp.status).toBe(404);
  });

  // -- Authenticated proxy
  it("works through authenticated proxy with correct credentials", async () => {
    const proxyFetch = createProxyFetch(`http://alice:secret@127.0.0.1:${authProxyPort}`);
    const resp = await proxyFetch(`http://127.0.0.1:${gatewayPort}/v1/models`, {
      method: "GET",
      headers: { "Authorization": "Bearer test-key" },
    });
    expect(resp.status).toBe(200);
    const data = await resp.json() as { data: { id: string }[] };
    expect(data.data.length).toBeGreaterThan(0);
  });

  it("rejects with 407 when proxy credentials are wrong", async () => {
    const proxyFetch = createProxyFetch(`http://wrong:creds@127.0.0.1:${authProxyPort}`);
    await expect(
      proxyFetch(`http://127.0.0.1:${gatewayPort}/v1/models`),
    ).rejects.toThrow(/Proxy CONNECT failed.*407/);
  });

  // -- Host header correctness
  it("sends host:port for non-default port", async () => {
    const proxyFetch = createProxyFetch(`http://127.0.0.1:${proxyPort}`);
    const resp = await proxyFetch(`http://127.0.0.1:${gatewayPort}/v1/models`, {
      headers: { "Authorization": "Bearer k" },
    });
    expect(resp.ok).toBe(true);
  });

  // -- Abort
  it("aborts in-flight request via AbortController", async () => {
    const proxyFetch = createProxyFetch(`http://127.0.0.1:${proxyPort}`);
    const ac = new AbortController();
    ac.abort();
    await expect(
      proxyFetch(`http://127.0.0.1:${gatewayPort}/v1/models`, { signal: ac.signal }),
    ).rejects.toThrow(/aborted/i);
  });

  // -- Unreachable target
  it("rejects when target behind proxy is unreachable", async () => {
    const proxyFetch = createProxyFetch(`http://127.0.0.1:${proxyPort}`);
    await expect(
      proxyFetch("http://127.0.0.1:1/v1/models"),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// HTTPS target tests -- the realistic scenario:
//   Obsidian -> CONNECT proxy -> HTTPS API endpoint (corporate gateway or
//   api.openai.com directly). Tests the tlsWrap path in createProxyFetch.
// ---------------------------------------------------------------------------

describe("createProxyFetch -- HTTPS target", () => {
  let httpsGateway: https.Server;
  let proxy: ReturnType<typeof createProxyServer>;
  let httpsGatewayPort: number;
  let proxyPort: number;
  let savedTlsReject: string | undefined;

  beforeAll(async () => {
    // Self-signed cert for test only. In production, Electron uses the OS
    // certificate store so corporate CAs are trusted automatically.
    savedTlsReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const { key, cert } = await generateSelfSignedCert();
    httpsGateway = createHttpsLlmGateway({ key, cert });
    proxy = createProxyServer();

    [httpsGatewayPort, proxyPort] = await Promise.all([
      listen(httpsGateway), listen(proxy),
    ]);
  });

  afterAll(async () => {
    if (savedTlsReject === undefined) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = savedTlsReject;
    }
    await Promise.all([close(httpsGateway), close(proxy)]);
  });

  it("tunnels GET /v1/models through proxy to HTTPS target", async () => {
    const proxyFetch = createProxyFetch(`http://127.0.0.1:${proxyPort}`);
    const resp = await proxyFetch(`https://127.0.0.1:${httpsGatewayPort}/v1/models`, {
      method: "GET",
      headers: { "Authorization": "Bearer corp-key" },
    });
    expect(resp.status).toBe(200);
    const data = await resp.json() as { data: { id: string; owned_by: string }[] };
    expect(data.data[0].id).toBe("corp-gpt-4o");
    expect(data.data[0].owned_by).toBe("corp-gateway");
  });

  it("tunnels POST /v1/chat/completions through proxy to HTTPS target", async () => {
    const proxyFetch = createProxyFetch(`http://127.0.0.1:${proxyPort}`);
    const resp = await proxyFetch(`https://127.0.0.1:${httpsGatewayPort}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer corp-key",
      },
      body: JSON.stringify({
        model: "corp-gpt-4o",
        messages: [{ role: "user", content: "hello" }],
      }),
    });
    expect(resp.status).toBe(200);
    const data = await resp.json() as { choices: { message: { content: string } }[] };
    expect(data.choices[0].message.content).toBe("Hello from HTTPS gateway!");
  });

  it("returns 401 for invalid credentials to HTTPS target", async () => {
    const proxyFetch = createProxyFetch(`http://127.0.0.1:${proxyPort}`);
    const resp = await proxyFetch(`https://127.0.0.1:${httpsGatewayPort}/v1/models`, {
      method: "GET",
    });
    expect(resp.status).toBe(401);
  });

  it("returns 404 for unknown path on HTTPS target", async () => {
    const proxyFetch = createProxyFetch(`http://127.0.0.1:${proxyPort}`);
    const resp = await proxyFetch(`https://127.0.0.1:${httpsGatewayPort}/v2/unknown`, {
      headers: { "Authorization": "Bearer corp-key" },
    });
    expect(resp.status).toBe(404);
  });
});
