import { describe, expect, it } from "vitest";
import { getMcpAppResourceUri } from "./mcpTools";

describe("MCP Apps metadata", () => {
  it("reads modern and legacy tool resource metadata", () => {
    expect(getMcpAppResourceUri({ ui: { resourceUri: "ui://demo/app" } })).toBe("ui://demo/app");
    expect(getMcpAppResourceUri({ "ui/resourceUri": "ui://demo/legacy" })).toBe("ui://demo/legacy");
    expect(getMcpAppResourceUri({ ui: { resourceUri: "https://unsafe.example" } })).toBeUndefined();
  });
});
