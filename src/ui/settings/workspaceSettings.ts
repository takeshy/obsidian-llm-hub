import { Setting } from "obsidian";
import {
  addAllowedVaultFoldersSetting,
  addHideWorkspaceFolderSetting,
  addMaxSavedChatHistoriesSetting,
  addSaveChatHistorySetting,
  addSystemPromptSetting,
  addToolLimitsSection,
  addWorkspaceFolderSetting,
} from "obsidian-llm-hub-common/settings";
import { t } from "src/i18n";
import { DEFAULT_SETTINGS, DEFAULT_WORKSPACE_FOLDER } from "src/types";
import { getLocalRagStore } from "src/core/localRagStore";
import { ragCredentialSecretId } from "src/core/credentialBundle";
import { clearSecret, copySecret, readSecretJson } from "src/core/secretStorage";
import type { SettingsContext } from "./settingsContext";

export function displayWorkspaceSettings(containerEl: HTMLElement, ctx: SettingsContext): void {
  const { plugin } = ctx;

  new Setting(containerEl).setName(t("settings.workspace")).setHeading();

  // The RAG credential bundle is stored under a name derived from the workspace
  // folder, so it lives outside the folder the move renames and has to be
  // carried across by hand.
  let migratedOldSecretId: string | null = null;
  addWorkspaceFolderSetting(containerEl, ctx, DEFAULT_WORKSPACE_FOLDER, {
    beforeRename: (from, to) => {
      migratedOldSecretId = null;
      if (!plugin.isSecretCredentialStorage()) return {};
      const oldSecretId = ragCredentialSecretId(from);
      const newSecretId = ragCredentialSecretId(to);
      // Only the copy we make ourselves may be rolled back — a secret that was
      // already there belongs to whatever used that name.
      const secretWasCopied = !readSecretJson(plugin.app, newSecretId);
      if (!copySecret(plugin.app, oldSecretId, newSecretId)) {
        return { error: t("settings.credentialStorage.workspaceMigrationFailed") };
      }
      migratedOldSecretId = oldSecretId;
      return { rollback: secretWasCopied ? () => clearSecret(plugin.app, newSecretId) : undefined };
    },
    afterMove: () => {
      if (migratedOldSecretId) clearSecret(plugin.app, migratedOldSecretId);
      migratedOldSecretId = null;
    },
    afterChange: (folder) => {
      // The local RAG index caches paths under the old folder name.
      const localRag = getLocalRagStore();
      if (localRag) {
        localRag.workspaceFolder = folder;
        localRag.clearAll();
      }
    },
  });

  addHideWorkspaceFolderSetting(containerEl, ctx, DEFAULT_WORKSPACE_FOLDER);

  addAllowedVaultFoldersSetting(
    containerEl,
    ctx,
    {
      name: t("settings.cloudVaultToolAllowedFolders"),
      desc: t("settings.cloudVaultToolAllowedFolders.desc"),
      placeholder: t("settings.cloudVaultToolAllowedFolders.placeholder"),
    },
    {
      get: () => plugin.settings.cloudVaultToolAllowedFolders,
      set: (folders) => { plugin.settings.cloudVaultToolAllowedFolders = folders; },
    },
  );

  // Chats are written straight into the workspace folder here.
  addSaveChatHistorySetting(containerEl, ctx, () => plugin.settings.workspaceFolder || DEFAULT_WORKSPACE_FOLDER);
  addMaxSavedChatHistoriesSetting(containerEl, ctx, DEFAULT_SETTINGS.maxSavedChatHistories);
  addSystemPromptSetting(containerEl, ctx);
  addToolLimitsSection(containerEl, ctx, DEFAULT_SETTINGS);
}
