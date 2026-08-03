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
});
