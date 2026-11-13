import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, type ApiProviderConfig } from "../types";
import { DECISION_TIMEOUT_MS, evaluateDecision } from "./decisionClient";

const gemini: ApiProviderConfig = {
  id: "g", name: "Gemini", type: "gemini", apiKey: " gemini-key ", baseUrl: "",
  enabled: false, verified: false, enabledModels: [], availableModels: [],
};
const settings = { ...DEFAULT_SETTINGS, jevApiKey: "jev-key", apiProviders: [gemini] };
const answer = (choice: string) => new Response(JSON.stringify({ answers: { decision: { type: "choice", choice, confidence: 0.1 } } }));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("decision API choices", () => {
  it.each(["jev", "gemini", "router"])("uses the configured %s endpoint, credentials and explicit boolean choice", async provider => {
    for (const value of [true, false]) {
      const request = vi.fn<typeof fetch>().mockResolvedValue(answer(String(value)));
      const configured = { ...settings,
        ragDecisionModel: provider === "gemini" ? "api:g:gemini-decision-1" : "jev",
        jevUseOpenRouter: provider === "router",
        apiProviders: [gemini, { ...gemini, id: "router", type: "openrouter" as const, apiKey: "router-key" }],
      };
      expect(await evaluateDecision("Is the request urgent?", "Please help now", configured, { fetchImpl: request })).toBe(value);
      const [url, init] = request.mock.calls[0];
      expect(url).toBe(provider === "gemini" ? "https://generativelanguage.googleapis.com/v1beta/decisions"
        : provider === "router" ? "https://openrouter.ai/api/alpha/decisions" : "https://api.typesafe.ai/v1/systemone");
      const headers = new Headers(init?.headers);
      expect(headers.get("x-goog-api-key")).toBe(provider === "gemini" ? "gemini-key" : null);
      expect(headers.get("authorization")).toBe(provider === "gemini" ? null : `Bearer ${provider === "router" ? "router-key" : "jev-key"}`);
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe(provider === "gemini" ? "gemini-decision-1" : provider === "router" ? "~typesafe/jev-latest" : "jev-latest");
      expect(body.questions.decision).toMatchObject({ type: "choice", criteria: { true: expect.any(String), false: expect.any(String) } });
      expect(body.questions.decision.instructions).toContain("Is the request urgent?");
      if (provider === "gemini") expect(body.input).toEqual([{ type: "text", text: "Please help now" }]);
      else expect(body.state).toBe("Please help now");
    }
  });

  it("allows a node to override the shared model without changing settings", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(answer("true"));
    expect(await evaluateDecision("Question", "Evidence", settings, { model: "api:g:gemini-decision-1", fetchImpl: request })).toBe(true);
    expect(settings.ragDecisionModel).toBe("jev");
    expect(request.mock.calls[0][0]).toContain("googleapis.com/v1beta/decisions");
  });

  it.each([
    null, {}, { answers: {} }, { answers: { decision: { choice: "true" } } },
    { answers: { decision: { type: "choice", choice: true } } },
    { answers: { decision: { type: "choice", choice: "unknown" } } },
    { answers: { decision: { type: "score", choice: "true", score: 3 } } },
  ])("rejects malformed choices rather than returning false (%j)", async payload => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload)));
    await expect(evaluateDecision("Question", "Evidence", settings, { fetchImpl: request })).rejects.toThrow("invalid or incomplete");
  });

  it("rejects missing instructions and missing selected credentials without a request or model fallback", async () => {
    const request = vi.fn<typeof fetch>();
    await expect(evaluateDecision(" ", "Evidence", settings, { fetchImpl: request })).rejects.toThrow("instructions are required");
    await expect(evaluateDecision("Question", "Evidence", settings, { model: "api:missing:gemini-decision-1", fetchImpl: request })).rejects.toThrow("not configured");
    expect(request).not.toHaveBeenCalled();
  });

  it("propagates HTTP, malformed JSON and network failures", async () => {
    for (const request of [
      vi.fn<typeof fetch>().mockResolvedValue(new Response("failed", { status: 503 })),
      vi.fn<typeof fetch>().mockResolvedValue(new Response("not JSON")),
      vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
    ]) await expect(evaluateDecision("Question", "Evidence", settings, { fetchImpl: request })).rejects.toThrow();
  });

  it("honors Retry-After and retries within the operation deadline", async () => {
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("limited", { status: 429, headers: { "retry-after": "1" } }))
      .mockResolvedValueOnce(answer("false"));
    const pending = evaluateDecision("Question", "Evidence", settings, { fetchImpl: request });
    await vi.advanceTimersByTimeAsync(999);
    expect(request).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBe(false);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([false, true])("rejects at the 20-second deadline even when fetch or Retry-After blocks (%s)", async limited => {
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>().mockImplementation(() => limited
      ? Promise.resolve(new Response("limited", { status: 429, headers: { "retry-after": "60" } })) : new Promise(() => {}));
    const pending = evaluateDecision("Question", "Evidence", settings, { fetchImpl: request });
    const assertion = expect(pending).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(DECISION_TIMEOUT_MS);
    await assertion;
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("propagates cancellation even if fetch ignores abort, and rejects before requesting when already aborted", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
    const controller = new AbortController();
    const pending = evaluateDecision("Question", "Evidence", settings, { signal: controller.signal, fetchImpl: request });
    controller.abort();
    await expect(pending).rejects.toThrow("cancelled");
    await expect(evaluateDecision("Question", "Evidence", settings, { signal: controller.signal, fetchImpl: request })).rejects.toThrow();
    expect(request).toHaveBeenCalledOnce();
  });
});
