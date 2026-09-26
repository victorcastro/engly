import { join } from 'node:path';
import * as p from '@clack/prompts';
import { adapters, detectTools, IMPLEMENTED_TOOLS, skillTargets, TOOL_IDS, type ToolId } from '../adapters/index.js';
import { type BlockPosition, hasBlock, type UpsertAction, upsertBlock } from '../core/block.js';
import { defaultConfig, readConfig, STYLES, type Style, writeConfig } from '../core/config.js';
import { readTextIfExists, writeText } from '../core/fs.js';
import { gitStatus } from '../core/git.js';
import { readSkill, renderInstructions, SKILL_NAMES } from '../core/instructions.js';
import { INSTRUCTIONS_FILE, packageVersion } from '../core/paths.js';
import { checkSize, type SizeReport } from '../core/size.js';

export interface InitOptions {
  tools?: string;
  style?: string;
  yes?: boolean;
  apply: boolean;
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

async function runInit(options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const version = packageVersion();
  const interactive = !options.yes;

  if (interactive && !process.stdin.isTTY) {
    throw new Error('No interactive terminal detected. Run "engly init --yes" to use the defaults.');
  }

  p.intro(`Engly  v${version} – your English coach for AI prompts`);

  const config = (await readConfig(cwd, version)) ?? defaultConfig(version);
  config.version = version;

  const tools = await chooseTools(cwd, options);
  if (tools.length === 0) {
    throw new Error(`No supported tool selected. Supported today: ${IMPLEMENTED_TOOLS.join(', ')}.`);
  }

  config.style = await chooseStyle(options, config.style);

  const adapter = adapters.claude;
  const agentFile = await adapter.instructionFile(cwd);
  const agentPath = join(cwd, agentFile);
  if (agentFile === 'AGENTS.md') {
    p.log.info('No CLAUDE.md found. Using AGENTS.md, which Claude Code reads when there is no CLAUDE.md.');
  }

  const current = await readTextIfExists(agentPath);
  // Checked before any prompt or write, so broken markers fail early.
  const blockExists = current !== null && hasBlock(current);

  let apply = options.apply;
  let position: BlockPosition = 'end';
  if (apply && current !== null && !blockExists) {
    const placement = await choosePlacement(agentFile, checkSize(current, adapter.sizeLimit), interactive);
    if (placement === 'skip') apply = false;
    else position = placement;
  }
  const planned = upsertBlock(current ?? '', `@${INSTRUCTIONS_FILE}`, { version, position });

  if (apply && interactive) {
    const choice = guard(
      await p.select({
        message: `Add Engly block to:\n${agentFile}  (${adapter.name})  → ${describePlan(current, planned.action)}`,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'skills', label: 'No, only install skills' },
        ],
      }),
    );
    apply = choice === 'yes';
  }

  if (apply) {
    await warnIfInGit(cwd, agentFile, interactive);
  }

  const done: string[] = [];

  await writeText(join(cwd, INSTRUCTIONS_FILE), await renderInstructions(config));

  if (apply) {
    await writeText(agentPath, planned.text);
    done.push(`✓ ${agentFile} ${current === null ? 'created' : 'updated'}`);
  }

  for (const dir of skillTargets(tools)) {
    for (const skill of SKILL_NAMES) {
      await writeText(join(cwd, dir, skill, 'SKILL.md'), await readSkill(skill));
    }
  }
  done.push(`✓ Skills installed: ${SKILL_NAMES.join(', ')}`);

  config.tools = tools;
  config.enabled = true;
  await writeConfig(cwd, config);

  p.log.success(done.join('\n'));
  p.outro(
    apply
      ? 'Done! Your next prompt will be coached.'
      : `Skills installed. Run "engly init" again to add the Engly block to ${agentFile}.`,
  );
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
  const initial = detected.filter((tool) => IMPLEMENTED_TOOLS.includes(tool));
  const defaults = initial.length > 0 ? initial : [...IMPLEMENTED_TOOLS];

  if (options.yes) return defaults;

  return guard(
    await p.multiselect<ToolId>({
      message: 'Which AI tools do you use?',
      options: TOOL_IDS.map((id) => ({
        value: id,
        label: adapters[id].name,
        hint: IMPLEMENTED_TOOLS.includes(id) ? undefined : 'coming soon',
        disabled: !IMPLEMENTED_TOOLS.includes(id),
      })),
      initialValues: defaults,
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

async function chooseStyle(options: InitOptions, current: Style): Promise<Style> {
  if (options.style) {
    if (!(STYLES as readonly string[]).includes(options.style)) {
      throw new Error(`Invalid style "${options.style}". Use: ${STYLES.join(', ')}.`);
    }
    return options.style as Style;
  }
  if (options.yes) return current;

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
