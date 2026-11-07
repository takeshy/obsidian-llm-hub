import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGeminiLiveToken, createOpenAILiveAnswer } from "./live-connection";
import { geminiLiveSetup } from "./gemini-live-config";
import { getLiveProvider, getLiveProviders, type LiveOptions } from "./live-session";
import type { ApiProviderConfig } from "src/types";

const { request, nodeFetch, proxyFetch } = vi.hoisted(() => ({ request: vi.fn(), nodeFetch: vi.fn(), proxyFetch: vi.fn() }));
vi.mock("../proxyFetch", () => ({ createNodeFetch: nodeFetch, createProxyFetch: proxyFetch }));
const connection = { apiKey: "private-api-key" };
const options: LiveOptions = { model: "gpt-realtime-2.1", voice: "marin", language: "ja", instructions: "User preferences", fileAccess: true, ragEnabled: true };
beforeEach(() => { vi.resetAllMocks(); nodeFetch.mockReturnValue(request); proxyFetch.mockReturnValue(request); });

describe("Live authentication", () => {
  it("creates a configured ephemeral OpenAI secret, then sends only the secret with the SDP", async () => {
    request.mockResolvedValueOnce(Response.json({ value: "ek_short-lived" })).mockResolvedValueOnce(new Response("answer-sdp"));
    expect(await createOpenAILiveAnswer(options, "offer-sdp", connection, new AbortController().signal)).toBe("answer-sdp");
    const [authUrl, auth] = request.mock.calls[0];
    expect(authUrl).toBe("https://api.openai.com/v1/realtime/client_secrets");
    expect(auth.headers.Authorization).toBe("Bearer private-api-key");
    const session = JSON.parse(auth.body).session;
    expect(session.type).toBe("realtime");
    expect(session.audio.input.turn_detection).toEqual({ type: "server_vad", create_response: true, interrupt_response: true });
    expect(session.audio.output.voice).toBe("marin");
    expect(session.tools.some((tool: { name: string }) => tool.name === "read_note")).toBe(true);
    expect(session.tools.some((tool: { name: string }) => tool.name === "create_note")).toBe(false);
    const [url, init] = request.mock.calls[1];
    expect(url).toBe("https://api.openai.com/v1/realtime/calls");
    expect(init.headers.Authorization).toBe("Bearer ek_short-lived");
    expect(init.headers["Content-Type"]).toBe("application/sdp");
    expect(init.body).toBe("offer-sdp");
  });

  it("restricts a single-use Gemini token to the same setup sent over the socket", async () => {
    const geminiOptions = { ...options, model: "gemini-3.8-live", voice: "Kore" };
    request.mockResolvedValue(Response.json({ name: "auth_tokens/ephemeral" }));
    expect(await createGeminiLiveToken(geminiOptions, connection, new AbortController().signal)).toBe("auth_tokens/ephemeral");
    const [url, init] = request.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/auth_tokens");
    const body = JSON.parse(init.body);
    expect(body.uses).toBe(1);
    expect(body.bidiGenerateContentSetup).toEqual(geminiLiveSetup(geminiOptions));
    expect(body.bidiGenerateContentSetup.systemInstruction.parts[0].text).toContain("日本語");
  });

  it("offers only RAG to both providers when direct Vault file access is off", async () => {
    const ragOnly = { ...options, fileAccess: false, ragEnabled: true };
    request.mockResolvedValueOnce(Response.json({ value: "ek_rag" })).mockResolvedValueOnce(new Response("answer-sdp"));
    await createOpenAILiveAnswer(ragOnly, "offer-sdp", connection, new AbortController().signal);
    expect(JSON.parse(request.mock.calls[0][1].body).session.tools.map((tool: { name: string }) => tool.name)).toEqual(["rag_search"]);
    request.mockResolvedValueOnce(Response.json({ name: "auth_tokens/rag" }));
    const geminiOptions = { ...ragOnly, model: "gemini-3.8-live", voice: "Kore" };
    await createGeminiLiveToken(geminiOptions, connection, new AbortController().signal);
    const setup = JSON.parse(request.mock.calls[2][1].body).bidiGenerateContentSetup;
    expect(setup).toEqual(geminiLiveSetup(geminiOptions));
    expect(setup.tools[0].functionDeclarations.map((tool: { name: string }) => tool.name)).toEqual(["rag_search"]);
  });

  it("uses the configured HTTP proxy for session setup", async () => {
    request.mockResolvedValue(Response.json({ name: "auth_tokens/test" }));
    await createGeminiLiveToken(options, { ...connection, proxyUrl: "http://proxy:8080", proxyBypass: "localhost" }, new AbortController().signal);
    expect(proxyFetch).toHaveBeenCalledWith("http://proxy:8080", "localhost");
    expect(nodeFetch).not.toHaveBeenCalled();
  });

  it("redacts the saved key from provider errors", async () => {
    request.mockResolvedValue(new Response("Invalid private-api-key", { status: 401 }));
    await expect(createGeminiLiveToken(options, connection, new AbortController().signal)).rejects.toThrow("[redacted]");
  });

  it("does not send an SDP after cancellation while a token is being returned", async () => {
    const abort = new AbortController();
    request.mockImplementation(async () => { abort.abort(); return Response.json({ value: "ek_late" }); });
    await expect(createOpenAILiveAnswer(options, "offer", connection, abort.signal)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([{}, { value: "permanent-key" }])("rejects invalid OpenAI token responses: %j", async body => {
    request.mockResolvedValue(Response.json(body));
    await expect(createOpenAILiveAnswer(options, "offer", connection, new AbortController().signal)).rejects.toThrow("Invalid OpenAI Live token");
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe("Live provider selection", () => {
  function provider(type: ApiProviderConfig["type"], baseUrl: string): ApiProviderConfig {
    return { id: "p", type, baseUrl, apiKey: "key", name: "Provider", enabledModels: [], availableModels: [], enabled: true, verified: true };
  }
  it("allows official Gemini and OpenAI configurations", () => {
    expect(getLiveProvider(provider("gemini", "https://generativelanguage.googleapis.com"))).toBe("gemini");
    expect(getLiveProvider(provider("openai", "https://api.openai.com/"))).toBe("openai");
  });
  it("does not use compatible gateways or configurations without a saved key", () => {
    expect(getLiveProvider(provider("openrouter", "https://openrouter.ai/api"))).toBeNull();
    expect(getLiveProvider(provider("openai", "https://custom.example.com"))).toBeNull();
    expect(getLiveProvider({ ...provider("openai", "https://api.openai.com"), apiKey: "" })).toBeNull();
  });
  it("allows saved keys without enabling or verifying the text-chat provider", () => {
    const config = { ...provider("gemini", "https://generativelanguage.googleapis.com"), enabled: false, verified: false };
    expect(getLiveProvider(config)).toBe("gemini");
    expect(getLiveProviders([config])).toEqual([config]);
  });
  it("collects both saved keys independently of text-chat models", () => {
    const openai = { ...provider("openai", "https://api.openai.com"), id: "openai", enabledModels: [] };
    const gemini = { ...provider("gemini", "https://generativelanguage.googleapis.com"), id: "gemini", verified: false };
    const router = { ...provider("openrouter", "https://openrouter.ai/api"), id: "router", enabledModels: ["vendor/model"] };
    expect(getLiveProviders([router, gemini, openai])).toEqual([gemini, openai]);
    expect(getLiveProviders([router, { ...openai, apiKey: " " }])).toEqual([]);
  });
});
