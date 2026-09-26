import * as p from '@clack/prompts';
import { upsertBlock } from '../core/block.js';
import { writeConfig } from '../core/config.js';
import { writeText } from '../core/fs.js';
import { installSkills, writeInstructions } from '../core/install.js';
import { packageVersion } from '../core/paths.js';
import { blockContent, candidateFiles, configuredTools, findBlocks, requireConfig } from '../core/project.js';

export async function updateCommand(): Promise<void> {
  await runUpdate(process.cwd());
}

export async function runUpdate(cwd: string): Promise<void> {
  const version = packageVersion();
  p.intro(`Engly  v${version}`);

  const config = await requireConfig(cwd, version);
  const previous = config.version;
  const tools = configuredTools(config);
  // Read before any write, so broken markers stop the update with nothing changed.
  const blocks = await findBlocks(cwd, tools);

  config.version = version;
  await writeInstructions(cwd, config);
  await installSkills(cwd, tools);

  const done = ['✓ .engly/engly.md and skills refreshed'];
  for (const block of blocks) {
    const { text } = upsertBlock(block.text, blockContent(config.enabled), { version });
    if (text === block.text) {
      done.push(`✓ ${block.file} block is up to date`);
      continue;
    }
    await writeText(block.path, text);
    done.push(`✓ ${block.file} block updated`);
  }
  await writeConfig(cwd, config);
  p.log.success(done.join('\n'));

  if (blocks.length === 0) {
    const files = (await candidateFiles(cwd, tools)).join(' or ');
    p.log.warn(`No Engly block found in ${files}. Run "engly init" to add it.`);
  }
  if (!config.enabled) {
    p.log.warn('Engly is disabled. Run "engly enable" to turn it on.');
  }
  p.log.info(
    'This updates the files in this project. To update the engly CLI itself, run: npm install -g engly@latest',
  );

  p.outro(previous === version ? `Already on v${version}.` : `Updated from v${previous} to v${version}.`);
}
