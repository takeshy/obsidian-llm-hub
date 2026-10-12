// Skill script execution (desktop only) and the marker loop that can run them,
// shared by Chat and the Dashboard Hub Timeline answers.
import { TFile } from "obsidian";
import type { LlmHubPlugin } from "src/plugin";
import { processSkillMarkers, type SkillMarkerResult } from "obsidian-llm-hub-common/workflow";
import { collectSkillScripts, type LoadedSkill, type SkillScriptRef } from "./skillsLoader";
import { getInterpreter, runScript } from "./scriptRunner";

export { MAX_MARKER_AGENT_ITERATIONS } from "obsidian-llm-hub-common/workflow";

/** Run the [READ_SKILL] / [RUN_WORKFLOW] / [RUN_SCRIPT] markers of a CLI or Local-LLM reply. */
export function runSkillMarkers(
	plugin: LlmHubPlugin,
	content: string,
	skills: LoadedSkill[],
	signal?: AbortSignal,
	options?: { vaultToolAllowedFolders?: string[] },
): Promise<SkillMarkerResult> {
	const scripts = collectSkillScripts(skills);
	return processSkillMarkers(plugin.app, content, skills, {
		signal,
		vaultToolAllowedFolders: options?.vaultToolAllowedFolders,
		runScript: (scriptId, argsJson) => executeSkillScript(plugin, scriptId, argsJson, scripts),
	});
}

/**
 * Execute a skill script via child_process.spawn and return results.
 * Desktop only — returns error on mobile.
 */
export async function executeSkillScript(
	plugin: LlmHubPlugin,
	scriptId: string,
	argsJson: string | undefined,
	skillScriptMap: Map<string, {
		skill: LoadedSkill;
		scriptRef: SkillScriptRef;
		vaultPath: string;
	}>,
): Promise<Record<string, unknown>> {
	const entry = skillScriptMap.get(scriptId);
	if (!entry) {
		const available = [...skillScriptMap.keys()].join(", ");
		return { error: `Unknown script ID: ${scriptId}. Available: ${available}` };
	}

	// Restrict execution to files under the skill's scripts/ directory
	if (
		!entry.scriptRef.path.startsWith("scripts/") ||
		entry.scriptRef.path.startsWith("/") ||
		entry.scriptRef.path.includes("\\") ||
		entry.scriptRef.path.split("/").includes("..")
	) {
		return { error: "Skill scripts must be located under the scripts/ directory" };
	}

	// Parse args
	let scriptArgs: string[] = [];
	if (argsJson) {
		try {
			const parsed = JSON.parse(argsJson) as unknown;
			if (Array.isArray(parsed)) {
				scriptArgs = parsed.map(String);
			}
		} catch {
			return { error: `Invalid args JSON: ${argsJson}` };
		}
	}

	// Resolve absolute paths
	const vaultBasePath = (plugin.app.vault.adapter as { basePath?: string }).basePath || ".";
	const absoluteScriptPath = `${vaultBasePath}/${entry.vaultPath}`;
	const skillDir = `${vaultBasePath}/${entry.skill.folderPath}`;
	const scriptFile = plugin.app.vault.getAbstractFileByPath(entry.vaultPath);
	if (!(scriptFile instanceof TFile)) {
		return { error: `Script file not found: ${entry.vaultPath}` };
	}

	// Determine interpreter from file extension
	const interpreter = getInterpreter(absoluteScriptPath);
	let command: string;
	let commandArgs: string[];
	if (interpreter) {
		command = interpreter.command;
		commandArgs = [...interpreter.args, ...scriptArgs];
	} else {
		command = absoluteScriptPath;
		commandArgs = scriptArgs;
	}

	const result = await runScript({
		command,
		args: commandArgs,
		cwd: skillDir,
		env: {
			SKILL_DIR: skillDir,
			VAULT_PATH: vaultBasePath,
		},
	});
	return { ...result };
}
