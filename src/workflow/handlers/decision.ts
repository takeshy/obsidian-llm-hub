import { isBatchDecision, getDecisionNodeQuestions, getDecisionNodeDefinition, replaceVariables, type NodeRequest } from "obsidian-llm-hub-common/workflow";
import type { DecisionResult } from "obsidian-llm-hub-common/core";
import { evaluateDecision } from "src/core/decisionClient";
import type { LlmHubPlugin } from "src/plugin";

export function handleDecisionNode(
  { node, context, abortSignal }: NodeRequest,
  plugin: LlmHubPlugin,
): Promise<DecisionResult> {
  return evaluateDecision(
    replaceVariables(node.properties.prompt || "", context),
    replaceVariables(node.properties.input || "", context),
    plugin.settings,
    { model: replaceVariables(node.properties.model || "", context), signal: abortSignal,
      definition: isBatchDecision(node) ? undefined : getDecisionNodeDefinition(node, context),
      questions: isBatchDecision(node) ? getDecisionNodeQuestions(node, context) : undefined },
  );
}
