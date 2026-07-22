import { Notice, Setting } from "obsidian";
import { t } from "src/i18n";
import { SKILLS_FOLDER } from "src/types";
import { isUnsafePath, normalizePathSeparators } from "src/core/pathAccess";
import { invalidateExternalSkillSettings } from "./externalSkillSettings";
import type { SettingsContext } from "./settingsContext";

export function displaySkillsSettings(containerEl: HTMLElement, ctx: SettingsContext): void {
  const { plugin } = ctx;

  new Setting(containerEl).setName(t("settings.skills")).setHeading();

  new Setting(containerEl)
    .setName(t("settings.skillsFolder"))
    .setDesc(t("settings.skillsFolder.desc"))
    .addText(text => {
      text
        .setPlaceholder(SKILLS_FOLDER)
        .setValue(plugin.settings.skillsFolder || SKILLS_FOLDER);
      text.inputEl.addEventListener("blur", () => {
        void (async () => {
          const oldFolder = plugin.settings.skillsFolder || SKILLS_FOLDER;
          const rawPath = text.inputEl.value.trim();
          const normalized = rawPath ? normalizePathSeparators(rawPath) : "";
          if (normalized && isUnsafePath(normalized)) {
            new Notice(t("settings.skillsFolder.invalidPath"));
            text.setValue(oldFolder);
            return;
          }
          const newFolder = normalized || SKILLS_FOLDER;
          text.setValue(newFolder);
          if (newFolder === oldFolder) return;
          plugin.settings.skillsFolder = newFolder;
          await plugin.saveSettings();
          invalidateExternalSkillSettings();
          plugin.settingsEmitter.emit("skills-changed");
          ctx.display();
        })();
      });
    });
}
