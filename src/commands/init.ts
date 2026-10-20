import { join } from 'node:path';
import * as p from '@clack/prompts';
import { adapters, detectTools, IMPLEMENTED_TOOLS, TOOL_IDS, type ToolId } from '../adapters/index.js';
import { type BlockPosition, hasBlock, type UpsertAction, upsertBlock } from '../core/block.js';
import { defaultConfig, type EnglyConfig, readConfig, STYLES, type Style, writeConfig } from '../core/config.js';
import { readTextIfExists, writeText } from '../core/fs.js';
import { gitStatus } from '../core/git.js';
import { installSkills, writeInstructions } from '../core/install.js';
import { SKILL_NAMES } from '../core/instructions.js';
import { packageVersion } from '../core/paths.js';
import { blockContent, candidateFiles, deliveryFor } from '../core/project.js';
import { checkSize, type SizeReport } from '../core/size.js';

export interface InitOptions {
  tools?: string;
  style?: string;
  apply: boolean;
}

interface Target {
  file: string;
  path: string;
  tools: ToolId[];
  current: string | null;
  text: string;
  action: UpsertAction;
}

class CancelledError extends Error {}

function guard<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) throw new CancelledError();
  return value as Exclude<T, symbol>;
}

export async function initCommand(options: InitOptions): Promise<void> {
  try {
    await runInit(options);
  } catch (error) {
    if (error instanceof CancelledError) {
      p.cancel('Cancelled. Nothing was changed.');
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

export async function runInit(options: InitOptions, cwd: string = process.cwd()): Promise<void> {
  const version = packageVersion();
  const interactive = Boolean(process.stdin.isTTY);

  if (!interactive && !options.tools) {
    throw new Error(
      'No interactive terminal detected. Pass the agents with --tools, e.g. "engly init --tools claude,codex".',
    );
  }

  p.intro(`Engly  v${version} – your English coach for AI prompts`);

  const config = (await readConfig(cwd, version)) ?? defaultConfig(version);
  config.version = version;
  config.enabled = true;

  const tools = await chooseTools(cwd, options);
  if (tools.length === 0) {
    throw new Error(`No supported tool selected. Supported today: ${IMPLEMENTED_TOOLS.join(', ')}.`);
  }

  config.style = await chooseStyle(options, config.style, interactive);

  const targets: Target[] = [];
  if (options.apply) {
    for (const [file, fileTools] of await groupByFile(cwd, tools)) {
      if (file === 'AGENTS.md' && fileTools.includes('claude')) {
        p.log.info('No CLAUDE.md found. Using AGENTS.md, which Claude Code reads when there is no CLAUDE.md.');
      }
      const target = await planTarget(cwd, file, fileTools, config, interactive);
      if (target) targets.push(target);
    }
  }

  let apply = targets.length > 0;
  if (apply && interactive) {
    const lines = targets.map(
      (target) =>
        `${target.file}  (${target.tools.map((tool) => adapters[tool].name).join(', ')})  → ${describePlan(target.current, target.action)}`,
    );
    const choice = guard(
      await p.select({
        message: `Add Engly block to:\n${lines.join('\n')}`,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'skills', label: 'No, only install skills' },
        ],
      }),
    );
    apply = choice === 'yes';
  }

  if (apply) {
    for (const target of targets) await warnIfInGit(cwd, target.file, interactive);
  }

  const done: string[] = [];

  await writeInstructions(cwd, config);

  if (apply) {
    for (const target of targets) {
      await writeText(target.path, target.text);
      done.push(`✓ ${target.file} ${target.current === null ? 'created' : 'updated'}`);
    }
  }

  await installSkills(cwd, tools);
  done.push(`✓ Skills installed: ${SKILL_NAMES.join(', ')}`);

  config.tools = tools;
  await writeConfig(cwd, config);

  p.log.success(done.join('\n'));
  p.outro(
    apply
      ? 'Done! Your next prompt will be coached.'
      : `Skills installed. Run "engly init" again to add the Engly block to ${(await candidateFiles(cwd, tools)).join(' or ')}.`,
  );
}

async function groupByFile(cwd: string, tools: readonly ToolId[]): Promise<Map<string, ToolId[]>> {
  const groups = new Map<string, ToolId[]>();
  for (const tool of tools) {
    const file = await adapters[tool].instructionFile(cwd);
    groups.set(file, [...(groups.get(file) ?? []), tool]);
  }
  return groups;
}

async function planTarget(
  cwd: string,
  file: string,
  tools: ToolId[],
  config: EnglyConfig,
  interactive: boolean,
): Promise<Target | null> {
  const path = join(cwd, file);
  const current = await readTextIfExists(path);
  // Checked before any prompt or write, so broken markers fail early.
  const blockExists = current !== null && hasBlock(current);

  let position: BlockPosition = 'end';
  if (current !== null && !blockExists) {
    const placement = await choosePlacement(file, sizeReport(current, tools), interactive);
    if (placement === 'skip') return null;
    position = placement;
  }

  const content = await blockContent(config, deliveryFor(file, tools));
  const planned = upsertBlock(current ?? '', content, { version: config.version, position });
  return { file, path, tools, current, text: planned.text, action: planned.action };
}

function sizeReport(text: string, tools: readonly ToolId[]): SizeReport | null {
  for (const tool of tools) {
    const report = checkSize(text, adapters[tool].sizeLimit);
    if (report) return report;
  }
  return null;
}

async function chooseTools(cwd: string, options: InitOptions): Promise<ToolId[]> {
  if (options.tools) {
    const requested = options.tools
      .split(',')
      .map((tool) => tool.trim().toLowerCase())
      .filter(Boolean);
    const unknown = requested.filter((tool) => !(TOOL_IDS as readonly string[]).includes(tool));
    if (unknown.length > 0) {
      throw new Error(`Unknown tool(s): ${unknown.join(', ')}. Use: ${TOOL_IDS.join(', ')}.`);
    }
    return keepImplemented(requested as ToolId[]);
  }

  const detected = await detectTools(cwd);

  return guard(
    await p.multiselect<ToolId>({
      message: 'Which AI tools do you use?',
      options: TOOL_IDS.map((id) => ({
        value: id,
        label: adapters[id].name,
        hint: !IMPLEMENTED_TOOLS.includes(id) ? 'coming soon' : detected.includes(id) ? 'detected' : undefined,
        disabled: !IMPLEMENTED_TOOLS.includes(id),
      })),
      required: true,
    }),
  );
}

function keepImplemented(tools: ToolId[]): ToolId[] {
  const skipped = tools.filter((tool) => !IMPLEMENTED_TOOLS.includes(tool));
  if (skipped.length > 0) {
    p.log.warn(`Not supported yet, skipped: ${skipped.map((tool) => adapters[tool].name).join(', ')}`);
  }
  return tools.filter((tool) => IMPLEMENTED_TOOLS.includes(tool));
}

async function chooseStyle(options: InitOptions, current: Style, interactive: boolean): Promise<Style> {
  if (options.style) {
    if (!(STYLES as readonly string[]).includes(options.style)) {
      throw new Error(`Invalid style "${options.style}". Use: ${STYLES.join(', ')}.`);
    }
    return options.style as Style;
  }
  if (!interactive) return current;

  return guard(
    await p.select<Style>({
      message: 'How detailed should the feedback be?',
      initialValue: current,
      options: [
        { value: 'light', label: 'Light – max 3 corrections' },
        { value: 'detailed', label: 'Detailed – explain every mistake' },
      ],
    }),
  );
}

function describePlan(current: string | null, action: UpsertAction): string {
  if (current === null) return 'new file';
  if (action === 'updated') return 'exists, block updated';
  return action === 'prepended' ? 'exists, block added near the top' : 'exists, block appended';
}

async function choosePlacement(
  file: string,
  size: SizeReport | null,
  interactive: boolean,
): Promise<BlockPosition | 'skip'> {
  if (!size) return 'end';

  const message = `${file} is ${size.label}\n⚠ ${size.warning}`;
  if (!interactive) {
    p.log.warn(`${message}\nThe Engly block goes near the top.`);
    return 'top';
  }

  p.log.warn(message);
  return guard(
    await p.select<BlockPosition | 'skip'>({
      message: 'Where should the block go?',
      options: [
        { value: 'top', label: 'Near the top – recommended' },
        { value: 'end', label: 'At the end' },
        { value: 'skip', label: `Skip ${file}` },
      ],
    }),
  );
}

async function warnIfInGit(cwd: string, file: string, interactive: boolean): Promise<void> {
  const status = gitStatus(cwd, file);
  if (status !== 'tracked' && status !== 'untracked') return;

  const title = status === 'tracked' ? `${file} is tracked by git.` : `${file} is not ignored by git.`;
  const warning = '⚠ Your teammates will also be coached if you commit it.';

  if (!interactive) {
    p.log.warn(`${title}\n${warning}`);
    return;
  }

  const choice = guard(
    await p.select({
      message: `${title}\n${warning}`,
      options: [
        { value: 'continue', label: 'Continue anyway' },
        { value: 'cancel', label: 'Cancel' },
      ],
    }),
  );
  if (choice === 'cancel') throw new CancelledError();
}
