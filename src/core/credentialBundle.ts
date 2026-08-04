import type { LlmHubSettings, McpServerConfig, RagSetting, WorkspaceState } from "../types";

/**
 * Single source of truth for "which settings fields are credentials".
 *
 * Credentials are either kept in the plugin's own files (`plaintext`) or handed
 * to Obsidian's SecretStorage (`secretStorage`), which is device-local and never
 * written into the vault. This module only maps values between the settings
 * objects and a serialisable bundle — the storage itself lives in
 * `secretStorage.ts`.
 */

/** Secret id holding every settings-level credential. */
export const SETTINGS_CREDENTIAL_SECRET_ID = "llm-hub-credentials";

/**
 * RAG credentials live in the per-workspace state file, so they get one secret
 * per workspace folder. Switching folders then never overwrites the other
 * folder's keys.
 */
export function ragCredentialSecretId(workspaceFolder: string): string {
  // djb2 — only needs to be deterministic; secret ids must be lowercase
  // alphanumeric with dashes, which rules out using the folder path directly.
  let hash = 5381;
  for (let i = 0; i < workspaceFolder.length; i++) {
    hash = ((hash * 33) ^ workspaceFolder.charCodeAt(i)) >>> 0;
  }
  return `llm-hub-rag-${hash.toString(16)}`;
}

export interface SettingsCredentialBundle {
  apiProviderKeys: Record<string, string>;
  localLlmCredentials: Record<string, { apiKey?: string; password?: string }>;
  mcpCredentials: Record<string, { headers?: Record<string, string>; env?: Record<string, string> }>;
  langfuseSecretKey: string;
  discordBotToken: string;
}

export interface RagCredentialBundle {
  embeddingApiKeys: Record<string, string>;
}

/**
 * MCP servers have no stable id, so credentials are keyed by the fields that
 * identify the connection. Renaming a server in the settings UI keeps working
 * because the bundle is rebuilt from the in-memory config on every save.
 */
export function mcpCredentialKey(server: McpServerConfig): string {
  return JSON.stringify([server.transport, server.name, server.url, server.command ?? ""]);
}

/** Logical credential slots, used to remember what is configured on other devices. */
export const credentialSlot = {
  apiProvider: (id: string) => `apiProvider:${id}`,
  localLlmApiKey: (id: string) => `localLlm:${id}:apiKey`,
  localLlmPassword: (id: string) => `localLlm:${id}:password`,
  mcpHeaders: (server: McpServerConfig) => `mcp:${mcpCredentialKey(server)}:headers`,
  mcpEnv: (server: McpServerConfig) => `mcp:${mcpCredentialKey(server)}:env`,
  langfuse: "langfuse",
  discord: "discord",
} as const;

export function collectSettingsCredentials(settings: LlmHubSettings): SettingsCredentialBundle {
  return {
    apiProviderKeys: Object.fromEntries(
      settings.apiProviders.filter(provider => provider.apiKey).map(provider => [provider.id, provider.apiKey])
    ),
    localLlmCredentials: Object.fromEntries(
      settings.localLlmConfigs
        .filter(config => config.apiKey || config.password)
        .map(config => [config.id, { apiKey: config.apiKey, password: config.password }])
    ),
    mcpCredentials: Object.fromEntries(
      settings.mcpServers
        .filter(server => server.headers || server.env)
        .map(server => [mcpCredentialKey(server), { headers: server.headers, env: server.env }])
    ),
    langfuseSecretKey: settings.langfuse.secretKey,
    discordBotToken: settings.discord.botToken,
  };
}

/**
 * Overlay stored credentials onto settings. Values already present win, so a
 * plaintext copy is never replaced by a stale or missing secret.
 */
export function applySettingsCredentials(
  settings: LlmHubSettings,
  bundle: Partial<SettingsCredentialBundle>,
): void {
  for (const provider of settings.apiProviders) {
    provider.apiKey = provider.apiKey || bundle.apiProviderKeys?.[provider.id] || "";
  }
  for (const config of settings.localLlmConfigs) {
    const stored = bundle.localLlmCredentials?.[config.id];
    config.apiKey = config.apiKey || stored?.apiKey || undefined;
    config.password = config.password || stored?.password || undefined;
  }
  for (const server of settings.mcpServers) {
    const stored = bundle.mcpCredentials?.[mcpCredentialKey(server)];
    server.headers = server.headers ?? stored?.headers;
    server.env = server.env ?? stored?.env;
  }
  settings.langfuse.secretKey = settings.langfuse.secretKey || bundle.langfuseSecretKey || "";
  settings.discord.botToken = settings.discord.botToken || bundle.discordBotToken || "";
}

/** A copy of the settings with every credential blanked, for writing to data.json. */
export function stripSettingsCredentials(settings: LlmHubSettings): LlmHubSettings {
  return {
    ...settings,
    apiProviders: settings.apiProviders.map(provider => ({ ...provider, apiKey: "" })),
    localLlmConfigs: settings.localLlmConfigs.map(config => ({ ...config, apiKey: undefined, password: undefined })),
    mcpServers: settings.mcpServers.map(server => ({ ...server, headers: undefined, env: undefined })),
    langfuse: { ...settings.langfuse, secretKey: "" },
    discord: { ...settings.discord, botToken: "" },
  };
}

/** Slots that hold a value on this device. */
function slotsWithValue(settings: LlmHubSettings): string[] {
  const slots: string[] = [];
  for (const provider of settings.apiProviders) {
    if (provider.apiKey) slots.push(credentialSlot.apiProvider(provider.id));
  }
  for (const config of settings.localLlmConfigs) {
    if (config.apiKey) slots.push(credentialSlot.localLlmApiKey(config.id));
    if (config.password) slots.push(credentialSlot.localLlmPassword(config.id));
  }
  for (const server of settings.mcpServers) {
    if (server.headers) slots.push(credentialSlot.mcpHeaders(server));
    if (server.env) slots.push(credentialSlot.mcpEnv(server));
  }
  if (settings.langfuse.secretKey) slots.push(credentialSlot.langfuse);
  if (settings.discord.botToken) slots.push(credentialSlot.discord);
  return slots;
}

/** Every slot that still has an owner in the settings, whether filled or not. */
function existingSlots(settings: LlmHubSettings): Set<string> {
  const slots = new Set<string>([credentialSlot.langfuse, credentialSlot.discord]);
  for (const provider of settings.apiProviders) slots.add(credentialSlot.apiProvider(provider.id));
  for (const config of settings.localLlmConfigs) {
    slots.add(credentialSlot.localLlmApiKey(config.id));
    slots.add(credentialSlot.localLlmPassword(config.id));
  }
  for (const server of settings.mcpServers) {
    slots.add(credentialSlot.mcpHeaders(server));
    slots.add(credentialSlot.mcpEnv(server));
  }
  return slots;
}

/**
 * Merge the slots filled on this device with what other devices reported, so a
 * key entered elsewhere is still shown as configured here. Slots whose provider
 * was deleted are dropped.
 */
export function mergeConfiguredCredentials(
  settings: LlmHubSettings,
  previous: string[] | undefined,
): string[] {
  const existing = existingSlots(settings);
  const merged = new Set(slotsWithValue(settings));
  for (const slot of previous ?? []) {
    if (existing.has(slot)) merged.add(slot);
  }
  return [...merged].sort();
}

export function collectRagCredentials(workspaceState: WorkspaceState): RagCredentialBundle {
  return {
    embeddingApiKeys: Object.fromEntries(
      Object.entries(workspaceState.ragSettings)
        .filter(([, setting]) => setting.embeddingApiKey)
        .map(([name, setting]) => [name, setting.embeddingApiKey])
    ),
  };
}

export function applyRagCredentials(
  workspaceState: WorkspaceState,
  bundle: Partial<RagCredentialBundle>,
): void {
  for (const [name, setting] of Object.entries(workspaceState.ragSettings)) {
    setting.embeddingApiKey = setting.embeddingApiKey || bundle.embeddingApiKeys?.[name] || "";
  }
}

/**
 * A copy of the workspace state with embedding keys blanked. The
 * `embeddingApiKeyConfigured` marker rides along in the file so other devices
 * can tell "not set up" apart from "set up elsewhere".
 */
/**
 * Drop the "configured elsewhere" markers, used when credentials move back into
 * the workspace file and the values speak for themselves.
 */
export function clearRagCredentialMarkers(workspaceState: WorkspaceState): WorkspaceState {
  const entries = Object.entries(workspaceState.ragSettings);
  if (!entries.some(([, setting]) => setting.embeddingApiKeyConfigured)) return workspaceState;
  return {
    ...workspaceState,
    ragSettings: Object.fromEntries(
      entries.map(([name, setting]): [string, RagSetting] => [
        name,
        { ...setting, embeddingApiKeyConfigured: undefined },
      ])
    ),
  };
}

export function stripWorkspaceCredentials(workspaceState: WorkspaceState): WorkspaceState {
  return {
    ...workspaceState,
    ragSettings: Object.fromEntries(
      Object.entries(workspaceState.ragSettings).map(([name, setting]): [string, RagSetting] => [
        name,
        {
          ...setting,
          embeddingApiKey: "",
          embeddingApiKeyConfigured: !!setting.embeddingApiKey || !!setting.embeddingApiKeyConfigured,
        },
      ])
    ),
  };
}
