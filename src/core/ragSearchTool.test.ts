import { describe, expect, it, vi } from "vitest";
import type { LocalRagSearchResult } from "./localRagStore";
import {
  MAX_DYNAMIC_RAG_RESULTS,
  MAX_RAG_SEARCHES_PER_TURN,
  RAG_SEARCH_TOOL,
  createRagSearchRunner,
} from "./ragSearchTool";

const chunk = (filePath: string, text = "body"): LocalRagSearchResult => ({
  filePath, text, score: 0.8, chunkIndex: 0,
});

interface ToolResult {
  query?: string;
  results?: { filePath: string; text: string; score: number }[];
  remainingSearches?: number;
  error?: string;
}

describe("rag_search tool", () => {
  it("requires a focused query", () => {
    expect(RAG_SEARCH_TOOL.name).toBe("rag_search");
    expect(RAG_SEARCH_TOOL.parameters.required).toEqual(["query"]);
  });

  it("returns chunks and the remaining budget", async () => {
    const runner = createRagSearchRunner(async () => [chunk("spec/product.md", "Product details")]);
    const result = await runner.run({ query: "  product overview  " }) as ToolResult;

    expect(result.query).toBe("product overview");
    expect(result.results).toEqual([
      { filePath: "spec/product.md", score: 0.8, text: "Product details" },
    ]);
    expect(result.remainingSearches).toBe(MAX_RAG_SEARCHES_PER_TURN - 1);
  });

  it("caps how many chunks a follow-up search may pull", async () => {
    const search = vi.fn(async () => [chunk("a.md")]);
    await createRagSearchRunner(search).run({ query: "q" });
    expect(search).toHaveBeenCalledWith("q", MAX_DYNAMIC_RAG_RESULTS);
  });

  it("allows three on-demand searches per turn", async () => {
    const search = vi.fn(async () => [chunk("a.md")]);
    const runner = createRagSearchRunner(search);
    for (let i = 0; i < MAX_RAG_SEARCHES_PER_TURN; i++) {
      expect((await runner.run({ query: `q${i}` }) as ToolResult).error).toBeUndefined();
    }
    const exhausted = await runner.run({ query: "one too many" }) as ToolResult;

    expect(exhausted.error).toMatch(/limit reached/);
    expect(search).toHaveBeenCalledTimes(MAX_RAG_SEARCHES_PER_TURN);
  });

  it("does not charge a failed search against the budget", async () => {
    const search = vi.fn()
      .mockRejectedValueOnce(new Error("embedding timeout"))
      .mockResolvedValue([chunk("a.md")]);
    const runner = createRagSearchRunner(search);

    const failed = await runner.run({ query: "q" }) as ToolResult;
    expect(failed.error).toMatch(/embedding timeout/);

    const after = await runner.run({ query: "q" }) as ToolResult;
    expect(after.remainingSearches).toBe(MAX_RAG_SEARCHES_PER_TURN - 1);
  });

  it("rejects a missing or blank query without spending the budget", async () => {
    const search = vi.fn(async () => [chunk("a.md")]);
    const runner = createRagSearchRunner(search);

    expect((await runner.run({}) as ToolResult).error).toBeTruthy();
    expect((await runner.run({ query: "   " }) as ToolResult).error).toBeTruthy();
    expect(search).not.toHaveBeenCalled();
  });

  it("reports each newly retrieved file once", async () => {
    const onSources = vi.fn();
    const runner = createRagSearchRunner(
      async () => [chunk("a.md"), chunk("a.md"), chunk("b.md")],
      onSources,
    );

    await runner.run({ query: "q" });

    expect(onSources).toHaveBeenCalledWith(["a.md", "b.md"]);
  });

  it("does not report sources when a search finds nothing", async () => {
    const onSources = vi.fn();
    await createRagSearchRunner(async () => [], onSources).run({ query: "q" });
    expect(onSources).not.toHaveBeenCalled();
  });
});
