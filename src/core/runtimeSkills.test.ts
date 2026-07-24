import { beforeEach, describe, expect, it } from "vitest";
import {
  getRuntimeSkillMetadata,
  loadRuntimeSkill,
  registerRuntimeSkill,
  runtimeSkillPath,
  unregisterRuntimeSkill,
} from "./runtimeSkills";

const contribution = {
  protocolVersion: 1 as const,
  ownerId: "dashboard-hub",
  id: "dashboard",
  name: "dashboard",
  description: "Dashboard files",
  instructions: "Create a dashboard.",
  dependencies: ["obsidian-bases"],
  revision: "1.0.0",
};

beforeEach(() => {
  unregisterRuntimeSkill(contribution);
});

describe("runtime skill registry", () => {
  it("registers, loads, and unregisters a contributed skill", () => {
    expect(registerRuntimeSkill(contribution)).toBe(true);
    expect(getRuntimeSkillMetadata()).toHaveLength(1);
    expect(loadRuntimeSkill(runtimeSkillPath("dashboard-hub", "dashboard"))?.dependencies)
      .toEqual(["obsidian-bases"]);
    expect(unregisterRuntimeSkill(contribution)).toBe(true);
    expect(getRuntimeSkillMetadata()).toHaveLength(0);
  });

  it("rejects unsupported protocol versions", () => {
    expect(registerRuntimeSkill({ ...contribution, protocolVersion: 2 })).toBe(false);
  });
});
