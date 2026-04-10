import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyApiProvider } from "./openaiProvider";

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
});
