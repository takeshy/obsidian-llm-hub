import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message, ToolDefinition } from "../types";

const mocks = vi.hoisted(() => ({
  openAiChatCreate: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = { stream: vi.fn() };
    chat = { completions: { create: mocks.openAiChatCreate } };
    images = { generate: vi.fn() };
  },
}));

vi.mock("./proxyFetch", () => ({
  createProxyFetch: vi.fn(),
  createNodeFetch: vi.fn(() => undefined),
}));

import { openaiChatWithToolsStream } from "./openaiProvider";

// Mirrors list_folders: every parameter is optional, so a bare call is valid.
const tool: ToolDefinition = {
  name: "list_folders",
  description: "List all folders in the vault.",
  parameters: {
    type: "object",
    properties: { parentFolder: { type: "string", description: "Parent folder" } },
  },
};

const messages: Message[] = [{ role: "user", content: "list the folders", timestamp: 1 }];

function asyncEvents(events: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) yield event;
    },
  };
}

function toolCallChunk(args: string | undefined) {
  return {
    choices: [{
      delta: {
        tool_calls: [{
          index: 0,
          id: "call_1",
          function: { name: "list_folders", arguments: args },
        }],
      },
    }],
  };
}

function namedToolCallChunk(index: number, name: string) {
  return {
    choices: [{
      delta: {
        tool_calls: [{
          index,
          id: `call_${index}`,
          function: { name, arguments: "{}" },
        }],
      },
    }],
  };
}

async function collect(stream: AsyncGenerator<import("../types").StreamChunk>) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

function getEchoedToolCall(callIndex: number) {
  const body = mocks.openAiChatCreate.mock.calls[callIndex][0] as {
    messages: { role: string; tool_calls?: { function: { arguments: string } }[] }[];
  };
  const assistant = body.messages.find(m => m.role === "assistant" && m.tool_calls);
  return assistant?.tool_calls?.[0].function;
}

describe("tool calls with no arguments", () => {
  beforeEach(() => {
    mocks.openAiChatCreate.mockReset();
  });

  // Gateways that translate OpenAI tool calls into Anthropic's format reject an
  // empty arguments string with "tool_use.input: Input should be an object".
  it.each([
    ["an empty string", ""],
    ["an omitted field", undefined],
    ["a null literal", "null"],
    ["a malformed fragment", "{\"parentFolder\":"],
  ])("replays %s as an empty object", async (_label, args) => {
    mocks.openAiChatCreate
      .mockResolvedValueOnce(asyncEvents([toolCallChunk(args)]))
      .mockResolvedValueOnce(asyncEvents([{ choices: [{ delta: { content: "done" } }] }]));

    const execute = vi.fn().mockResolvedValue("ai_access");
    await collect(openaiChatWithToolsStream(
      "https://opencode.ai/zen", "key", "claude-sonnet-4-6", messages, [tool], "system", execute,
    ));

    expect(getEchoedToolCall(1)).toEqual({ name: "list_folders", arguments: "{}" });
  });

  it("still executes the tool instead of reporting a parse failure", async () => {
    mocks.openAiChatCreate
      .mockResolvedValueOnce(asyncEvents([toolCallChunk("")]))
      .mockResolvedValueOnce(asyncEvents([{ choices: [{ delta: { content: "done" } }] }]));

    const execute = vi.fn().mockResolvedValue("ai_access");
    const chunks = await collect(openaiChatWithToolsStream(
      "https://opencode.ai/zen", "key", "claude-sonnet-4-6", messages, [tool], "system", execute,
    ));

    expect(execute).toHaveBeenCalledWith("list_folders", {});
    expect(chunks).toContainEqual({
      type: "tool_call",
      toolCall: { id: "call_1", name: "list_folders", args: {} },
    });
    expect(chunks).toContainEqual({
      type: "tool_result",
      toolResult: { toolCallId: "call_1", result: "ai_access" },
    });
  });

  it("leaves a well-formed arguments object untouched", async () => {
    mocks.openAiChatCreate
      .mockResolvedValueOnce(asyncEvents([toolCallChunk("{\"parentFolder\":\"ai_access\"}")]))
      .mockResolvedValueOnce(asyncEvents([{ choices: [{ delta: { content: "done" } }] }]));

    const execute = vi.fn().mockResolvedValue("ai_access/notes");
    await collect(openaiChatWithToolsStream(
      "https://opencode.ai/zen", "key", "claude-sonnet-4-6", messages, [tool], "system", execute,
    ));

    expect(execute).toHaveBeenCalledWith("list_folders", { parentFolder: "ai_access" });
    expect(getEchoedToolCall(1)).toEqual({
      name: "list_folders",
      arguments: "{\"parentFolder\":\"ai_access\"}",
    });
  });

  it("retries an empty response after a read tool result", async () => {
    mocks.openAiChatCreate
      .mockResolvedValueOnce(asyncEvents([toolCallChunk("")]))
      .mockResolvedValueOnce(asyncEvents([{ choices: [{ delta: {}, finish_reason: "stop" }] }]))
      .mockResolvedValueOnce(asyncEvents([{ choices: [{ delta: { content: "done" }, finish_reason: "stop" }] }]));

    const execute = vi.fn().mockResolvedValue("ai_access");
    const chunks = await collect(openaiChatWithToolsStream(
      "https://opencode.ai/zen", "key", "claude-sonnet-4-6", messages, [tool], "system", execute,
    ));

    expect(mocks.openAiChatCreate).toHaveBeenCalledTimes(3);
    expect(chunks).toContainEqual({ type: "text", content: "done" });
    expect(chunks.at(-1)?.type).toBe("done");
  });

  it("retries a tool-call finish with no tool-call deltas", async () => {
    mocks.openAiChatCreate
      .mockResolvedValueOnce(asyncEvents([{ choices: [{ delta: {}, finish_reason: "tool_calls" }] }]))
      .mockResolvedValueOnce(asyncEvents([{ choices: [{ delta: { content: "recovered" }, finish_reason: "stop" }] }]));

    const chunks = await collect(openaiChatWithToolsStream(
      "https://opencode.ai/zen", "key", "claude-sonnet-4-6", messages, [tool], "system", vi.fn(),
    ));

    expect(mocks.openAiChatCreate).toHaveBeenCalledTimes(2);
    expect(chunks).toContainEqual({ type: "text", content: "recovered" });
  });

  it("retries an empty response when a read tool is mixed with another tool", async () => {
    mocks.openAiChatCreate
      .mockResolvedValueOnce(asyncEvents([
        namedToolCallChunk(0, "list_folders"),
        namedToolCallChunk(1, "create_note"),
      ]))
      .mockResolvedValueOnce(asyncEvents([{ choices: [{ delta: {}, finish_reason: "stop" }] }]))
      .mockResolvedValueOnce(asyncEvents([{ choices: [{ delta: { content: "done" }, finish_reason: "stop" }] }]));

    const chunks = await collect(openaiChatWithToolsStream(
      "https://opencode.ai/zen", "key", "claude-sonnet-4-6", messages, [tool], "system",
      vi.fn().mockResolvedValue("ok"),
    ));

    expect(mocks.openAiChatCreate).toHaveBeenCalledTimes(3);
    expect(chunks).toContainEqual({ type: "text", content: "done" });
  });

  it("does not consume the tool-round limit when retrying an incomplete response", async () => {
    for (let i = 0; i < 19; i++) {
      mocks.openAiChatCreate.mockResolvedValueOnce(asyncEvents([toolCallChunk("")]));
    }
    mocks.openAiChatCreate
      .mockResolvedValueOnce(asyncEvents([{ choices: [{ delta: {}, finish_reason: "tool_calls" }] }]))
      .mockResolvedValueOnce(asyncEvents([{ choices: [{ delta: { content: "recovered" }, finish_reason: "stop" }] }]));

    const chunks = await collect(openaiChatWithToolsStream(
      "https://opencode.ai/zen", "key", "claude-sonnet-4-6", messages, [tool], "system",
      vi.fn().mockResolvedValue("ok"),
    ));

    expect(mocks.openAiChatCreate).toHaveBeenCalledTimes(21);
    expect(chunks).toContainEqual({ type: "text", content: "recovered" });
    expect(chunks.at(-1)?.type).toBe("done");
  });
});
