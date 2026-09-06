import { beforeEach, describe, expect, it, vi } from "vitest";
import { openaiChatWithToolsStream, verifyApiProvider } from "./openaiProvider";
import type { StreamChunk, ToolDefinition } from "../types";

const { createProxyFetchMock, createCompletion } = vi.hoisted(() => ({
  createProxyFetchMock: vi.fn(),
  createCompletion: vi.fn(),
}));

vi.mock("./proxyFetch", () => ({
  createProxyFetch: createProxyFetchMock,
}));

vi.mock("openai", () => ({
  default: class {
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
