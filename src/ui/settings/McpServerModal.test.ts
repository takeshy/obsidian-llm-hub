import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LlmHubPlugin } from "src/plugin";
import { McpServerModal } from "./McpServerModal";

const state = vi.hoisted(() => ({ controls: [] as { disabled: boolean }[], initialize: vi.fn(), listTools: vi.fn(), close: vi.fn(), config: undefined as unknown }));
vi.mock("obsidian", () => ({
  Modal: class {
    contentEl = { querySelectorAll: () => state.controls, empty: vi.fn() };
    close = vi.fn();
  },
  Setting: class {}, Notice: class {}, Platform: { isMobile: false },
}));
vi.mock("src/core/mcpClient", () => ({ createMcpClient: (config: unknown) => {
  state.config = config;
  return { initialize: state.initialize, listTools: state.listTools, close: state.close };
} }));
vi.mock("./credentialStorageSettings", () => ({ markCredentialConfiguredElsewhere: vi.fn() }));
vi.mock("src/i18n", () => ({ t: (key: string, args?: unknown) => key + (args ? JSON.stringify(args) : "") }));

function status() {
  return { empty: vi.fn(), removeClass: vi.fn(), addClass: vi.fn(), setText: vi.fn(), createDiv: () => ({ setText: vi.fn() }) } as unknown as HTMLElement;
}
function modal(onSubmit = vi.fn(async () => {})) {
  return new McpServerModal({ app: {} } as LlmHubPlugin, {
    name: "test", transport: "stdio", url: "", enabled: true,
    command: '"C:\\Program Files\\node.exe" "C:\\app dir\\server.js"', args: ["--path", "a b"], toolHints: ["old"],
  }, onSubmit);
}
beforeEach(() => {
  vi.clearAllMocks();
  state.controls = [{ disabled: false }, { disabled: true }];
  state.initialize.mockResolvedValue({});
  state.listTools.mockResolvedValue([{ name: "addCard" }]);
  state.close.mockResolvedValue(undefined);
});

describe("MCP connection settings", () => {
  it("locks controls during testing and restores them after normalized connection succeeds", async () => {
    let finish!: () => void;
    state.initialize.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    const instance = modal();
    const button = { disabled: false, textContent: "Test" } as HTMLButtonElement;
    const pending = instance["testConnection"](status(), button);
    expect(state.controls.every(control => control.disabled)).toBe(true);
    expect(button.textContent).toBe("settings.mcpChecking");
    expect(state.config).toMatchObject({ command: "C:\\Program Files\\node.exe", args: ["C:\\app dir\\server.js", "--path", "a b"] });
    finish();
    await pending;
    expect(state.controls.map(control => control.disabled)).toEqual([false, true]);
    expect(instance["connectionTested"]).toBe(true);
    expect(state.close).toHaveBeenCalled();
  });

  it("shows a failed check without closing the modal or allowing save", async () => {
    state.initialize.mockRejectedValue(new Error("spawn ENOENT"));
    const instance = modal();
    const output = status();
    await instance["testConnection"](output, {} as HTMLButtonElement);
    expect(output.setText).toHaveBeenCalledWith(expect.stringContaining("ENOENT"));
    expect(instance["connectionTested"]).toBe(false);
    expect(instance.close).not.toHaveBeenCalled();
    expect(state.close).toHaveBeenCalled();
  });

  it("keeps the form available when saving fails", async () => {
    const onSubmit = vi.fn(async () => { throw new Error("disk full"); });
    const instance = modal(onSubmit);
    const output = status();
    await instance["saveServer"](output);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ command: "C:\\Program Files\\node.exe", args: ["C:\\app dir\\server.js", "--path", "a b"] }));
    expect(output.setText).toHaveBeenCalledWith(expect.stringContaining("disk full"));
    expect(instance.close).not.toHaveBeenCalled();
    expect(state.controls[0].disabled).toBe(false);
  });
});
