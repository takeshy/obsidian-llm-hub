import { describe, expect, it } from "vitest";
import type { Message } from "src/types";
import { messagesToMarkdown, parseMarkdownToMessages } from "./chatHistory";

describe("chat web-search metadata", () => {
  it("round-trips sources and provider continuation state", async () => {
    const messages: Message[] = [{
      role: "assistant",
      content: "Answer 〔1〕",
      timestamp: 1234,
      webSearchUsed: true,
      webSearchSources: [{ title: "Example", url: "https://example.com" }],
      providerContinuation: {
        provider: "anthropic",
        baseUrl: "https://api.anthropic.com",
        model: "claude-sonnet-4-6",
        items: [{ role: "assistant", content: [{ type: "web_search_tool_result", encrypted_content: "opaque" }] }],
      },
    }];

    const markdown = await messagesToMarkdown(messages, "Search", 1234, undefined);
    const parsed = parseMarkdownToMessages(markdown);

    expect(parsed?.messages[0].webSearchUsed).toBe(true);
    expect(parsed?.messages[0].webSearchSources).toEqual(messages[0].webSearchSources);
    expect(parsed?.messages[0].providerContinuation).toEqual(messages[0].providerContinuation);
  });
});

describe("chat model display metadata", () => {
  it("preserves the exact Codex model and reasoning effort", async () => {
    const messages: Message[] = [{
      role: "assistant",
      content: "Answer",
      timestamp: 1234,
      model: "codex-cli",
      modelDisplayName: "Codex CLI · gpt-5.6-luna · xhigh",
    }];

    const markdown = await messagesToMarkdown(messages, "Codex", 1234, undefined);
    const parsed = parseMarkdownToMessages(markdown);

    expect(parsed?.messages[0].modelDisplayName).toBe("Codex CLI · gpt-5.6-luna · xhigh");
  });
});
