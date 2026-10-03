import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, getLocalLlmConfig, type LocalLlmConfig } from "src/types";
import { getWorkflowModelOptions } from "./workflowModels";

const config: LocalLlmConfig = {
  id: "studio", name: "Studio", framework: "lm-studio", baseUrl: "http://localhost:1234",
  verified: true, model: "old-model", enabledModels: ["qwen:latest", "org/model"],
};

describe("workflow model options", () => {
  it("lists each selected local model with a label and a resolvable identifier", () => {
    const settings = { ...DEFAULT_SETTINGS, localLlmConfigs: [config] };
    const options = getWorkflowModelOptions(settings);
    expect(options).toEqual([
      { value: "local-llm:studio:qwen:latest", label: "Studio (qwen:latest)" },
      { value: "local-llm:studio:org/model", label: "Studio (org/model)" },
    ]);
    expect(options.map(option => getLocalLlmConfig(option.value, settings)?.model)).toEqual(config.enabledModels);
  });

  it("excludes disabled, unverified, and model-less local servers", () => {
    expect(getWorkflowModelOptions({ ...DEFAULT_SETTINGS, localLlmConfigs: [
      { ...config, enabled: false }, { ...config, verified: false },
      { ...config, model: "", enabledModels: [] },
    ] })).toEqual([]);
  });

  it("supports legacy single-model configurations", () => {
    expect(getWorkflowModelOptions({ ...DEFAULT_SETTINGS, localLlmConfigs: [
      { ...config, name: "", enabledModels: undefined },
    ] })).toEqual([{ value: "local-llm:studio:old-model", label: "Local LLM (old-model)" }]);
  });
});
