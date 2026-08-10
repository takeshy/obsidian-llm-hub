import { describe, expect, it } from "vitest";
import { mapToolCallToAppResult } from "./mcpClientUtils";

describe("mapToolCallToAppResult", () => {
  it("preserves structured content for MCP Apps", () => {
    const structuredContent = { candidates: [{ name: "Tokyo" }] };

    expect(mapToolCallToAppResult({
      content: [{ type: "text", text: "map data" }],
      structuredContent,
      _meta: { ui: { resourceUri: "ui://geo-home-mcp/land-price-map.html" } },
    })).toMatchObject({ structuredContent });
  });
});
