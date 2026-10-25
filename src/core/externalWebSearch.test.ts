import { fetchTavilyUsage, getBraveUsage } from "obsidian-llm-hub-common/core";
import { describe, expect, it, vi } from "vitest";
import { createExternalSearchSession, createWebSearchTransport } from "./externalWebSearch";
import { createProxyFetch } from "./proxyFetch";
vi.mock("./proxyFetch", () => ({ createProxyFetch: vi.fn() }));

describe("external search proxy", () => {
  it("routes search through the configured proxy without putting keys in the tool definition", async () => {
    const fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, json: () => Promise.resolve({ web: { results: [] } }) });
    vi.mocked(createProxyFetch).mockReturnValue(fetch);
    const session = createExternalSearchSession({ settings: { provider: "brave", braveApiKey: "secret-key", tavilyApiKey: "" } }, [], "prompt", undefined, "http://proxy.example:8080", "localhost");
    expect(await session.execute("web_search", { query: "news" })).toEqual({ results: [] });
    expect(createProxyFetch).toHaveBeenCalledWith("http://proxy.example:8080", "localhost");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("api.search.brave.com"), expect.objectContaining({ headers: { Accept: "application/json", "X-Subscription-Token": "secret-key" } }));
    expect(JSON.stringify(session.tools)).not.toContain("secret-key");
  });
});


describe("search usage over proxy", () => {
  it("preserves Brave quota headers and routes Tavily account usage through the same proxy", async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ status: 200, ok: true,
      headers: new Headers({ "X-RateLimit-Limit": "1, 1000", "X-RateLimit-Policy": "1;w=1, 1000;w=2592000", "X-RateLimit-Remaining": "0, 900" }),
      json: () => Promise.resolve({ web: { results: [] } }) })
      .mockResolvedValueOnce({ status: 200, ok: true, headers: new Headers(), json: () => Promise.resolve({ account: { plan_usage: 10, plan_limit: 100 } }) });
    vi.mocked(createProxyFetch).mockReturnValue(fetch);
    const session = createExternalSearchSession({ settings: { provider: "brave", braveApiKey: "proxied-brave", tavilyApiKey: "" } }, [], "prompt", undefined, "http://proxy.example:8080");
    await session.execute("web_search", { query: "news" });
    expect(getBraveUsage("proxied-brave")?.windows[1].remaining).toBe(900);
    const usage = await fetchTavilyUsage("proxied-tavily", createWebSearchTransport("http://proxy.example:8080"));
    expect(usage.plan.remaining).toBe(90);
    expect(fetch.mock.calls[1][0]).toBe("https://api.tavily.com/usage");
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe("Bearer proxied-tavily");
  });
});
