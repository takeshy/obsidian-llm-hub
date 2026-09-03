import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message, ToolDefinition } from "../types";

const mocks = vi.hoisted(() => ({
  openAiResponsesStream: vi.fn(),
  openAiChatCreate: vi.fn(),
  anthropicStream: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = { stream: mocks.openAiResponsesStream };
    chat = { completions: { create: mocks.openAiChatCreate } };
    images = { generate: vi.fn() };
  },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    models = { list: vi.fn() };
    messages = { stream: mocks.anthropicStream };
  },
}));

vi.mock("./proxyFetch", () => ({
  createProxyFetch: vi.fn(),
  createNodeFetch: vi.fn(() => undefined),
}));

import { openaiChatWithToolsStream } from "./openaiProvider";
import { anthropicChatWithToolsStream } from "./anthropicProvider";

const tool: ToolDefinition = {
  name: "read_note",
  description: "Read a note",
  parameters: { type: "object", properties: {} },
};

async function collect(stream: AsyncGenerator<import("../types").StreamChunk>) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

function asyncEvents(events: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) yield event;
    },
  };
}

describe("OpenAI native web search", () => {
  beforeEach(() => {
    mocks.openAiResponsesStream.mockReset();
    mocks.openAiChatCreate.mockReset();
  });

  it("forces Responses, combines tools, preserves attachments, citations, and continuation", async () => {
    const response = {
      id: "resp_search_1",
      output: [
        { id: "ws_1", type: "web_search_call", status: "completed", action: { type: "search", query: "news" } },
        { id: "ws_2", type: "web_search_call", status: "completed", action: { type: "open_page", url: "https://example.com" } },
        {
          id: "msg_1",
          type: "message",
          role: "assistant",
          status: "completed",
          content: [{
            type: "output_text",
            text: "Fresh answer",
            annotations: [{
              type: "url_citation", title: "Example", url: "https://example.com",
              start_index: 0, end_index: 5,
            }],
          }],
        },
      ],
      usage: { input_tokens: 12, output_tokens: 4 },
    };
    mocks.openAiResponsesStream.mockReturnValue(asyncEvents([
      { type: "response.web_search_call.in_progress" },
      { type: "response.output_text.delta", delta: "Fresh answer" },
      { type: "response.completed", response },
    ]));

    const messages: Message[] = [{
      role: "user",
      content: "Find news",
      timestamp: 1,
      attachments: [
        { type: "image", name: "image.png", mimeType: "image/png", data: "aW1hZ2U=" },
        { type: "pdf", name: "paper.pdf", mimeType: "application/pdf", data: "cGRm" },
      ],
    }];
    const chunks = await collect(openaiChatWithToolsStream(
      "https://api.openai.com", "key", "gpt-5.4", messages, [tool], "system",
      vi.fn(), undefined, undefined, undefined, undefined, true,
    ));

    expect(mocks.openAiChatCreate).not.toHaveBeenCalled();
    const request = mocks.openAiResponsesStream.mock.calls[0][0];
    expect(request.tools.map((item: { type: string }) => item.type)).toEqual(["function", "web_search"]);
    expect(request.include).toEqual(["reasoning.encrypted_content"]);
    expect(request.input[0].content.map((item: { type: string }) => item.type)).toEqual(["input_text", "input_image", "input_file"]);
    expect(chunks.some(chunk => chunk.type === "web_search_used")).toBe(true);
    const done = chunks.find(chunk => chunk.type === "done");
    expect(done?.webSearchCitations).toEqual([{
      title: "Example", url: "https://example.com", startIndex: 0, endIndex: 5,
    }]);
    expect(done?.usage?.webSearchRequests).toBe(1);
    expect(done?.providerContinuation?.items).toEqual(response.output);
    expect(done?.providerContinuation?.responseId).toBe("resp_search_1");
  });

  it("surfaces a Responses error instead of falling back when search is selected", async () => {
    mocks.openAiResponsesStream.mockImplementation(() => {
      throw new Error("model does not support web search");
    });
    const chunks = await collect(openaiChatWithToolsStream(
      "https://api.openai.com", "key", "unsupported", [{ role: "user", content: "latest", timestamp: 1 }],
      [], "system", vi.fn(), undefined, undefined, undefined, undefined, true,
    ));
    expect(chunks.at(-1)).toEqual({ type: "error", error: "model does not support web search" });
    expect(mocks.openAiChatCreate).not.toHaveBeenCalled();
  });

  it("does not fall back to Chat Completions for OpenAI reasoning with function tools", async () => {
    mocks.openAiResponsesStream.mockImplementation(() => {
      throw new Error("temporary Responses failure");
    });
    const chunks = await collect(openaiChatWithToolsStream(
      "https://api.openai.com", "key", "gpt-5.6-luna",
      [{ role: "user", content: "Edit my note", timestamp: 1 }],
      [tool], "system", vi.fn(), undefined, true,
    ));

    expect(chunks.at(-1)).toEqual({ type: "error", error: "temporary Responses failure" });
    expect(mocks.openAiChatCreate).not.toHaveBeenCalled();
  });

  it("always uses Responses for GPT-5.6 function tools even when thinking is off", async () => {
    mocks.openAiResponsesStream.mockReturnValue(asyncEvents([{
      type: "response.completed",
      response: { id: "resp_luna", output: [], usage: { input_tokens: 1, output_tokens: 1 } },
    }]));
    const chunks = await collect(openaiChatWithToolsStream(
      "https://api.openai.com", "key", "gpt-5.6-luna",
      [{ role: "user", content: "Read my note", timestamp: 1 }],
      [tool], "system", vi.fn(), undefined, false,
    ));

    expect(chunks.at(-1)?.type).toBe("done");
    expect(mocks.openAiResponsesStream).toHaveBeenCalledOnce();
    expect(mocks.openAiChatCreate).not.toHaveBeenCalled();
  });

  it("always uses Responses for GPT-6 Astra function tools without removing GPT-5.6 routing", async () => {
    mocks.openAiResponsesStream.mockReturnValue(asyncEvents([{
      type: "response.completed",
      response: { id: "resp_astra", output: [], usage: { input_tokens: 1, output_tokens: 1 } },
    }]));
    const chunks = await collect(openaiChatWithToolsStream(
      "https://api.openai.com", "key", "gpt-6-astra",
      [{ role: "user", content: "Read my note", timestamp: 1 }],
      [tool], "system", vi.fn(), undefined, false,
    ));

    expect(chunks.at(-1)?.type).toBe("done");
    expect(mocks.openAiResponsesStream).toHaveBeenCalledOnce();
    expect(mocks.openAiChatCreate).not.toHaveBeenCalled();
  });

  it("passes the selected GPT-6 Astra reasoning effort to Responses", async () => {
    mocks.openAiResponsesStream.mockReturnValue(asyncEvents([{
      type: "response.completed",
      response: { id: "resp_astra_max", output: [], usage: { input_tokens: 1, output_tokens: 1 } },
    }]));
    await collect(openaiChatWithToolsStream(
      "https://api.openai.com", "key", "gpt-6-astra",
      [{ role: "user", content: "Solve this", timestamp: 1 }],
      [], "system", vi.fn(), undefined, undefined, undefined, undefined, false, "max",
    ));

    expect(mocks.openAiResponsesStream.mock.calls[0][0].reasoning).toEqual({
      effort: "max",
      summary: "detailed",
    });
  });

  it("replays matching native continuation items after their triggering user", async () => {
    const priorItem = { id: "prior", type: "message", role: "assistant", status: "completed", content: [] };
    mocks.openAiResponsesStream.mockReturnValue(asyncEvents([{
      type: "response.completed",
      response: { output: [], usage: { input_tokens: 1, output_tokens: 1 } },
    }]));
    const messages: Message[] = [
      { role: "user", content: "first", timestamp: 1 },
      {
        role: "assistant", content: "answer", timestamp: 2,
        providerContinuation: {
          provider: "openai", baseUrl: "https://api.openai.com", model: "gpt-5.4", items: [priorItem],
        },
      },
      { role: "user", content: "follow up", timestamp: 3 },
    ];
    await collect(openaiChatWithToolsStream(
      "https://api.openai.com", "key", "gpt-5.4", messages, [], "system", vi.fn(),
      undefined, undefined, undefined, undefined, true,
    ));
    expect(mocks.openAiResponsesStream.mock.calls[0][0].input).toEqual([
      { role: "user", content: "first" },
      priorItem,
      { role: "user", content: "follow up" },
    ]);
  });

  it("continues an OpenAI Responses conversation by response ID", async () => {
    mocks.openAiResponsesStream.mockReturnValue(asyncEvents([{
      type: "response.completed",
      response: { id: "resp_next", output: [], usage: { input_tokens: 1, output_tokens: 1 } },
    }]));
    const messages: Message[] = [
      { role: "user", content: "first", timestamp: 1 },
      {
        role: "assistant", content: "answer", timestamp: 2,
        providerContinuation: {
          provider: "openai", baseUrl: "https://api.openai.com", model: "gpt-5.4",
          items: [{ type: "reasoning", encrypted_content: "opaque" }], responseId: "resp_prior",
        },
      },
      { role: "user", content: "follow up", timestamp: 3 },
    ];

    const chunks = await collect(openaiChatWithToolsStream(
      "https://api.openai.com", "key", "gpt-5.4", messages, [], "system", vi.fn(),
      undefined, true, undefined, undefined, false,
    ));

    const request = mocks.openAiResponsesStream.mock.calls[0][0];
    expect(request.previous_response_id).toBe("resp_prior");
    expect(request.input).toEqual([{ role: "user", content: "follow up" }]);
    expect(chunks.find(chunk => chunk.type === "done")?.providerContinuation?.responseId)
      .toBe("resp_next");
  });

  it("does not resume an older OpenAI response across a different model reply", async () => {
    mocks.openAiResponsesStream.mockReturnValue(asyncEvents([{
      type: "response.completed",
      response: { id: "resp_new", output: [], usage: { input_tokens: 1, output_tokens: 1 } },
    }]));
    const messages: Message[] = [
      { role: "user", content: "first", timestamp: 1 },
      {
        role: "assistant", content: "OpenAI answer", timestamp: 2,
        providerContinuation: {
          provider: "openai", baseUrl: "https://api.openai.com", model: "gpt-5.4",
          items: [], responseId: "resp_stale",
        },
      },
      { role: "user", content: "other model question", timestamp: 3 },
      { role: "assistant", content: "Other model answer", timestamp: 4 },
      { role: "user", content: "back to OpenAI", timestamp: 5 },
    ];

    await collect(openaiChatWithToolsStream(
      "https://api.openai.com", "key", "gpt-5.4", messages, [], "system", vi.fn(),
      undefined, true, undefined, undefined, false,
    ));

    expect(mocks.openAiResponsesStream.mock.calls[0][0].previous_response_id).toBeUndefined();
  });
});

describe("xAI native web search", () => {
  beforeEach(() => {
    mocks.openAiResponsesStream.mockReset();
    mocks.openAiChatCreate.mockReset();
  });

  it("forces Responses, combines tools, retains inline citations, and uses exact usage cost", async () => {
    const response = {
      output: [
        { type: "reasoning", id: "rs_1", status: "completed", encrypted_content: "opaque", summary: [] },
        {
          id: "msg_1",
          type: "message",
          role: "assistant",
          status: "completed",
          content: [{
            type: "output_text",
            text: "Fresh news [[1]](https://example.com/news)",
            annotations: [{ type: "url_citation", title: "Example News", url: "https://example.com/news" }],
          }],
        },
      ],
      usage: { input_tokens: 20, output_tokens: 8, cost_in_usd_ticks: 60_000_000 },
      server_side_tool_usage: { SERVER_SIDE_TOOL_WEB_SEARCH: 1 },
    };
    mocks.openAiResponsesStream.mockReturnValue(asyncEvents([
      { type: "response.output_text.delta", delta: "Fresh news [[1]](https://example.com/news)" },
      { type: "response.completed", response },
    ]));

    const chunks = await collect(openaiChatWithToolsStream(
      "https://api.x.ai", "key", "grok-4.5",
      [{ role: "user", content: "latest", timestamp: 1 }], [tool], "system", vi.fn(),
      undefined, undefined, undefined, undefined, true,
    ));

    expect(mocks.openAiChatCreate).not.toHaveBeenCalled();
    const request = mocks.openAiResponsesStream.mock.calls[0][0];
    expect(request.tools.map((item: { type: string }) => item.type)).toEqual(["function", "web_search"]);
    expect(request.include).toEqual(["reasoning.encrypted_content"]);
    expect(chunks.some(chunk => chunk.type === "web_search_used")).toBe(true);
    const done = chunks.find(chunk => chunk.type === "done");
    expect(done?.webSearchCitations).toBeUndefined();
    expect(done?.webSearchSources).toEqual([{ title: "Example News", url: "https://example.com/news" }]);
    expect(done?.usage?.webSearchRequests).toBe(1);
    expect(done?.usage?.totalCost).toBe(0.006);
    expect(done?.providerContinuation).toEqual({
      provider: "xai", baseUrl: "https://api.x.ai", model: "grok-4.5", items: response.output,
    });
  });

  it("replays only matching xAI native continuation items", async () => {
    const priorItem = { id: "prior", type: "reasoning", status: "completed", encrypted_content: "opaque", summary: [] };
    mocks.openAiResponsesStream.mockReturnValue(asyncEvents([{
      type: "response.completed",
      response: { output: [], usage: { input_tokens: 1, output_tokens: 1 } },
    }]));
    const messages: Message[] = [
      { role: "user", content: "first", timestamp: 1 },
      {
        role: "assistant", content: "answer", timestamp: 2,
        providerContinuation: {
          provider: "xai", baseUrl: "https://api.x.ai", model: "grok-4.5", items: [priorItem],
        },
      },
      { role: "user", content: "follow up", timestamp: 3 },
    ];

    await collect(openaiChatWithToolsStream(
      "https://api.x.ai", "key", "grok-4.5", messages, [], "system", vi.fn(),
      undefined, undefined, undefined, undefined, true,
    ));

    expect(mocks.openAiResponsesStream.mock.calls[0][0].input).toEqual([
      { role: "user", content: "first" },
      priorItem,
      { role: "user", content: "follow up" },
    ]);
  });
});

describe("Anthropic native web search", () => {
  beforeEach(() => mocks.anthropicStream.mockReset());

  it("combines server/client tools and returns citations, usage, and exact blocks", async () => {
    const finalMessage = {
      content: [
        { type: "server_tool_use", id: "srv_1", name: "web_search", input: { query: "news" } },
        { type: "web_search_tool_result", tool_use_id: "srv_1", content: [{ type: "web_search_result", url: "https://example.com", title: "Example", encrypted_content: "opaque" }] },
        { type: "text", text: "Fresh answer", citations: [{ type: "web_search_result_location", url: "https://example.com", title: "Example", encrypted_index: "idx", cited_text: "Fresh" }] },
      ],
      usage: { input_tokens: 10, output_tokens: 5, server_tool_use: { web_search_requests: 1 } },
      stop_reason: "end_turn",
    };
    mocks.anthropicStream.mockReturnValue({
      ...asyncEvents([
        { type: "content_block_start", index: 0, content_block: finalMessage.content[0] },
        { type: "content_block_delta", index: 2, delta: { type: "text_delta", text: "Fresh answer" } },
      ]),
      currentMessage: finalMessage,
      finalMessage: vi.fn().mockResolvedValue(finalMessage),
    });

    const chunks = await collect(anthropicChatWithToolsStream(
      "https://api.anthropic.com", "key", "claude-sonnet-4-6",
      [{ role: "user", content: "latest", timestamp: 1 }], [tool], "system", vi.fn(),
      undefined, undefined, undefined, undefined, true,
    ));

    const request = mocks.anthropicStream.mock.calls[0][0];
    expect(request.tools.map((item: { type?: string; name: string }) => item.type ?? item.name)).toEqual(["read_note", "web_search_20250305"]);
    expect(chunks.some(chunk => chunk.type === "web_search_used")).toBe(true);
    const done = chunks.find(chunk => chunk.type === "done");
    expect(done?.webSearchCitations).toEqual([{
      title: "Example", url: "https://example.com", startIndex: 0, endIndex: 12,
    }]);
    expect(done?.usage?.webSearchRequests).toBe(1);
    expect(done?.providerContinuation?.items).toEqual([{ role: "assistant", content: finalMessage.content }]);
  });

  it("continues pause_turn with the exact paused assistant blocks", async () => {
    const paused = {
      content: [{ type: "server_tool_use", id: "srv", name: "web_search", input: { query: "deep" } }],
      usage: { input_tokens: 2, output_tokens: 1, server_tool_use: { web_search_requests: 1 } },
      stop_reason: "pause_turn",
    };
    const completed = {
      content: [{ type: "text", text: "Done", citations: [] }],
      usage: { input_tokens: 3, output_tokens: 1, server_tool_use: { web_search_requests: 0 } },
      stop_reason: "end_turn",
    };
    mocks.anthropicStream
      .mockReturnValueOnce({
        ...asyncEvents([]),
        currentMessage: undefined,
        finalMessage: vi.fn().mockResolvedValue(paused),
      })
      .mockReturnValueOnce({
        ...asyncEvents([{ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Done" } }]),
        currentMessage: undefined,
        finalMessage: vi.fn().mockResolvedValue(completed),
      });

    const chunks = await collect(anthropicChatWithToolsStream(
      "https://api.anthropic.com", "key", "claude-sonnet-4-6",
      [{ role: "user", content: "research", timestamp: 1 }], [], "system", vi.fn(),
      undefined, undefined, undefined, undefined, true,
    ));
    expect(mocks.anthropicStream).toHaveBeenCalledTimes(2);
    expect(mocks.anthropicStream.mock.calls[1][0].messages.at(-1)).toEqual({ role: "assistant", content: paused.content });
    expect(chunks.at(-1)?.type).toBe("done");
  });

  it("uses the SDK final message after the live stream snapshot is cleared", async () => {
    const completed = {
      content: [{ type: "text", text: "Latest news", citations: [] }],
      usage: { input_tokens: 4, output_tokens: 2 },
      stop_reason: "end_turn",
    };
    const finalMessage = vi.fn().mockResolvedValue(completed);
    mocks.anthropicStream.mockReturnValue({
      ...asyncEvents([{ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Latest news" } }]),
      currentMessage: undefined,
      finalMessage,
    });

    const chunks = await collect(anthropicChatWithToolsStream(
      "https://api.anthropic.com", "key", "claude-sonnet-4-6",
      [{ role: "user", content: "latest", timestamp: 1 }], [], "system", vi.fn(),
      undefined, undefined, undefined, undefined, true,
    ));

    expect(finalMessage).toHaveBeenCalledOnce();
    expect(chunks.at(-1)?.type).toBe("done");
    expect(chunks.some(chunk => chunk.type === "error")).toBe(false);
  });

  it("uses adaptive thinking and high effort for Claude Opus 5", async () => {
    const completed = {
      content: [{ type: "text", text: "Done", citations: [] }],
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: "end_turn",
    };
    mocks.anthropicStream.mockReturnValue({
      ...asyncEvents([{ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Done" } }]),
      currentMessage: undefined,
      finalMessage: vi.fn().mockResolvedValue(completed),
    });

    const chunks = await collect(anthropicChatWithToolsStream(
      "https://api.anthropic.com", "key", "claude-opus-5",
      [{ role: "user", content: "Think carefully", timestamp: 1 }], [], "system", vi.fn(),
      undefined, true,
    ));

    const request = mocks.anthropicStream.mock.calls[0][0];
    expect(request.thinking).toEqual({ type: "adaptive" });
    expect(request.output_config).toEqual({ effort: "high" });
    expect(request.thinking).not.toHaveProperty("budget_tokens");
    expect(chunks.at(-1)?.type).toBe("done");
  });

  it("keeps fixed-budget thinking for Claude 4.5 models", async () => {
    const completed = {
      content: [{ type: "text", text: "Done", citations: [] }],
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: "end_turn",
    };
    mocks.anthropicStream.mockReturnValue({
      ...asyncEvents([{ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Done" } }]),
      currentMessage: undefined,
      finalMessage: vi.fn().mockResolvedValue(completed),
    });

    await collect(anthropicChatWithToolsStream(
      "https://api.anthropic.com", "key", "claude-opus-4-5",
      [{ role: "user", content: "Think carefully", timestamp: 1 }], [], "system", vi.fn(),
      undefined, true,
    ));

    const request = mocks.anthropicStream.mock.calls[0][0];
    expect(request.thinking).toEqual({ type: "enabled", budget_tokens: 10000 });
    expect(request.output_config).toBeUndefined();
  });
});
