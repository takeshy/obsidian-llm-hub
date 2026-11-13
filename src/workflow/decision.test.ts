import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import { configureWorkflowHost, workflowHost, WorkflowExecutor, parseWorkflowFromMarkdown } from "obsidian-llm-hub-common/workflow";
import { DEFAULT_SETTINGS, type ApiProviderConfig } from "../types";
import type { LlmHubPlugin } from "../plugin";
import { createNodeFetch } from "../core/proxyFetch";
import { handleDecisionNode } from "./handlers/decision";

vi.mock("obsidian", async original => ({ ...await original<object>(), parseYaml: JSON.parse }));
vi.mock("../core/proxyFetch", () => ({ createNodeFetch: vi.fn(), createProxyFetch: vi.fn() }));
const settings = { ...DEFAULT_SETTINGS, ragDecisionModel: "api:g:gemini-decision-1", apiProviders: [{
  id: "g", name: "Gemini", type: "gemini", apiKey: "key", baseUrl: "", enabled: false, verified: false, enabledModels: [], availableModels: [],
}] as ApiProviderConfig[] };
const plugin = { settings } as LlmHubPlugin;
const request = vi.fn<typeof fetch>();
beforeEach(() => { request.mockReset(); vi.mocked(createNodeFetch).mockReturnValue(request); });
afterEach(() => { vi.restoreAllMocks(); });

describe("decision workflow host", () => {
  it.each([true, false])("interpolates evidence and executes only the chosen branch (%s)", async choice => {
    const previous = workflowHost();
    request.mockResolvedValue(new Response(JSON.stringify({ answers: { decision: { type: "choice", choice: String(choice) } } })));
    configureWorkflowHost({ ...previous, runDecisionNode: request => handleDecisionNode(request, plugin) });
    try {
      const workflow = parseWorkflowFromMarkdown('```hub-workflow\n' + JSON.stringify({ nodes: [
        { id: "judge", type: "decision", prompt: "Is {{topic}} urgent?", input: "{{text}}", saveTo: "answer", trueNext: "yes", falseNext: "no" },
        { id: "yes", type: "variable", name: "route", value: "urgent", next: "end" },
        { id: "no", type: "variable", name: "route", value: "normal", next: "end" },
      ] }) + '\n```');
      const result = await new WorkflowExecutor({} as App).execute(workflow, { variables: new Map([["text", "Please help now"], ["topic", "this request"]]) });
      expect(result.context.variables.get("answer")).toBe(String(choice));
      expect(result.context.variables.get("route")).toBe(choice ? "urgent" : "normal");
      const body = JSON.parse(String(request.mock.calls[0][1]?.body));
      expect(body.questions.decision.instructions).toContain("Is this request urgent?");
      expect(body.input).toEqual([{ type: "text", text: "Please help now" }]);
    } finally { configureWorkflowHost(previous); }
  });
});

describe("typed decision workflow results", () => {
  it.each([
    { decisionType: "score", criteria: ["Low", "Medium", "High"], threshold: "1", answer: { type: "score", score: 1.8 }, expected: 1.8 },
    { decisionType: "choice", criteria: { urgent: "Needs immediate action", normal: "Can wait" }, branches: { urgent: "yes", normal: "no" }, answer: { type: "choice", choice: "urgent" }, expected: "urgent" },
    { decisionType: "noul", answer: { type: "noul", noul: 0.9 }, expected: 0.9 },
  ])("routes and saves a $decisionType result through the plugin adapter", async test => {
    const previous = workflowHost();
    request.mockResolvedValue(new Response(JSON.stringify({ answers: { decision: test.answer } })));
    configureWorkflowHost({ ...previous, runDecisionNode: req => handleDecisionNode(req, plugin) });
    try {
      const flow = { nodes: [
        { id: "judge", type: "decision", prompt: "Evaluate", input: "{{text}}", saveTo: "answer", trueNext: "yes", falseNext: "no", ...test },
        { id: "yes", type: "variable", name: "route", value: "selected", next: "end" },
        { id: "no", type: "variable", name: "route", value: "other", next: "end" },
      ] };
      const result = await new WorkflowExecutor({} as App).execute(parseWorkflowFromMarkdown('```hub-workflow\n' + JSON.stringify(flow) + '\n```'), { variables: new Map([["text", "Please help now"]]) });
      expect(result.context.variables.get("answer")).toBe(test.expected);
      expect(result.context.variables.get("route")).toBe("selected");
    } finally { configureWorkflowHost(previous); }
  });
  it("sends mixed questions in one request and branches on the saved JSON results", async () => {
    const previous = workflowHost();
    request.mockResolvedValue(new Response(JSON.stringify({ answers: {
      refund: { type: "noul", noul: 0.99 }, category: { type: "choice", choice: "refund" }, urgency: { type: "score", score: 1.8 },
    } })));
    configureWorkflowHost({ ...previous, runDecisionNode: req => handleDecisionNode(req, plugin) });
    try {
      const flow = { nodes: [
        { id: "judge", type: "decision", decisionType: "batch", input: "{{text}}", saveTo: "results", questions: {
          refund: { type: "noul", instructions: "Requests a refund" },
          category: { type: "choice", instructions: "Classify", criteria: { refund: "Refund", other: "Other" } },
          urgency: { type: "score", instructions: "Rate urgency", criteria: ["Low", "Medium", "High"] },
        } },
        { id: "check", type: "if", condition: "{{results.urgency}} >= 1.5", trueNext: "yes", falseNext: "end" },
        { id: "yes", type: "variable", name: "category", value: "{{results.category}}", next: "end" },
      ] };
      const result = await new WorkflowExecutor({} as App).execute(parseWorkflowFromMarkdown('```hub-workflow\n' + JSON.stringify(flow) + '\n```'), { variables: new Map([["text", "Refund me now"]]) });
      expect(result.context.variables.get("category")).toBe("refund");
      expect(JSON.parse(String(result.context.variables.get("results")))).toEqual({ refund: 0.99, category: "refund", urgency: 1.8 });
      expect(request).toHaveBeenCalledOnce();
      expect(Object.keys(JSON.parse(String(request.mock.calls[0][1]?.body)).questions)).toEqual(["refund", "category", "urgency"]);
    } finally { configureWorkflowHost(previous); }
  });
});
