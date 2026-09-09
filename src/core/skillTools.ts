// The skill tool schemas live in the shared library. This host resolves the
// `[READ_SKILL: name]` marker its CLI and Local-LLM modes emit, so its copies
// offer the model that route to SKILL.md alongside read_note.
import { createSkillScriptTool, createSkillWorkflowTool } from "obsidian-llm-hub-common/skills";

export { SKILL_SCRIPT_TOOL_NAME, SKILL_WORKFLOW_TOOL_NAME } from "obsidian-llm-hub-common/skills";

export const skillWorkflowTool = createSkillWorkflowTool({ readSkillMarker: true });
export const skillScriptTool = createSkillScriptTool({ readSkillMarker: true });
