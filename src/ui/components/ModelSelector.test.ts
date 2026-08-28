import { describe, expect, it } from "vitest";
import type { ModelInfo } from "src/types";
import { filterModelOptions } from "./ModelSelector";

const models: ModelInfo[] = [
  { name: "api:openai:gpt-5", displayName: "GPT 5", description: "", providerName: "OpenAI" },
  { name: "api:google:gemini-pro", displayName: "Gemini Pro", description: "", providerName: "Google" },
  { name: "api:openai:gpt-5", displayName: "Duplicate", description: "" },
];

describe("filterModelOptions", () => {
  it("filters by display name, internal name, or provider without case sensitivity", () => {
    expect(filterModelOptions(models, "gemini").map((model) => model.name)).toEqual(["api:google:gemini-pro"]);
    expect(filterModelOptions(models, "OPENAI").map((model) => model.name)).toEqual(["api:openai:gpt-5"]);
  });

  it("preserves order while removing duplicate model IDs", () => {
    expect(filterModelOptions(models, " ").map((model) => model.displayName)).toEqual(["GPT 5", "Gemini Pro"]);
  });
});
