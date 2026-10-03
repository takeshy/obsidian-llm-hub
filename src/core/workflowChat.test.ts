import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "src/types";
import type { LlmHubPlugin } from "src/plugin";
import { localLlmChatStream } from "./localLlmProvider";
import { streamWorkflowChat } from "./workflowChat";

vi.mock("./localLlmProvider", () => ({ localLlmChatStream: vi.fn() }));
vi.mock("./gemini", () => ({ GeminiClient: vi.fn() }));
vi.mock("./cliProvider", () => ({ AntigravityCliProvider: vi.fn(), CodexCliProvider: vi.fn() }));
vi.mock("./openaiProvider", () => ({ openaiChatWithToolsStream: vi.fn() }));
vi.mock("./anthropicProvider", () => ({ anthropicChatWithToolsStream: vi.fn() }));

function fixture(enabled = true): LlmHubPlugin {
  return { settings: { ...DEFAULT_SETTINGS, localLlmConfigs: [{
    id: "studio", framework: "lm-studio", baseUrl: "http://localhost:1234",
    verified: true, enabled, model: "first", enabledModels: ["first", "qwen:latest"],
  }] } } as unknown as LlmHubPlugin;
}

describe("local workflow generation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("routes the selected local model and forwards prompts, attachments, cancellation and output", async () => {
    vi.mocked(localLlmChatStream).mockImplementation(async function* () {
      yield { type: "thinking", content: "planning" };
      yield { type: "text", content: "workflow" };
      yield { type: "done" };
    });
    const abortSignal = new AbortController().signal;
    const chunks = [];
    for await (const chunk of streamWorkflowChat(fixture(), {
      model: "local-llm:studio:qwen:latest", systemPrompt: "system", userPrompt: "create", abortSignal, attachments: [],
    })) chunks.push(chunk);
    expect(localLlmChatStream).toHaveBeenCalledWith(
      expect.objectContaining({ model: "qwen:latest", framework: "lm-studio" }),
      [expect.objectContaining({ role: "user", content: "create", attachments: [] })], "system", abortSignal,
    );
    expect(chunks.map(chunk => chunk.type)).toEqual(["thinking", "text", "done"]);
  });

  it("rejects stale local selections instead of falling back to an API provider", async () => {
    const stream = streamWorkflowChat(fixture(false), {
      model: "local-llm:studio:qwen:latest", systemPrompt: "system", userPrompt: "create",
      abortSignal: new AbortController().signal,
    });
    await expect(stream.next()).rejects.toThrow("Local LLM is not available");
    expect(localLlmChatStream).not.toHaveBeenCalled();
  });
});
