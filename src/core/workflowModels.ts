import type { WorkflowModelOption } from "obsidian-llm-hub-common/workflow";
import { CLI_MODEL, CODEX_CLI_MODEL, localLlmDisplayName, type LlmHubSettings } from "src/types";

export function getWorkflowModelOptions(settings: LlmHubSettings): WorkflowModelOption[] {
  const options: WorkflowModelOption[] = [];
  for (const provider of settings.apiProviders.filter(p => p.enabled && p.verified)) {
    for (const model of provider.enabledModels) {
      options.push({ value: `api:${provider.id}:${model}`, label: `${provider.name} (${model})` });
    }
  }
  if (settings.cliConfig?.cliVerified) options.push({ value: CLI_MODEL.name, label: CLI_MODEL.displayName });
  if (settings.cliConfig?.codexCliVerified) options.push({ value: CODEX_CLI_MODEL.name, label: CODEX_CLI_MODEL.displayName });
  for (const config of settings.localLlmConfigs ?? []) {
    if (!config.verified || config.enabled === false) continue;
    const models = config.enabledModels?.length ? config.enabledModels : (config.model ? [config.model] : []);
    for (const model of models) {
      options.push({ value: `local-llm:${config.id}:${model}`, label: localLlmDisplayName(config, model) });
    }
  }
  return options;
}
