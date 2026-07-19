import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyApiProvider, verifyOpenAiCompatibleChat } from "./openaiProvider";

const { createProxyFetchMock } = vi.hoisted(() => ({
  createProxyFetchMock: vi.fn(),
}));

vi.mock("./proxyFetch", () => ({
  createProxyFetch: createProxyFetchMock,
}));

describe("verifyApiProvider", () => {
  beforeEach(() => {
    createProxyFetchMock.mockReset();
  });

  it("treats proxied non-2xx responses as verification failures", async () => {
    createProxyFetchMock.mockReturnValue(async () =>
      new Response(JSON.stringify({ error: "invalid api key" }), {
        status: 401,
        statusText: "Unauthorized",
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await verifyApiProvider(
      "https://api.openai.com",
      "bad-key",
      "http://proxy.internal:8080",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("HTTP 401 Unauthorized");
  });

  it("does not append a second /v1 when fetching models", async () => {
    const proxyFetch = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ id: "proxied-model" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    createProxyFetchMock.mockReturnValue(proxyFetch);

    const result = await verifyApiProvider(
      "http://localhost:8787/v1/",
      "upstream-key",
      "http://proxy.internal:8080",
    );

    expect(result).toEqual({ success: true, models: ["proxied-model"] });
    expect(proxyFetch.mock.calls[0][0]).toBe("http://localhost:8787/v1/models");
  });
});

describe("verifyOpenAiCompatibleChat", () => {
  beforeEach(() => {
    createProxyFetchMock.mockReset();
  });

  it("probes chat completions with the manually supplied model", async () => {
    const proxyFetch = vi.fn(async () => new Response("", { status: 400 }));
    createProxyFetchMock.mockReturnValue(proxyFetch);

    const result = await verifyOpenAiCompatibleChat(
      "http://localhost:8787/",
      "upstream-key",
      "my-proxied-model",
      "http://proxy.internal:8080",
    );

    expect(result.success).toBe(true);
    expect(proxyFetch).toHaveBeenCalledOnce();
    const [url, init] = proxyFetch.mock.calls[0];
    expect(url).toBe("http://localhost:8787/v1/chat/completions");
    expect(JSON.parse(String(init?.body))).toEqual({
      model: "my-proxied-model",
      messages: [],
    });
  });

  it("does not append a second /v1 when the base URL already includes it", async () => {
    const proxyFetch = vi.fn(async () => new Response("", { status: 400 }));
    createProxyFetchMock.mockReturnValue(proxyFetch);

    const result = await verifyOpenAiCompatibleChat(
      "http://localhost:8787/v1/",
      "upstream-key",
      "my-proxied-model",
      "http://proxy.internal:8080",
    );

    expect(result.success).toBe(true);
    expect(proxyFetch.mock.calls[0][0]).toBe("http://localhost:8787/v1/chat/completions");
  });

  it("rejects authentication failures from a chat-completions probe", async () => {
    createProxyFetchMock.mockReturnValue(async () =>
      new Response(JSON.stringify({ error: { message: "invalid key" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await verifyOpenAiCompatibleChat(
      "http://localhost:8787",
      "bad-key",
      "my-proxied-model",
      "http://proxy.internal:8080",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Authentication failed (HTTP 401): invalid key");
  });

  it.each([404, 429, 500, 502, 503])("rejects HTTP %i from a chat-completions probe", async (status) => {
    createProxyFetchMock.mockReturnValue(async () =>
      new Response(JSON.stringify({ error: { message: "probe failed" } }), {
        status,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await verifyOpenAiCompatibleChat(
      "http://localhost:8787/v1",
      "upstream-key",
      "my-proxied-model",
      "http://proxy.internal:8080",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(`HTTP ${status}`);
  });
});
