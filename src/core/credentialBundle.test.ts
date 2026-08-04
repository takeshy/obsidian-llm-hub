import { describe, expect, it } from "vitest";
import {
  applyRagCredentials,
  applySettingsCredentials,
  clearRagCredentialMarkers,
  collectRagCredentials,
  collectSettingsCredentials,
  credentialSlot,
  mergeConfiguredCredentials,
  ragCredentialSecretId,
  stripSettingsCredentials,
  stripWorkspaceCredentials,
} from "./credentialBundle";
import {
  DEFAULT_SETTINGS,
  DEFAULT_WORKSPACE_STATE,
  type LlmHubSettings,
  type WorkspaceState,
} from "../types";

function fixtures(): { settings: LlmHubSettings; workspace: WorkspaceState } {
  const settings = structuredClone(DEFAULT_SETTINGS);
  settings.apiProviders = [{
    id: "provider-1", name: "Test", type: "custom", baseUrl: "https://example.com",
    apiKey: "provider-key", enabledModels: [], availableModels: [], verified: true, enabled: true,
  }];
  settings.localLlmConfigs = [{
    id: "local-1", framework: "opencode", baseUrl: "http://localhost:4096", model: "test",
    apiKey: "local-key", password: "local-password",
  }];
  settings.mcpServers = [{
    name: "MCP", transport: "http", url: "https://mcp.example.com", enabled: true,
    headers: { Authorization: "Bearer token" }, env: { TOKEN: "secret" },
  }];
  settings.langfuse = { ...settings.langfuse, secretKey: "langfuse-secret" };
  settings.discord = { ...settings.discord, botToken: "discord-token" };

  const workspace = structuredClone(DEFAULT_WORKSPACE_STATE);
  workspace.ragSettings = {
    Research: {
      embeddingBaseUrl: "", embeddingApiKey: "embedding-key", embeddingModel: "",
      chunkSize: 500, chunkOverlap: 100, pdfChunkPages: 6, topK: 5, scoreThreshold: 0.3,
      targetFolders: [], excludePatterns: [], searchFileExtensions: [], lastFullSync: null,
      externalIndexPath: "", sourceRagSettings: [], indexMultimodal: false,
    },
  };
  return { settings, workspace };
}

describe("credential bundle", () => {
  it("round-trips credentials while persisted settings remain secret-free", () => {
    const { settings, workspace } = fixtures();
    const bundle = collectSettingsCredentials(settings);
    const ragBundle = collectRagCredentials(workspace);
    const persistedSettings = stripSettingsCredentials(settings);
    const persistedWorkspace = stripWorkspaceCredentials(workspace);

    for (const secret of ["provider-key", "local-key", "local-password", "Bearer token", "langfuse-secret", "discord-token"]) {
      expect(JSON.stringify(persistedSettings)).not.toContain(secret);
    }
    expect(JSON.stringify(persistedWorkspace)).not.toContain("embedding-key");

    applySettingsCredentials(persistedSettings, bundle);
    applyRagCredentials(persistedWorkspace, ragBundle);
    expect(collectSettingsCredentials(persistedSettings)).toEqual(bundle);
    expect(collectRagCredentials(persistedWorkspace)).toEqual(ragBundle);
  });

  it("keeps plaintext values that the stored bundle does not have", () => {
    const { settings, workspace } = fixtures();

    // An empty bundle must never wipe credentials that are still in the settings —
    // that is the only remaining copy when a secret write failed.
    applySettingsCredentials(settings, {});
    applyRagCredentials(workspace, {});

    expect(settings.apiProviders[0].apiKey).toBe("provider-key");
    expect(settings.localLlmConfigs[0].password).toBe("local-password");
    expect(settings.mcpServers[0].headers).toEqual({ Authorization: "Bearer token" });
    expect(settings.langfuse.secretKey).toBe("langfuse-secret");
    expect(workspace.ragSettings.Research.embeddingApiKey).toBe("embedding-key");
  });

  it("drops the configured marker once keys are back in the workspace file", () => {
    const { workspace } = fixtures();
    const marked = stripWorkspaceCredentials(workspace);

    expect(clearRagCredentialMarkers(marked).ragSettings.Research.embeddingApiKeyConfigured).toBeUndefined();
    // Nothing to clear — the same object is reused.
    expect(clearRagCredentialMarkers(workspace)).toBe(workspace);
  });

  it("marks stripped embedding keys as configured so other devices can tell", () => {
    const { workspace } = fixtures();
    const stripped = stripWorkspaceCredentials(workspace);

    expect(stripped.ragSettings.Research.embeddingApiKey).toBe("");
    expect(stripped.ragSettings.Research.embeddingApiKeyConfigured).toBe(true);

    // The marker survives a device that never held the key.
    expect(stripWorkspaceCredentials(stripped).ragSettings.Research.embeddingApiKeyConfigured).toBe(true);
  });

  it("survives renaming an MCP server", () => {
    const { settings } = fixtures();
    settings.mcpServers[0].name = "Renamed";

    const bundle = collectSettingsCredentials(settings);
    const persisted = stripSettingsCredentials(settings);
    applySettingsCredentials(persisted, bundle);

    expect(persisted.mcpServers[0].headers).toEqual({ Authorization: "Bearer token" });
  });

  describe("configured credential slots", () => {
    it("keeps slots reported by other devices", () => {
      const { settings } = fixtures();
      const local = stripSettingsCredentials(settings);
      const previous = mergeConfiguredCredentials(settings, undefined);

      expect(previous).toContain(credentialSlot.apiProvider("provider-1"));
      expect(previous).toContain(credentialSlot.localLlmPassword("local-1"));
      expect(previous).toContain(credentialSlot.mcpHeaders(settings.mcpServers[0]));
      expect(previous).toContain(credentialSlot.discord);

      // A device holding no credentials still reports what the others configured.
      expect(mergeConfiguredCredentials(local, previous)).toEqual(previous);
    });

    it("drops slots whose owner was deleted", () => {
      const { settings } = fixtures();
      const previous = mergeConfiguredCredentials(settings, undefined);
      settings.apiProviders = [];

      const merged = mergeConfiguredCredentials(settings, previous);
      expect(merged).not.toContain(credentialSlot.apiProvider("provider-1"));
      expect(merged).toContain(credentialSlot.localLlmApiKey("local-1"));
    });
  });

  describe("rag secret ids", () => {
    it("is deterministic and distinct per workspace folder", () => {
      expect(ragCredentialSecretId("LLM-Hub")).toBe(ragCredentialSecretId("LLM-Hub"));
      expect(ragCredentialSecretId("LLM-Hub")).not.toBe(ragCredentialSecretId("Other"));
    });

    it("only uses characters Obsidian accepts for secret ids", () => {
      for (const folder of ["LLM-Hub", "作業用/RAG", "a b c", ""]) {
        expect(ragCredentialSecretId(folder)).toMatch(/^[a-z0-9-]+$/);
      }
    });
  });
});
