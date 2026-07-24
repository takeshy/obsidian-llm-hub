import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({ Platform: { isMobile: false }, TFile: class TFile {} }));

import { listDashboardModels } from "./dashboardHubCapabilities";

describe("Dashboard Hub AI integration contract", () => {
  it("exposes namespaced models and per-model capabilities", () => {
    const plugin = {
      settings: {
        apiProviders: [{ id: "openai", name: "OpenAI", type: "openai", enabled: true, verified: true, enabledModels: ["gpt-test"] }],
        localLlmConfigs: [],
        cliConfig: { cliVerified: false, claudeCliVerified: false, codexCliVerified: false },
      },
    } as never;
    expect(listDashboardModels(plugin)).toEqual([{
      id: "api:openai:gpt-test",
      name: "OpenAI (gpt-test)",
      capabilities: { text: true, vaultRead: true, tools: true },
    }]);
  });
});
