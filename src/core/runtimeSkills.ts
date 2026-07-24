import type { LoadedSkill, SkillMetadata } from "./skillsLoader";

export const RUNTIME_SKILL_PREFIX = "runtime-skill:";
export const REGISTER_RUNTIME_SKILL_EVENT = "ai-skill-registry:register";
export const UNREGISTER_RUNTIME_SKILL_EVENT = "ai-skill-registry:unregister";
export const REQUEST_RUNTIME_SKILLS_EVENT = "ai-skill-registry:request";

export interface AgentSkillContribution {
  protocolVersion: 1;
  ownerId: string;
  id: string;
  name: string;
  description: string;
  instructions: string;
  references?: string[];
  dependencies?: string[];
  revision: string;
}

const contributions = new Map<string, AgentSkillContribution>();

function key(ownerId: string, id: string): string {
  return `${ownerId}/${id}`;
}

export function runtimeSkillPath(ownerId: string, id: string): string {
  return `${RUNTIME_SKILL_PREFIX}${key(ownerId, id)}`;
}

export function isRuntimeSkillPath(path: string): boolean {
  return path.startsWith(RUNTIME_SKILL_PREFIX);
}

export function registerRuntimeSkill(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const skill = value as Partial<AgentSkillContribution>;
  if (skill.protocolVersion !== 1 || !skill.ownerId || !skill.id || !skill.name
    || typeof skill.description !== "string" || !skill.instructions || !skill.revision) return false;
  const skillKey = key(skill.ownerId, skill.id);
  const previous = contributions.get(skillKey);
  contributions.set(skillKey, skill as AgentSkillContribution);
  return previous?.revision !== skill.revision;
}

export function unregisterRuntimeSkill(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const target = value as { ownerId?: string; id?: string };
  if (!target.ownerId || !target.id) return false;
  return contributions.delete(key(target.ownerId, target.id));
}

export function getRuntimeSkillMetadata(): SkillMetadata[] {
  return [...contributions.values()].map((skill) => ({
    name: skill.name,
    description: skill.description,
    folderPath: runtimeSkillPath(skill.ownerId, skill.id),
    skillFilePath: `${runtimeSkillPath(skill.ownerId, skill.id)}/SKILL.md`,
    workflows: [],
    scripts: [],
  }));
}

export function loadRuntimeSkill(path: string): (LoadedSkill & { dependencies: string[] }) | null {
  if (!isRuntimeSkillPath(path)) return null;
  const skill = contributions.get(path.slice(RUNTIME_SKILL_PREFIX.length));
  if (!skill) return null;
  return {
    name: skill.name,
    description: skill.description,
    folderPath: path,
    skillFilePath: `${path}/SKILL.md`,
    workflows: [],
    scripts: [],
    instructions: skill.instructions,
    references: skill.references ?? [],
    dependencies: skill.dependencies ?? [],
  };
}
