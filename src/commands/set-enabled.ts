import { join } from 'node:path';
import * as p from '@clack/prompts';
import { upsertBlock } from '../core/block.js';
import { writeConfig } from '../core/config.js';
import { pathExists, writeText } from '../core/fs.js';
import { writeInstructions } from '../core/install.js';
import { INSTRUCTIONS_FILE, packageVersion } from '../core/paths.js';
import { blockContent, candidateFiles, configuredTools, findBlocks, requireConfig } from '../core/project.js';

// Turning the coach on or off only touches the content of the block, so its position stays as it was.
export async function setEnabled(cwd: string, enabled: boolean): Promise<void> {
  const version = packageVersion();
  const word = enabled ? 'enabled' : 'disabled';
  p.intro(`Engly  v${version}`);

  const config = await requireConfig(cwd, version);
  const tools = configuredTools(config);
  const blocks = await findBlocks(cwd, tools);

  if (blocks.length === 0) {
    const files = (await candidateFiles(cwd, tools)).join(' or ');
    p.log.warn(`No Engly block found in ${files}. Run "engly init" to add it.`);
    p.outro('Nothing changed.');
    process.exitCode = 1;
    return;
  }

  const pending = blocks.filter((block) => (block.state === 'active') !== enabled);
  if (pending.length === 0 && config.enabled === enabled) {
    p.outro(`Engly is already ${word}.`);
    return;
  }

  // Not a version bump: only "engly update" changes the version the files were written with.
  for (const block of pending) {
    const { text } = upsertBlock(block.text, blockContent(enabled), { version: config.version });
    await writeText(block.path, text);
  }
  if (enabled && !(await pathExists(join(cwd, INSTRUCTIONS_FILE)))) {
    await writeInstructions(cwd, config);
  }
  config.enabled = enabled;
  await writeConfig(cwd, config);

  const where = pending.length > 0 ? ` in ${pending.map((block) => block.file).join(' and ')}` : '';
  p.log.success(`✓ Engly ${word}${where}`);
  p.outro('Takes effect in your next agent session.');
}
