import {
  CLAUDE_CLI_MODEL,
  CLI_MODEL,
  CODEX_CLI_MODEL,
  localLlmDisplayName,
  type LlmHubSettings,
  type ModelInfo,
  type ModelType,
} from "src/types";

/** Models that are currently enabled and ready for use across settings surfaces. */
export function getAvailableModels(settings: LlmHubSettings): ModelInfo[] {
  const apiModels: ModelInfo[] = settings.apiProviders
    .filter((provider) => provider.enabled && provider.verified)
    .flatMap((provider) => provider.enabledModels.map((model) => ({
      name: `api:${provider.id}:${model}` as ModelType,
      displayName: `${provider.name} (${model})`,
      description: `${provider.type} API provider`,
      isCliModel: false,
      providerName: provider.name,
    })));

  const cliModels: ModelInfo[] = [];
  if (settings.cliConfig?.cliVerified) cliModels.push(CLI_MODEL);
  if (settings.cliConfig?.claudeCliVerified) cliModels.push(CLAUDE_CLI_MODEL);
  if (settings.cliConfig?.codexCliVerified) cliModels.push(CODEX_CLI_MODEL);

  const localModels: ModelInfo[] = (settings.localLlmConfigs ?? [])
    .filter((config) => config.verified && config.enabled !== false)
    .flatMap((config) => {
      const models = config.enabledModels?.length
        ? config.enabledModels
        : config.model ? [config.model] : [];
      return models.map((model) => ({
        name: `local-llm:${config.id}:${model}` as ModelType,
        displayName: localLlmDisplayName(config, model),
        description: `Local LLM (${config.framework})`,
        isCliModel: true,
      }));
    });

  return [...apiModels, ...cliModels, ...localModels];
}
