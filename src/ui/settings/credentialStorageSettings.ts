import { Setting, Notice } from "obsidian";
import { t } from "src/i18n";
import { DEFAULT_WORKSPACE_FOLDER, type CredentialStorageMode, type RagSetting } from "src/types";
import {
  ragCredentialSecretId,
  SETTINGS_CREDENTIAL_SECRET_ID,
} from "src/core/credentialBundle";
import { clearSecret, isSecretStorageAvailable } from "src/core/secretStorage";
import { formatError } from "src/utils/error";
import type { LlmHubPlugin } from "src/plugin";
import type { SettingsContext } from "./settingsContext";

function addConfiguredElsewhereHint(setting: Setting): void {
  setting.descEl.createDiv({
    text: t("settings.credentialStorage.configuredElsewhere"),
    cls: "mod-warning",
  });
}

/**
 * Adds a "configured on another device" note under a credential field whose
 * value only exists in another device's SecretStorage.
 */
export function markCredentialConfiguredElsewhere(
  setting: Setting,
  plugin: LlmHubPlugin,
  slot: string,
  currentValue: string | undefined,
): void {
  if (plugin.credentialConfiguredElsewhere(slot, currentValue)) addConfiguredElsewhereHint(setting);
}

/** Same hint for embedding keys, which are tracked per RAG setting. */
export function markRagKeyConfiguredElsewhere(
  setting: Setting,
  plugin: LlmHubPlugin,
  ragSetting: RagSetting,
): void {
  if (!plugin.isSecretCredentialStorage()) return;
  if (ragSetting.embeddingApiKey || !ragSetting.embeddingApiKeyConfigured) return;
  addConfiguredElsewhereHint(setting);
}

export function displayCredentialStorageSettings(containerEl: HTMLElement, ctx: SettingsContext): void {
  const { plugin, display } = ctx;
  const available = isSecretStorageAvailable(plugin.app);
  const mode: CredentialStorageMode = plugin.settings.credentialStorage ?? "plaintext";

  new Setting(containerEl).setName(t("settings.credentialStorage")).setHeading();

  const setting = new Setting(containerEl)
    .setName(t("settings.credentialStorage.mode"))
    .setDesc(mode === "secretStorage"
      ? t("settings.credentialStorage.secretStorage.desc")
      : t("settings.credentialStorage.plaintext.desc"))
    .addDropdown((dropdown) => {
      dropdown
        .addOption("plaintext", t("settings.credentialStorage.plaintext"))
        .addOption("secretStorage", t("settings.credentialStorage.secretStorage"))
        .setValue(mode)
        .setDisabled(!available)
        .onChange((value) => {
          void switchCredentialStorage(plugin, value as CredentialStorageMode, display);
        });
    });

  if (!available) {
    setting.descEl.createDiv({
      text: t("settings.credentialStorage.unavailable"),
      cls: "mod-warning",
    });
  }
}

/**
 * Move credentials between the plugin's files and SecretStorage.
 *
 * Both directions write the new copy before removing the old one, so an
 * interrupted switch leaves the credentials readable rather than lost.
 */
async function switchCredentialStorage(
  plugin: LlmHubPlugin,
  mode: CredentialStorageMode,
  display: () => void,
): Promise<void> {
  if ((plugin.settings.credentialStorage ?? "plaintext") === mode) return;

  try {
    plugin.settings.credentialStorage = mode;
    // Credentials are held in memory, so saving under the new mode writes them
    // to their new home and rewrites the old file without them.
    await plugin.saveSettings();
    await plugin.saveWorkspaceState();

    if (mode === "plaintext") {
      const workspaceFolder = plugin.settings.workspaceFolder || DEFAULT_WORKSPACE_FOLDER;
      clearSecret(plugin.app, SETTINGS_CREDENTIAL_SECRET_ID);
      clearSecret(plugin.app, ragCredentialSecretId(workspaceFolder));
    }

    new Notice(mode === "secretStorage"
      ? t("settings.credentialStorage.movedToSecretStorage")
      : t("settings.credentialStorage.movedToPlaintext"));
  } catch (e) {
    console.error("LLM Hub: Failed to switch credential storage:", formatError(e));
    new Notice(t("settings.credentialStorage.switchFailed", { error: formatError(e) }), 10000);
  }
  display();
}
