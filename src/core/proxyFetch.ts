/**
 * Proxy-aware fetch implementation.
 * Creates a custom fetch function that tunnels HTTP(S) requests through
 * an HTTP CONNECT proxy. Desktop only (requires Node.js builtins).
 */

/**
 * Dynamically load a Node.js built-in module (desktop only).
 */
function nodeRequire<T>(id: string): T {
  const loader =
    (globalThis as unknown as { require?: (id: string) => unknown }).require ||
    (globalThis as unknown as { module?: { require?: (id: string) => unknown } }).module?.require;
  if (!loader) {
    throw new Error(`${id} is not available in this environment`);
  }
  return loader(id) as T;
}

/** Default timeout for CONNECT tunnel establishment (30 seconds). */
const CONNECT_TIMEOUT_MS = 30_000;

/**
 * Establish an HTTP CONNECT tunnel through a proxy.
 * Returns the raw TCP socket connected to the target through the proxy.
 */
function connectTunnel(
  proxyUrl: URL,
  targetHost: string,
  targetPort: number,
): Promise<import("net").Socket> {
  const http = nodeRequire<typeof import("http")>("http");
  const https = nodeRequire<typeof import("https")>("https");

  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      Host: `${targetHost}:${targetPort}`,
    };
    if (proxyUrl.username || proxyUrl.password) {
      const auth = Buffer.from(
        `${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`
      ).toString("base64");
      headers["Proxy-Authorization"] = `Basic ${auth}`;
    }

    const isProxyHttps = proxyUrl.protocol === "https:";
    const mod = isProxyHttps ? https : http;
    const connectReq = mod.request({
      host: proxyUrl.hostname,
      port: parseInt(proxyUrl.port) || (isProxyHttps ? 443 : 80),
      method: "CONNECT",
      path: `${targetHost}:${targetPort}`,
      headers,
    });

    const timer = setTimeout(() => {
      connectReq.destroy();
      reject(new Error(`Proxy CONNECT timed out after ${CONNECT_TIMEOUT_MS}ms`));
    }, CONNECT_TIMEOUT_MS);

    connectReq.on("connect", (res, socket) => {
      clearTimeout(timer);
      if (res.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed: ${res.statusCode} ${res.statusMessage}`));
        return;
      }
      resolve(socket);
    });

    connectReq.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    connectReq.end();
  });
}

/**
 * Wrap a raw socket with TLS.
 */
function tlsWrap(
  socket: import("net").Socket,
  servername: string,
): Promise<import("tls").TLSSocket> {
  const tls = nodeRequire<typeof import("tls")>("tls");
  return new Promise((resolve, reject) => {
    const tlsSocket = tls.connect({ socket, servername }, () => resolve(tlsSocket));
    tlsSocket.on("error", reject);
  });
}

/**
 * Check if a hostname matches the bypass list.
 * Supports exact host match and domain suffix match (e.g. ".example.com").
 */
export function shouldBypass(hostname: string, bypassList: string): boolean {
  const entries = bypassList.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  const host = hostname.toLowerCase();
  for (const entry of entries) {
    if (entry === host) return true;
    // ".example.com" or "*.example.com" matches subdomains
    const suffix = entry.startsWith("*.") ? entry.slice(1) : entry.startsWith(".") ? entry : null;
    if (suffix && (host === suffix.slice(1) || host.endsWith(suffix))) return true;
  }
  return false;
}

function isDefaultPort(protocol: string, port: number): boolean {
  return (protocol === "https:" && port === 443) || (protocol === "http:" && port === 80);
}

export function buildHostHeader(hostname: string, protocol: string, port: number): string {
  return isDefaultPort(protocol, port) ? hostname : `${hostname}:${port}`;
}

/**
 * Create a fetch-compatible function that issues requests directly through
 * Node's http/https module — bypassing the renderer's CORS enforcement.
 *
 * Use this for OpenAI-compatible endpoints that don't set
 * `Access-Control-Allow-Origin` (e.g. OpenCode Zen / Go, self-hosted
 * gateways behind reverse proxies). The renderer's `fetch` would fail the
 * preflight; Node's http isn't subject to CORS at all.
 *
 * Desktop only — `nodeRequire` throws on mobile.
 */
export function createNodeFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const http = nodeRequire<typeof import("http")>("http");
    const https = nodeRequire<typeof import("https")>("https");

    const inputReq: Request | null = (typeof input !== "string" && !(input instanceof URL) && "url" in input)
      ? input
      : null;

    const reqUrl = new URL(
      typeof input === "string" ? input
        : input instanceof URL ? input.href
        : input.url,
    );

    const isHttps = reqUrl.protocol === "https:";
    const mod = isHttps ? https : http;

    const reqHeaders = new Headers(inputReq?.headers);
    if (init?.headers) {
      new Headers(init.headers).forEach((v, k) => reqHeaders.set(k, v));
    }
    const headerObj: Record<string, string> = {};
    reqHeaders.forEach((v, k) => { headerObj[k] = v; });

    const method = init?.method || inputReq?.method || "GET";
    const resolvedBody = init?.body !== undefined ? init.body : inputReq?.body ?? null;
    const signal = init?.signal || inputReq?.signal || null;

    return new Promise<Response>((resolve, reject) => {
      const req = mod.request(
        {
          method,
          hostname: reqUrl.hostname,
          port: reqUrl.port || (isHttps ? 443 : 80),
          path: reqUrl.pathname + reqUrl.search,
          headers: headerObj,
        },
        (res) => {
          const respHeaders = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (value == null) continue;
            if (Array.isArray(value)) {
              for (const v of value) respHeaders.append(key, v);
            } else {
              respHeaders.set(key, value);
            }
          }

          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              res.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
              res.on("end", () => controller.close());
              res.on("error", (err) => controller.error(err));
            },
            cancel() {
              res.destroy();
            },
          });

          resolve(new Response(body, {
            status: res.statusCode || 200,
            statusText: res.statusMessage || "",
            headers: respHeaders,
          }));
        },
      );

      req.on("error", (err) => reject(err));

      if (signal) {
        if (signal.aborted) {
          req.destroy();
          reject(new DOMException("The operation was aborted", "AbortError"));
          return;
        }
        signal.addEventListener("abort", () => {
          req.destroy();
          reject(new DOMException("The operation was aborted", "AbortError"));
        }, { once: true });
      }

      if (resolvedBody == null) {
        req.end();
      } else if (typeof resolvedBody === "string") {
        req.end(resolvedBody);
      } else if (resolvedBody instanceof ArrayBuffer) {
        req.end(Buffer.from(resolvedBody));
      } else if (resolvedBody instanceof Uint8Array) {
        req.end(resolvedBody);
      } else if (typeof (resolvedBody as ReadableStream).getReader === "function") {
        const reader = (resolvedBody as ReadableStream<Uint8Array>).getReader();
        (async () => {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            req.write(value);
          }
          req.end();
        })().catch((err) => {
          req.destroy(err instanceof Error ? err : new Error(String(err)));
        });
      } else {
        req.destroy();
        reject(new TypeError(
          `Unsupported request body type: ${Object.prototype.toString.call(resolvedBody)}. ` +
          `Node fetch supports string, ArrayBuffer, Uint8Array, and ReadableStream.`
        ));
      }
    });
  };
}

/**
 * Create a fetch function that tunnels requests through an HTTP(S) proxy
 * using the CONNECT method.
 *
 * @param proxyUrl - The proxy URL (e.g., "http://proxy:8080" or "http://user:pass@proxy:8080")
 * @param proxyBypass - Comma-separated hosts to bypass proxy (e.g., "api.openai.com,localhost")
 * @returns A fetch-compatible function
 */
export function createProxyFetch(proxyUrl: string, proxyBypass?: string): typeof fetch {
  const proxy = new URL(proxyUrl);

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const http = nodeRequire<typeof import("http")>("http");

    // Extract Request properties when input is a Request object, so that
    // method / headers / body are not silently dropped.
    const inputReq: Request | null = (typeof input !== "string" && !(input instanceof URL) && "url" in input)
      ? input
      : null;

    const reqUrl = new URL(
      typeof input === "string" ? input
        : input instanceof URL ? input.href
        : input.url,
    );

    // Bypass proxy for matching hosts
    if (proxyBypass && shouldBypass(reqUrl.hostname, proxyBypass)) {
      return globalThis.fetch(input, init);
    }

    const isTargetHttps = reqUrl.protocol === "https:";
    const targetHost = reqUrl.hostname;
    const targetPort = parseInt(reqUrl.port) || (isTargetHttps ? 443 : 80);

    // Establish CONNECT tunnel through the proxy
    const tunnelSocket = await connectTunnel(proxy, targetHost, targetPort);

    // For HTTPS targets, wrap the tunnel in TLS
    const socket = isTargetHttps
      ? await tlsWrap(tunnelSocket, targetHost)
      : tunnelSocket;

    // Merge headers: init takes precedence over Request properties
    const reqHeaders = new Headers(inputReq?.headers);
    if (init?.headers) {
      new Headers(init.headers).forEach((v, k) => reqHeaders.set(k, v));
    }
    if (!reqHeaders.has("host")) {
      reqHeaders.set("host", buildHostHeader(targetHost, reqUrl.protocol, targetPort));
    }
    const headerObj: Record<string, string> = {};
    reqHeaders.forEach((v, k) => { headerObj[k] = v; });

    // Resolve method: init > Request > default GET
    const method = init?.method || inputReq?.method || "GET";

    // Resolve body: init > Request
    const resolvedBody = init?.body !== undefined ? init.body : inputReq?.body ?? null;

    // Resolve signal: init > Request
    const signal = init?.signal || inputReq?.signal || null;

    return new Promise<Response>((resolve, reject) => {
      const req = http.request(
        {
          method,
          path: reqUrl.pathname + reqUrl.search,
          headers: headerObj,
          createConnection: () => socket,
        },
        (res) => {
          // Convert Node.js response headers to Headers
          const respHeaders = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (value == null) continue;
            if (Array.isArray(value)) {
              for (const v of value) respHeaders.append(key, v);
            } else {
              respHeaders.set(key, value);
            }
          }

          // Convert Node.js IncomingMessage to ReadableStream
          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              res.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
              res.on("end", () => controller.close());
              res.on("error", (err) => controller.error(err));
            },
            cancel() {
              res.destroy();
            },
          });

          resolve(new Response(body, {
            status: res.statusCode || 200,
            statusText: res.statusMessage || "",
            headers: respHeaders,
          }));
        },
      );

      req.on("error", (err) => {
        socket.destroy();
        reject(err);
      });

      // Handle abort signal — also destroy the underlying tunnel socket
      if (signal) {
        if (signal.aborted) {
          req.destroy();
          socket.destroy();
          reject(new DOMException("The operation was aborted", "AbortError"));
          return;
        }
        signal.addEventListener("abort", () => {
          req.destroy();
          socket.destroy();
          reject(new DOMException("The operation was aborted", "AbortError"));
        }, { once: true });
      }

      // Write request body
      if (resolvedBody == null) {
        req.end();
      } else if (typeof resolvedBody === "string") {
        req.end(resolvedBody);
      } else if (resolvedBody instanceof ArrayBuffer) {
        req.end(Buffer.from(resolvedBody));
      } else if (resolvedBody instanceof Uint8Array) {
        req.end(resolvedBody);
      } else if (typeof (resolvedBody as ReadableStream).getReader === "function") {
        // ReadableStream body (used by some SDKs)
        const reader = (resolvedBody as ReadableStream<Uint8Array>).getReader();
        (async () => {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            req.write(value);
          }
          req.end();
        })().catch((err) => {
          req.destroy(err instanceof Error ? err : new Error(String(err)));
        });
      } else {
        // Unsupported body type (Blob, FormData, URLSearchParams, etc.)
        req.destroy();
        socket.destroy();
        reject(new TypeError(
          `Unsupported request body type: ${Object.prototype.toString.call(resolvedBody)}. ` +
          `Proxy fetch supports string, ArrayBuffer, Uint8Array, and ReadableStream.`
        ));
      }
    });
  };
}
