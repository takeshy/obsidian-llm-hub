import { describe, expect, it } from "vitest";
import { isLocalLlmToolsEnabled, isToolsCompatibleFramework, type LocalLlmConfig } from "../types";

function config(framework: LocalLlmConfig["framework"]): LocalLlmConfig {
  return { id: "test", framework, baseUrl: "http://localhost", model: "provider/model" };
}

describe("local LLM tool capability", () => {
  it("enables OpenCode tools through its MCP path without treating it as OpenAI-compatible", () => {
    expect(isToolsCompatibleFramework("opencode")).toBe(false);
    expect(isLocalLlmToolsEnabled(config("opencode"), "provider/model")).toBe(true);
  });

  it("honors the per-model tools blocklist for OpenCode", () => {
    const value = config("opencode");
    value.toolsUnsupportedModels = ["provider/model"];
    expect(isLocalLlmToolsEnabled(value, "provider/model")).toBe(false);
  });
});
