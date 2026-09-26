import { join } from 'node:path';
import * as p from '@clack/prompts';
import { adapters, type ToolId } from '../adapters/index.js';
import { ConfigError, type EnglyConfig, readConfig } from '../core/config.js';
import { pathExists } from '../core/fs.js';
import { hasInstalledSkills, skillStatus } from '../core/install.js';
import { CONFIG_FILE, INSTRUCTIONS_FILE, packageVersion } from '../core/paths.js';
import { type AgentFile, candidateFiles, configuredTools, inspectAgentFiles } from '../core/project.js';
import { checkSize } from '../core/size.js';

export async function statusCommand(): Promise<void> {
  await runStatus(process.cwd());
}

export async function runStatus(cwd: string): Promise<void> {
  const version = packageVersion();
  p.intro(`Engly  v${version}`);

  let config: EnglyConfig | null = null;
  let configError: string | null = null;
  try {
    config = await readConfig(cwd, version);
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    configError = error.message;
  }

  const tools = configuredTools(config);
  const files = await inspectAgentFiles(cwd, tools);
  const withBlock = files.filter((file) => file.state === 'active' || file.state === 'inactive');
  const broken = files.filter((file) => file.state === 'broken');
  const hasInstructions = await pathExists(join(cwd, INSTRUCTIONS_FILE));
  const skills = config ? await skillStatus(cwd, tools) : [];

  // A plain CLAUDE.md or AGENTS.md is not a sign of Engly; only the block, config, instructions or skills are.
  const installed =
    config !== null ||
    configError !== null ||
    withBlock.length > 0 ||
    broken.length > 0 ||
    hasInstructions ||
    (await hasInstalledSkills(cwd));
  if (!installed) {
    p.outro('Engly is not installed in this project. Run "engly init".');
    return;
  }

  // The block is what the agent reads, so it decides whether the coach is on.
  const active = withBlock.some((file) => file.state === 'active');
  const status = withBlock.length === 0 ? 'off (no Engly block in the agent files)' : active ? 'enabled' : 'disabled';

  const rows: [string, string][] = [['Status', status]];
  if (config) {
    rows.push(
      ['Version', config.version],
      ['Style', config.style],
      ['Level', config.level],
      ['Language', config.language],
      ['Tools', tools.map((tool) => adapters[tool].name).join(', ')],
    );
  }
  rows.push(['Files', fileLines(files, hasInstructions)]);
  if (skills.length > 0) {
    rows.push([
      'Skills',
      skills.map((folder) => `${folder.dir} ${folder.missing.length === 0 ? '✓' : '✗'}`).join('\n'),
    ]);
  }
  p.note(formatRows(rows), 'Engly status');

  const warnings = await collectWarnings({ cwd, version, config, configError, tools, withBlock, broken, skills });
  for (const warning of warnings) p.log.warn(warning);

  p.outro(warnings.length === 0 ? 'All good.' : `${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`);
}

interface WarningInput {
  cwd: string;
  version: string;
  config: EnglyConfig | null;
  configError: string | null;
  tools: ToolId[];
  withBlock: AgentFile[];
  broken: AgentFile[];
  skills: Awaited<ReturnType<typeof skillStatus>>;
}

async function collectWarnings(input: WarningInput): Promise<string[]> {
  const { cwd, version, config, configError, tools, withBlock, broken, skills } = input;
  const warnings: string[] = [];

  if (configError) {
    warnings.push(`${configError} Fix it by hand, or run "engly init" to write a new one.`);
  } else if (!config) {
    warnings.push(`${CONFIG_FILE} is missing. Run "engly init" to write it again.`);
  } else if (config.version !== version) {
    warnings.push(`This project uses Engly v${config.version} and the CLI is v${version}. Run "engly update".`);
  }

  for (const file of broken) warnings.push(`${file.file}: ${file.error}`);

  if (withBlock.length === 0 && broken.length === 0) {
    const names = (await candidateFiles(cwd, tools)).join(' or ');
    warnings.push(`No Engly block found in ${names}, so nothing is coached. Run "engly init" to add it.`);
  }

  const active = withBlock.some((file) => file.state === 'active');
  if (config && withBlock.length > 0 && config.enabled !== active) {
    warnings.push(
      `${CONFIG_FILE} says Engly is ${config.enabled ? 'enabled' : 'disabled'}, but the block is ${active ? 'active' : 'empty'}. ` +
        `Run "engly ${config.enabled ? 'enable' : 'disable'}" to sync them.`,
    );
  }

  if (active && !(await pathExists(join(cwd, INSTRUCTIONS_FILE)))) {
    warnings.push(`${INSTRUCTIONS_FILE} is missing, but the block imports it. Run "engly update".`);
  }

  for (const folder of skills) {
    if (folder.missing.length > 0) {
      warnings.push(`Missing skills in ${folder.dir}: ${folder.missing.join(', ')}. Run "engly update".`);
    }
  }

  for (const file of withBlock) {
    const size = sizeWarning(file, tools);
    if (size) warnings.push(size);
  }

  return warnings;
}

function sizeWarning(file: AgentFile, tools: readonly ToolId[]): string | null {
  for (const tool of tools) {
    const adapter = adapters[tool];
    if (!adapter.instructionFiles?.includes(file.file)) continue;
    const report = checkSize(file.text, adapter.sizeLimit);
    if (report) return `${file.file} is ${report.label}. ${report.warning.replace(/\n/g, ' ')}`;
  }
  return null;
}

function fileLines(files: AgentFile[], hasInstructions: boolean): string {
  const lines = files.map((file) => {
    switch (file.state) {
      case 'active':
        return `${file.file} ✓ (block active)`;
      case 'inactive':
        return `${file.file} ✓ (block empty, coach off)`;
      case 'broken':
        return `${file.file} ✗ (broken markers)`;
      default:
        return `${file.file} – (no Engly block)`;
    }
  });
  lines.push(`${INSTRUCTIONS_FILE} ${hasInstructions ? '✓' : '✗'}`);
  return lines.join('\n');
}

function formatRows(rows: [string, string][]): string {
  const width = Math.max(...rows.map(([label]) => label.length)) + 2;
  return rows
    .map(([label, value]) =>
      value
        .split('\n')
        .map((line, index) => `${index === 0 ? `${label}:`.padEnd(width) : ' '.repeat(width)}${line}`)
        .join('\n'),
    )
    .join('\n');
}
