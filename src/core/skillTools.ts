// The skill tool schemas live in the shared library. This host resolves the
// `[READ_SKILL: name]` marker its CLI and Local-LLM modes emit, so its copies
// offer the model that route to SKILL.md alongside the dedicated read_skill tool.
import { READ_SKILL_TOOL, createSkillScriptTool, createSkillWorkflowTool } from "obsidian-llm-hub-common/skills";

export { READ_SKILL_TOOL_NAME, SKILL_SCRIPT_TOOL_NAME, SKILL_WORKFLOW_TOOL_NAME, executeReadSkillTool } from "obsidian-llm-hub-common/skills";

export const readSkillTool = READ_SKILL_TOOL;
export const skillWorkflowTool = createSkillWorkflowTool({ readSkillMarker: true });
export const skillScriptTool = createSkillScriptTool({ readSkillMarker: true });
