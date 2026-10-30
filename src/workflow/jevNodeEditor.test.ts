import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "obsidian";
import { NodeEditorModal } from "obsidian-llm-hub-common/modals";
import { t } from "../i18n";

const state = vi.hoisted(() => ({
  settings: [] as any[],
  getOptions: undefined as undefined | ((name?: string) => { jevEnabled: boolean; searchUntilFound: boolean }),
}));
// The modal imports the host module directly, so configure its real singleton.
import { configureWorkflowHost, type WorkflowHost } from "obsidian-llm-hub-common/workflow";

vi.mock("obsidian", async importOriginal => {
  const original = await importOriginal<typeof import("obsidian")>();
  class Control {
    value: unknown;
    disabled = false;
    selectEl = this;
    change = (_value: any) => {};
    setValue(value: unknown) { this.value = value; return this; }
    setDisabled(value: boolean) { this.disabled = value; return this; }
    addOption() { return this; }
    onChange(callback: (value: any) => void) { this.change = callback; return this; }
  }
  return { ...original, Setting: class {
    name = "";
    visible = true;
    control?: Control;
    settingEl = { toggle: (visible: boolean) => { this.visible = visible; } };
    constructor() { state.settings.push(this); }
    setName(name: string) { this.name = name; return this; }
    setDesc() { return this; }
    addDropdown(callback: (control: Control) => void) { this.control = new Control(); callback(this.control); return this; }
    addToggle(callback: (control: Control) => void) { this.control = new Control(); callback(this.control); return this; }
  } };
});

function editor(properties: Record<string, string>) {
  state.settings = [];
  const onSave = vi.fn();
  const modal = new NodeEditorModal(new App(), { id: "answer", type: "command", properties }, onSave);
  const internal = modal as any;
  for (const method of ["addTextField", "addTextArea", "addDropdown", "addLinkField"]) internal[method] = vi.fn();
  let change = () => {};
  internal.renderPropertyFields({ addEventListener: (_name: string, callback: () => void) => { change = callback; } });
  const checkbox = state.settings.find(setting => setting.name === t("search.searchUntilFound"));
  const search = state.settings.find(setting => setting.name === t("nodeEditor.search"));
  return { checkbox, search, change, onSave, save: () => internal.save() };
}

beforeEach(() => {
  state.settings = [];
  state.getOptions = undefined;
  configureWorkflowHost({
    getModelOptions: () => [], getRagSettingNames: () => ["Notes", "PDFs"], getMcpServerNames: () => [],
    getRagSearchOptions: (name?: string) => state.getOptions?.(name),
  } as WorkflowHost);
});

describe("Workflow Jev checkbox", () => {
  it("inherits the index preference and saves an explicit OFF override", async () => {
    state.getOptions = () => ({ jevEnabled: true, searchUntilFound: true });
    const view = editor({ ragSetting: "Notes" });
    expect(view.checkbox.visible).toBe(true);
    expect(view.checkbox.control.value).toBe(true);
    view.checkbox.control.change(false);
    await view.save();
    expect(view.onSave.mock.calls[0][0].properties.ragSearchUntilFound).toBe("false");
    const reopened = editor(view.onSave.mock.calls[0][0].properties);
    expect(reopened.checkbox.control.value).toBe(false);
  });

  it("updates availability when the selected index changes", () => {
    state.getOptions = name => ({ jevEnabled: name === "Notes", searchUntilFound: name === "Notes" });
    const view = editor({ ragSetting: "PDFs" });
    expect(view.checkbox.visible).toBe(false);
    view.search.control.change("Notes");
    view.change();
    expect(view.checkbox.visible).toBe(true);
    expect(view.checkbox.control.value).toBe(true);
    view.search.control.change("__websearch__");
    view.change();
    expect(view.checkbox.visible).toBe(false);
  });

  it("hides the checkbox for hosts without Jev support", () => {
    configureWorkflowHost({ getModelOptions: () => [], getRagSettingNames: () => [], getMcpServerNames: () => [] } as unknown as WorkflowHost);
    expect(editor({}).checkbox).toBeUndefined();
  });
});
