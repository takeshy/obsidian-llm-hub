import { describe, expect, it } from "vitest";
import { buildGeminiThinkingConfig } from "./gemini";

describe("Gemini reasoning effort", () => {
  it("passes explicit Gemini 3 thinking levels", () => {
    expect(buildGeminiThinkingConfig("gemini-3.8-flash", false, "medium")).toEqual({
      includeThoughts: true,
      thinkingLevel: "MEDIUM",
    });
  });

  it("leaves reasoning to the provider for default", () => {
    expect(buildGeminiThinkingConfig("gemini-3.8-flash", false, "default")).toBeUndefined();
  });
});
