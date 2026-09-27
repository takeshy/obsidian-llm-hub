import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, type LlmHubSettings } from "src/types";
import type { LlmHubPlugin } from "src/plugin";

const captures = vi.hoisted(() => ({ tools: [] as string[], context: null as unknown }));
vi.mock("src/core/gemini", () => ({
  GeminiClient: class {
    async *chatWithToolsStream(_messages: unknown, tools: Array<{ name: string }>) {
      captures.tools = tools.map(tool => tool.name);
      yield { type: "text", content: "answered" };
      yield { type: "done" };
    }
  },
  getGeminiClient: () => null,
}));
vi.mock("src/vault/toolExecutor", () => ({
  HOST_EXECUTES_RAG_SYNC_STATUS: false,
  createToolExecutor: (_app: unknown, context: unknown) => { captures.context = context; return async () => ({}); },
}));
vi.mock("src/core/skillsLoader", () => ({ discoverSkills: async () => [], loadSkill: vi.fn(), buildSkillSystemPrompt: vi.fn(), collectSkillScripts: () => new Map(), collectSkillWorkflows: () => new Map() }));
import { HeadlessConversationRunner } from "./headlessConversation";

function fixture() {
  const settings: LlmHubSettings = {
    ...DEFAULT_SETTINGS,
    apiProviders: [{ id: "gemini", type: "gemini", name: "Gemini", enabled: true, verified: true, apiKey: "test", enabledModels: ["gemini-test"], baseUrl: "" }],
  };
  return { app: { vault: { adapter: { basePath: "/vault" } } }, settings, getRagSearchSetting: () => null } as unknown as LlmHubPlugin;
}
function conversation() {
  return { messages: [{ role: "user" as const, content: "Hello", timestamp: Date.now() }], lastActivity: Date.now(), model: "api:gemini:gemini-test" as const, ragSetting: null, webSearch: false, activeSkillPaths: [] };
}

describe("external conversation Vault scope", () => {
  it("removes all Vault tools when no folders are granted", async () => {
    const plugin = fixture();
    const answer = await new HeadlessConversationRunner(plugin.app, plugin, { model: "", systemPrompt: "", vaultFolders: [] }, new AbortController().signal).generate(conversation());
    expect(answer.content).toBe("answered");
    expect(captures.tools).toEqual([]);
  });
  it("enforces folder scope and read-only tools", async () => {
    const plugin = fixture();
    await new HeadlessConversationRunner(plugin.app, plugin, { model: "", systemPrompt: "", vaultFolders: ["Research"] }, new AbortController().signal).generate(conversation());
    expect(captures.context).toMatchObject({ limitVaultToolScope: true, vaultToolAllowedFolders: ["Research"] });
    expect(captures.tools).toContain("list_notes");
    expect(captures.tools).not.toContain("propose_edit");
    expect(captures.tools).not.toContain("run_skill_script");
  });
  it("rejects a CLI model when a scoped Vault policy is requested", async () => {
    const plugin = fixture();
    await expect(new HeadlessConversationRunner(plugin.app, plugin, { model: "", systemPrompt: "", vaultFolders: ["Research"] }, new AbortController().signal).generate({ ...conversation(), model: "codex-cli" })).rejects.toThrow("API model");
  });
});
