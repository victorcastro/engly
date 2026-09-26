import { rm, rmdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { adapters, skillTargets, type ToolId } from '../adapters/index.js';
import type { EnglyConfig } from './config.js';
import { pathExists, writeText } from './fs.js';
import { readSkill, renderInstructions, SKILL_NAMES } from './instructions.js';
import { INSTRUCTIONS_FILE } from './paths.js';

export async function writeInstructions(cwd: string, config: EnglyConfig): Promise<void> {
  await writeText(join(cwd, INSTRUCTIONS_FILE), await renderInstructions(config));
}

export async function installSkills(cwd: string, tools: readonly ToolId[]): Promise<void> {
  for (const dir of skillTargets(tools)) {
    for (const skill of SKILL_NAMES) {
      await writeText(join(cwd, dir, skill, 'SKILL.md'), await readSkill(skill));
    }
  }
}

export interface SkillFolderStatus {
  dir: string;
  missing: string[];
}

export async function skillStatus(cwd: string, tools: readonly ToolId[]): Promise<SkillFolderStatus[]> {
  const folders: SkillFolderStatus[] = [];
  for (const dir of skillTargets(tools)) {
    const missing: string[] = [];
    for (const skill of SKILL_NAMES) {
      if (!(await pathExists(join(cwd, dir, skill, 'SKILL.md')))) missing.push(skill);
    }
    folders.push({ dir, missing });
  }
  return folders;
}

// Looks in every folder any agent uses, so it works even when the config is gone.
// Only the engly-* folders are deleted; the parent folders go only if that leaves them empty.
export async function removeSkills(cwd: string): Promise<string[]> {
  const dirs = new Set(Object.values(adapters).flatMap((adapter) => adapter.skillDirs));
  const removed: string[] = [];

  for (const dir of dirs) {
    let removedHere = false;
    for (const skill of SKILL_NAMES) {
      const path = join(cwd, dir, skill);
      if (!(await pathExists(path))) continue;
      await rm(path, { recursive: true, force: true });
      removed.push(join(dir, skill));
      removedHere = true;
    }
    if (removedHere) await removeEmptyDirs(cwd, dir);
  }

  return removed;
}

export async function hasInstalledSkills(cwd: string): Promise<boolean> {
  const dirs = new Set(Object.values(adapters).flatMap((adapter) => adapter.skillDirs));
  for (const dir of dirs) {
    for (const skill of SKILL_NAMES) {
      if (await pathExists(join(cwd, dir, skill))) return true;
    }
  }
  return false;
}

async function removeEmptyDirs(cwd: string, relativeDir: string): Promise<void> {
  let dir = relativeDir;
  // Up to two levels, e.g. .claude/skills then .claude.
  for (let level = 0; level < 2 && dir !== '.'; level++) {
    try {
      await rmdir(join(cwd, dir));
    } catch {
      return;
    }
    dir = dirname(dir);
  }
}
