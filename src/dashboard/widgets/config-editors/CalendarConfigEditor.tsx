import { t } from "src/i18n";
import type { ConfigEditorProps } from "../../types";

interface CalendarConfig { timelineName?: string; showCreatedFiles?: boolean }

export function CalendarConfigEditor({ config, onChange }: ConfigEditorProps) {
  const value = (config ?? {}) as CalendarConfig;
  return <div className="llm-hub-db-config-form">
    <div className="llm-hub-db-config-field">
      <label>{t("dashboard.timelineName")}</label>
      <input type="text" value={value.timelineName ?? "Timeline"} onChange={(event) => onChange({ ...value, timelineName: event.target.value })} />
      <p className="llm-hub-db-hint">{t("dashboard.calendarTimelineHint")}</p>
    </div>
    <div className="llm-hub-db-config-field llm-hub-db-config-checkbox">
      <label><input type="checkbox" checked={value.showCreatedFiles !== false} onChange={(event) => onChange({ ...value, showCreatedFiles: event.target.checked })} />{t("dashboard.calendarShowCreatedFiles")}</label>
    </div>
  </div>;
}
