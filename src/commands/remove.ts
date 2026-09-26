import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import * as p from '@clack/prompts';
import { IMPLEMENTED_TOOLS } from '../adapters/index.js';
import { removeBlock } from '../core/block.js';
import { ConfigError, type EnglyConfig, readConfig } from '../core/config.js';
import { pathExists, writeText } from '../core/fs.js';
import { hasInstalledSkills, removeSkills } from '../core/install.js';
import { SKILL_NAMES } from '../core/instructions.js';
import { ENGLY_DIR, packageVersion } from '../core/paths.js';
import { configuredTools, findBlocks } from '../core/project.js';

export interface RemoveOptions {
  yes?: boolean;
}

export async function removeCommand(options: RemoveOptions): Promise<void> {
  await runRemove(process.cwd(), options);
}

export async function runRemove(cwd: string, options: RemoveOptions): Promise<void> {
  const version = packageVersion();
  p.intro(`Engly  v${version}`);

  // A broken config must not stop the removal: the block and skills are found without it.
  let config: EnglyConfig | null = null;
  try {
    config = await readConfig(cwd, version);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
  }

  const blocks = await findBlocks(cwd, config ? configuredTools(config) : [...IMPLEMENTED_TOOLS]);
  const hasEnglyDir = await pathExists(join(cwd, ENGLY_DIR));
  const hasSkills = await hasInstalledSkills(cwd);

  if (blocks.length === 0 && !hasEnglyDir && !hasSkills) {
    p.outro('Nothing to remove.');
    return;
  }

  const plan = [
    ...blocks.map((block) => `The Engly block in ${block.file}`),
    ...(hasEnglyDir ? [`The ${ENGLY_DIR}/ folder (settings and instructions)`] : []),
    ...(hasSkills ? [`The skills: ${SKILL_NAMES.join(', ')}`] : []),
  ];

  if (!options.yes) {
    if (!process.stdin.isTTY) {
      throw new Error('No interactive terminal detected. Run "engly remove --yes" to remove without asking.');
    }
    const confirmed = await p.confirm({
      message: `Remove Engly from this project?\n${plan.map((line) => `  • ${line}`).join('\n')}`,
    });
    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Cancelled. Nothing was changed.');
      process.exitCode = 1;
      return;
    }
  }

  // The config goes last, so a failed run can be repeated.
  const done: string[] = [];
  for (const block of blocks) {
    await writeText(block.path, removeBlock(block.text).text);
    done.push(`✓ Engly block removed from ${block.file}`);
  }
  if (hasSkills) {
    await removeSkills(cwd);
    done.push(`✓ Skills removed: ${SKILL_NAMES.join(', ')}`);
  }
  if (hasEnglyDir) {
    await rm(join(cwd, ENGLY_DIR), { recursive: true, force: true });
    done.push(`✓ ${ENGLY_DIR}/ removed`);
  }

  p.log.success(done.join('\n'));
  p.outro('Engly removed. Everything outside the Engly block was left untouched.');
}
