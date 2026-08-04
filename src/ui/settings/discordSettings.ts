import { Setting, Notice } from "obsidian";
import { t } from "src/i18n";
import { DEFAULT_DISCORD_SETTINGS } from "src/types";
import { getDiscordService, initDiscordService, resetDiscordService } from "src/core/discordService";
import { formatError } from "src/utils/error";
import { credentialSlot } from "src/core/credentialBundle";
import { markCredentialConfiguredElsewhere } from "./credentialStorageSettings";
import type { SettingsContext } from "./settingsContext";

export function displayDiscordSettings(containerEl: HTMLElement, ctx: SettingsContext): void {
  const { plugin } = ctx;
  const discord = plugin.settings.discord ?? { ...DEFAULT_DISCORD_SETTINGS };

  new Setting(containerEl).setName(t("settings.discord")).setHeading();

  // Enabled toggle
  new Setting(containerEl)
    .setName(t("settings.discordEnabled"))
    .setDesc(t("settings.discordEnabled.desc"))
    .addToggle((toggle) =>
      toggle.setValue(discord.enabled).onChange((value) => {
        void (async () => {
          plugin.settings.discord = { ...plugin.settings.discord, enabled: value };
          await plugin.saveSettings();

          if (value && plugin.settings.discord.botToken) {
            try {
              const service = initDiscordService(plugin.app, plugin);
              service.start();
            } catch (e) {
              new Notice(t("settings.discordStartFailed", { error: formatError(e) }));
            }
          } else if (!value) {
            resetDiscordService();
          }
          ctx.display();
        })();
      })
    );

  // Bot token
  const tokenSetting = new Setting(containerEl)
    .setName(t("settings.discordBotToken"))
    .setDesc(t("settings.discordBotToken.desc"));

  markCredentialConfiguredElsewhere(tokenSetting, plugin, credentialSlot.discord, discord.botToken);

  let tokenInput: HTMLInputElement;
  tokenSetting.addText((text) => {
    tokenInput = text.inputEl;
    text.inputEl.type = "password";
    text
      .setPlaceholder(t("settings.discordBotToken.placeholder"))
      .setValue(discord.botToken)
      .onChange((value) => {
        void (async () => {
          plugin.settings.discord = { ...plugin.settings.discord, botToken: value };
          await plugin.saveSettings();
          detailContainer.style.display = value.trim() ? "" : "none";
        })();
      });
  });

  tokenSetting.addExtraButton((button) =>
    button
      .setIcon("eye")
      .setTooltip(t("settings.showOrHideApiKey"))
      .onClick(() => {
        if (tokenInput) {
          tokenInput.type = tokenInput.type === "password" ? "text" : "password";
        }
      })
  );

  // Detail settings — only shown when token is set
  const detailContainer = containerEl.createDiv();
  detailContainer.style.display = discord.botToken ? "" : "none";

  // Verify & Connect button
  const statusSetting = new Setting(detailContainer)
    .setName(t("settings.discordConnection"))
    .setDesc(t("settings.discordConnection.desc"));

  const service = getDiscordService();
  const isRunning = service?.connected ?? false;
  const statusText = isRunning
    ? t("settings.discordStatusConnected")
    : t("settings.discordStatusDisconnected");

  statusSetting.addButton((button) =>
    button
      .setButtonText(isRunning ? t("settings.discordDisconnect") : t("settings.discordConnect"))
      .onClick(() => {
        void (async () => {
          if (isRunning) {
            resetDiscordService();
            plugin.settings.discord = { ...plugin.settings.discord, enabled: false };
            await plugin.saveSettings();
            new Notice(t("settings.discordDisconnected"));
          } else {
            // Verify first
            button.setButtonText(t("settings.discordVerifying"));
            button.setDisabled(true);
            try {
              const svc = initDiscordService(plugin.app, plugin);
              const result = await svc.verifyToken(plugin.settings.discord.botToken);
              if (!result.success) {
                new Notice(t("settings.discordVerifyFailed", { error: result.error || "Unknown" }));
                ctx.display();
                return;
              }
              plugin.settings.discord = { ...plugin.settings.discord, enabled: true };
              await plugin.saveSettings();
              svc.start();
            } catch (e) {
              new Notice(t("settings.discordStartFailed", { error: formatError(e) }));
            } finally {
              button.setDisabled(false);
            }
          }
          ctx.display();
        })();
      })
  );

  statusSetting.descEl.setText(statusText);

  // Respond to DMs
  new Setting(detailContainer)
    .setName(t("settings.discordRespondToDMs"))
    .setDesc(t("settings.discordRespondToDMs.desc"))
    .addToggle((toggle) =>
      toggle.setValue(discord.respondToDMs).onChange((value) => {
        void (async () => {
          plugin.settings.discord = { ...plugin.settings.discord, respondToDMs: value };
          await plugin.saveSettings();
        })();
      })
    );

  // Require mention
  new Setting(detailContainer)
    .setName(t("settings.discordRequireMention"))
    .setDesc(t("settings.discordRequireMention.desc"))
    .addToggle((toggle) =>
      toggle.setValue(discord.requireMention).onChange((value) => {
        void (async () => {
          plugin.settings.discord = { ...plugin.settings.discord, requireMention: value };
          await plugin.saveSettings();
        })();
      })
    );

  // Allowed channels
  new Setting(detailContainer)
    .setName(t("settings.discordAllowedChannels"))
    .setDesc(t("settings.discordAllowedChannels.desc"))
    .addText((text) =>
      text
        .setPlaceholder(t("settings.discordAllowedChannels.placeholder"))
        .setValue(discord.allowedChannelIds)
        .onChange((value) => {
          void (async () => {
            plugin.settings.discord = { ...plugin.settings.discord, allowedChannelIds: value };
            await plugin.saveSettings();
          })();
        })
    );

  // Allowed users
  new Setting(detailContainer)
    .setName(t("settings.discordAllowedUsers"))
    .setDesc(t("settings.discordAllowedUsers.desc"))
    .addText((text) =>
      text
        .setPlaceholder(t("settings.discordAllowedUsers.placeholder"))
        .setValue(discord.allowedUserIds)
        .onChange((value) => {
          void (async () => {
            plugin.settings.discord = { ...plugin.settings.discord, allowedUserIds: value };
            await plugin.saveSettings();
          })();
        })
    );

  // Model override
  new Setting(detailContainer)
    .setName(t("settings.discordModel"))
    .setDesc(t("settings.discordModel.desc"))
    .addText((text) =>
      text
        .setPlaceholder(t("settings.discordModel.placeholder"))
        .setValue(discord.model)
        .onChange((value) => {
          void (async () => {
            plugin.settings.discord = { ...plugin.settings.discord, model: value };
            await plugin.saveSettings();
          })();
        })
    );

  // System prompt override
  new Setting(detailContainer)
    .setName(t("settings.discordSystemPrompt"))
    .setDesc(t("settings.discordSystemPrompt.desc"))
    .addTextArea((text) => {
      text.inputEl.rows = 4;
      text.inputEl.addClass("llm-hub-discord-system-prompt");
      text
        .setPlaceholder(t("settings.discordSystemPrompt.placeholder"))
        .setValue(discord.systemPrompt)
        .onChange((value) => {
          void (async () => {
            plugin.settings.discord = { ...plugin.settings.discord, systemPrompt: value };
            await plugin.saveSettings();
          })();
        });
    });

  // Max response length
  new Setting(detailContainer)
    .setName(t("settings.discordMaxResponseLength"))
    .setDesc(t("settings.discordMaxResponseLength.desc"))
    .addText((text) =>
      text
        .setPlaceholder("2000")
        .setValue(String(discord.maxResponseLength || 2000))
        .onChange((value) => {
          void (async () => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num > 0 && num <= 2000) {
              plugin.settings.discord = { ...plugin.settings.discord, maxResponseLength: num };
              await plugin.saveSettings();
            }
          })();
        })
    );
}
