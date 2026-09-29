import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOpenCodeSessionId, openaiChatWithToolsStream, verifyApiProvider } from "./openaiProvider";
import type { StreamChunk, ToolDefinition } from "../types";

const { createProxyFetchMock, createCompletion, openAiConstructor } = vi.hoisted(() => ({
  createProxyFetchMock: vi.fn(),
  createCompletion: vi.fn(),
  openAiConstructor: vi.fn(),
}));

vi.mock("./proxyFetch", () => ({
  createProxyFetch: createProxyFetchMock,
}));

vi.mock("openai", () => ({
  default: class {
    constructor(options: unknown) { openAiConstructor(options); }
    chat = { completions: { create: createCompletion } };
  },
}));

/** One streamed round: the deltas the server sends, in order. */
function round(...deltas: Record<string, unknown>[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const delta of deltas) yield { choices: [{ delta }] };
    },
  };
}

const readNote: ToolDefinition = {
  name: "read_note",
  description: "read a note",
  parameters: { type: "object", properties: {} },
};

async function collect(inlineToolCalls?: boolean): Promise<{ chunks: StreamChunk[]; calls: string[] }> {
  const calls: string[] = [];
  const chunks: StreamChunk[] = [];
  const stream = openaiChatWithToolsStream(
    "http://localhost:1234", "no-key", "qwen",
    [{ role: "user", content: "read a.md", timestamp: 0 }],
    [readNote], "system",
    async (name) => { calls.push(name); return "note body"; },
    undefined, false, undefined, undefined, undefined, undefined,
    inlineToolCalls,
  );
  for await (const chunk of stream) chunks.push(chunk);
  return { chunks, calls };
}

describe("openaiChatWithToolsStream", () => {
  beforeEach(() => {
    createCompletion.mockReset();
    openAiConstructor.mockReset();
  });

  it("runs a tool call a local model wrote as text, and takes the JSON back", async () => {
    // llama3.1 and mistral 7b routinely answer with the call as JSON instead
    // of filling in `tool_calls`; without this the tool never runs and the
    // user is left looking at raw JSON.
    createCompletion
      .mockResolvedValueOnce(round({ content: 'Sure. {"name":"read_note","arguments":{"path":"a.md"}}' }))
      .mockResolvedValueOnce(round({ content: "Here it is." }));

    const { chunks, calls } = await collect(true);

    expect(calls).toEqual(["read_note"]);
    expect(chunks.find(c => c.type === "replace_text")?.content).toBe("Sure.");
    expect(chunks.find(c => c.type === "tool_call")?.toolCall?.args).toEqual({ path: "a.md" });
  });

  it("replays what the tools did in an earlier turn", async () => {
    // The history used to be flattened to the assistant's prose, so a
    // follow-up like "delete the file you just read" reached the model with no
    // record of which file that was.
    createCompletion.mockResolvedValueOnce(round({ content: "Done." }));

    const stream = openaiChatWithToolsStream(
      "https://api.openai.com", "key", "gpt-5",
      [
        { role: "user", content: "read a.md", timestamp: 0 },
        {
          role: "assistant",
          content: "It says hello.",
          timestamp: 1,
          toolCalls: [{ id: "call_1", name: "read_note", args: { path: "a.md" } }],
          toolResults: [{ toolCallId: "call_1", result: "hello" }],
        },
        { role: "user", content: "now delete it", timestamp: 2 },
      ],
      [readNote], "system", async () => "", undefined, false,
    );
    for await (const _ of stream) { /* drain */ }

    const sent = createCompletion.mock.calls[0][0].messages;
    expect(sent.map((m: { role: string }) => m.role))
      .toEqual(["system", "user", "assistant", "tool", "assistant", "user"]);
    expect(sent[2].tool_calls[0].function).toEqual({ name: "read_note", arguments: '{"path":"a.md"}' });
    expect(sent[3]).toEqual({ role: "tool", content: "hello", tool_call_id: "call_1" });
  });

  it.each([
    ["https://api.groq.com/openai/", false],
    ["https://api.groq.com/openai", false],
    ["https://opencode.ai/zen/go", true],
  ])("handles saved reasoning when continuing at %s", async (baseUrl, replay) => {
    createCompletion.mockImplementationOnce(async (request) => {
      const assistants = request.messages.filter((message: { role: string }) => message.role === "assistant");
      expect(assistants).toHaveLength(3);
      if (replay) {
        expect(assistants[0].reasoning_content).toBe("I should read the note.");
        expect(assistants[2].reasoning_content).toBe("I should continue later.");
      } else {
        for (const message of request.messages) expect(message).not.toHaveProperty("reasoning_content");
      }
      expect(assistants[0].tool_calls[0].function).toEqual({ name: "read_note", arguments: '{"path":"a.md"}' });
      expect(assistants[1].content).toBe("Here are the employers.");
      expect(request.messages.find((message: { role: string }) => message.role === "tool"))
        .toEqual({ role: "tool", content: "note body", tool_call_id: "call_read" });
      return round({ content: "Continuing." });
    });
    const messages = [
      { role: "user" as const, content: "read a.md", timestamp: 0 },
      {
        role: "assistant" as const, content: "Here are the employers.", timestamp: 1,
        thinking: "I should read the note.",
        toolCalls: [{ id: "call_read", name: "read_note", args: { path: "a.md" } }],
        toolResults: [{ toolCallId: "call_read", result: "note body" }],
      },
      { role: "assistant" as const, content: "Paused.", thinking: "I should continue later.", timestamp: 2 },
      { role: "user" as const, content: "continue", timestamp: 3 },
    ];
    const chunks: StreamChunk[] = [];
    for await (const chunk of openaiChatWithToolsStream(
      baseUrl, "key", "openai/gpt-oss-120b", messages,
      [readNote], "system", async () => "", undefined, false,
    )) chunks.push(chunk);
    expect(chunks.filter(chunk => chunk.type === "error")).toEqual([]);
    expect(chunks.some(chunk => chunk.type === "done")).toBe(true);
    expect(messages[1].thinking).toBe("I should read the note.");
    expect(messages[2].thinking).toBe("I should continue later.");
  });

  it("leaves the text alone for a hosted model", async () => {
    // A hosted model asked to describe a tool call must be quoted, not obeyed.
    createCompletion.mockResolvedValueOnce(
      round({ content: 'You would send {"name":"read_note","arguments":{"path":"a.md"}}' }),
    );

    const { chunks, calls } = await collect();

    expect(calls).toEqual([]);
    expect(chunks.some(c => c.type === "replace_text")).toBe(false);
    expect(chunks.some(c => c.type === "tool_call")).toBe(false);
  });

  it.each([
    ["https://api.groq.com/openai/v1", "openai/gpt-oss-20b", "reasoning", false],
    ["https://api.groq.com/openai/v1/", "openai/gpt-oss-120b", "reasoning_content", false],
    ["https://opencode.ai/zen/go", "kimi-k2.5", "reasoning_content", true],
  ])("handles reasoning during tool continuation for %s (%s)", async (baseUrl, model, field, replay) => {
    createCompletion.mockResolvedValueOnce(round(
      { [field]: "I should read the note." },
      { tool_calls: [{ index: 0, id: "call_read", type: "function", function: { name: "read_note", arguments: '{"path":"a.md"}' } }] },
    )).mockImplementationOnce(async (request) => {
      const assistant = request.messages.find((message: { role: string }) => message.role === "assistant");
      if (replay) {
        expect(assistant.reasoning_content).toBe("I should read the note.");
      } else {
        expect(assistant).not.toHaveProperty("reasoning_content");
        expect(assistant).not.toHaveProperty("reasoning");
      }
      expect(assistant.tool_calls[0].id).toBe("call_read");
      expect(request.messages.at(-1)).toEqual({ role: "tool", content: "note body", tool_call_id: "call_read" });
      return round({ content: "Here are the employers." });
    });
    const executeTool = vi.fn().mockResolvedValue("note body");
    const chunks: StreamChunk[] = [];
    for await (const chunk of openaiChatWithToolsStream(
      baseUrl, "key", model,
      [{ role: "user", content: "read a.md", timestamp: 0 }],
      [readNote], "system", executeTool,
    )) chunks.push(chunk);

    expect(executeTool).toHaveBeenCalledWith("read_note", { path: "a.md" });
    expect(createCompletion).toHaveBeenCalledTimes(2);
    expect(chunks).toContainEqual({ type: "thinking", content: "I should read the note." });
    expect(chunks.some(chunk => chunk.type === "error")).toBe(false);
    expect(chunks.at(-1)?.type).toBe("done");
  });

  it("identifies OpenCode Go requests with a stable conversation session", async () => {
    createCompletion.mockResolvedValueOnce(round({ content: "Done." }));
    const messages = [{ role: "user" as const, content: "hello", timestamp: 1234 }];

    for await (const _ of openaiChatWithToolsStream(
      "https://opencode.ai/zen/go/", "key", "glm-5.3", messages,
      [], "system", async () => "",
    )) { /* drain */ }

    expect(getOpenCodeSessionId(messages)).toBe("obsidian-llm-hub-1234-user");
    expect(openAiConstructor.mock.calls[0][0].defaultHeaders).toEqual({
      "User-Agent": "obsidian-llm-hub/1.0",
      "x-opencode-session": "obsidian-llm-hub-1234-user",
    });
  });
});

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
