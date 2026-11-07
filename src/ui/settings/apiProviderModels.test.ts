import { describe, expect, it } from "vitest";
import { getAvailableModels } from "src/core/availableModels";
import { DEFAULT_SETTINGS, getApiProviderId, getApiProviderModelName, type ApiProviderConfig } from "src/types";
import { addManualApiProviderModel, getApiProviderModelChoices, refreshApiProviderModels } from "./apiProviderModels";

function provider(overrides: Partial<ApiProviderConfig> = {}): ApiProviderConfig {
  return {
    id: "router", name: "OpenRouter", type: "openrouter",
    baseUrl: "https://openrouter.ai/api", apiKey: "key",
    availableModels: ["vendor/model"], enabledModels: ["vendor/model"],
    verified: true, enabled: true, ...overrides,
  };
}

describe("manually added API models", () => {
  it("does not infer a vendor or rewrite manually entered IDs", () => {
    const config = provider();
    expect(addManualApiProviderModel(config, "model:nitro")).toBe(true);
    expect(config.manualModels).toEqual(["model:nitro"]);
  });

  it.each(["openai", "gemini", "anthropic", "grok"] as const)(
    "does not show built-in models before fetching from %s", (type) => {
      const config = provider({ type, verified: false, availableModels: [], enabledModels: [] });
      expect(getApiProviderModelChoices(config)).toEqual([]);
    },
  );

  it("does not show stale fetched models when the provider is unverified", () => {
    expect(getApiProviderModelChoices(provider({ verified: false }))).toEqual([]);
  });

  it("keeps manual entries visible before fetching, without adding built-in models", () => {
    const config = provider({ type: "openai", verified: false, availableModels: [], manualModels: ["custom-model"] });
    expect(getApiProviderModelChoices(config)).toEqual(["custom-model"]);
  });

  it("does not substitute built-in models for an empty fetched catalog", () => {
    expect(getApiProviderModelChoices(provider({ type: "openai", availableModels: [] }))).toEqual([]);
  });

  it("shows fetched models after verification", () => {
    const config = provider({ verified: false, availableModels: [], enabledModels: [] });
    refreshApiProviderModels(config, ["vendor/model"]);
    config.verified = true;
    expect(getApiProviderModelChoices(config)).toEqual(["vendor/model"]);
  });

  it("keeps suffixes through save/reload, catalog refresh, and chat model selection", () => {
    const config = provider();
    expect(addManualApiProviderModel(config, " vendor/model:nitro:exacto ")).toBe(true);

    // Settings are persisted as JSON and reloaded before the next catalog refresh.
    const reloaded: ApiProviderConfig = JSON.parse(JSON.stringify(config));
    refreshApiProviderModels(reloaded, ["vendor/model", "vendor/new-model"]);
    expect(getApiProviderModelChoices(reloaded)).toEqual([
      "vendor/model", "vendor/new-model", "vendor/model:nitro:exacto",
    ]);

    const selectable = getAvailableModels({ ...DEFAULT_SETTINGS, apiProviders: [reloaded] });
    const manual = selectable.find(model => model.name.endsWith(":nitro:exacto"));
    expect(manual?.name).toBe("api:router:vendor/model:nitro:exacto");
    expect(getApiProviderId(manual!.name)).toBe("router");
    expect(getApiProviderModelName(manual!.name)).toBe("vendor/model:nitro:exacto");
  });

  it("retains disabled manual entries without re-enabling them on refresh", () => {
    const config = provider({ manualModels: ["vendor/model:floor"] });
    refreshApiProviderModels(config, []);
    expect(config.enabledModels).toEqual([]);
    expect(getApiProviderModelChoices(config)).toEqual(["vendor/model:floor"]);
  });

  it("preserves enabled manual entries while pruning retired discovered models", () => {
    const config = provider();
    addManualApiProviderModel(config, "vendor/model:nitro");
    refreshApiProviderModels(config, []);
    expect(config.enabledModels).toEqual(["vendor/model:nitro"]);
    expect(config.manualModels).toEqual(["vendor/model:nitro"]);
  });

  it("deduplicates manual and discovered IDs, and re-enables an existing manual entry", () => {
    const config = provider({ enabledModels: [] });
    addManualApiProviderModel(config, "vendor/model");
    addManualApiProviderModel(config, " vendor/model ");
    expect(config.manualModels).toEqual(["vendor/model"]);
    expect(config.enabledModels).toEqual(["vendor/model"]);
    expect(getApiProviderModelChoices(config)).toEqual(["vendor/model"]);
  });

  it("ignores blank input without changing settings", () => {
    const config = provider();
    const before = structuredClone(config);
    expect(addManualApiProviderModel(config, " \n ")).toBe(false);
    expect(config).toEqual(before);
  });

  it("keeps existing Gemini catalog filtering while allowing exact manual IDs", () => {
    const config = provider({
      type: "gemini", availableModels: ["gemini-2.5-flash-lite"],
      manualModels: ["gemini-2.5-flash-lite:custom"],
    });
    const choices = getApiProviderModelChoices(config);
    expect(choices).toContain("gemini-3.5-flash-lite");
    expect(choices).not.toContain("gemini-2.5-flash-lite");
    expect(choices).toContain("gemini-2.5-flash-lite:custom");
  });
});
