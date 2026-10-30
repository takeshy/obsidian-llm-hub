import type { RagSetting } from "../types";

/** A workflow node can override the saved preference without changing the index. */
export function workflowRagSearchSetting(setting: RagSetting, properties: Record<string, string>): RagSetting {
  const override = properties["ragSearchUntilFound"];
  return override === undefined ? setting : { ...setting, searchUntilFound: override === "true" };
}
