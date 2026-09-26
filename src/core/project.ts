import { join } from 'node:path';
import { adapters, IMPLEMENTED_TOOLS, type ToolId } from '../adapters/index.js';
import { BlockError, readBlock } from './block.js';
import { type EnglyConfig, readConfig } from './config.js';
import { readTextIfExists } from './fs.js';
import { INSTRUCTIONS_FILE } from './paths.js';

export type AgentFileState = 'missing' | 'no-block' | 'active' | 'inactive' | 'broken';

export interface AgentFile {
  file: string;
  path: string;
  text: string;
  state: AgentFileState;
  // Set when the state is "broken".
  error?: string;
}

// A disabled block keeps its markers and loses its content, so it stays where the user had it.
export function blockContent(enabled: boolean): string {
  return enabled ? `@${INSTRUCTIONS_FILE}` : '';
}

export async function inspectAgentFile(cwd: string, file: string): Promise<AgentFile> {
  const path = join(cwd, file);
  const text = await readTextIfExists(path);
  if (text === null) return { file, path, text: '', state: 'missing' };

  try {
    const content = readBlock(text);
    if (content === null) return { file, path, text, state: 'no-block' };
    return { file, path, text, state: content.trim() === '' ? 'inactive' : 'active' };
  } catch (error) {
    if (error instanceof BlockError) return { file, path, text, state: 'broken', error: error.message };
    throw error;
  }
}

// The block may live in any file `engly init` could have picked: Claude Code's choice between
// CLAUDE.md and AGENTS.md depends on which files exist today, not on when Engly was installed.
export async function candidateFiles(cwd: string, tools: readonly ToolId[]): Promise<string[]> {
  const files = new Set<string>();
  for (const tool of tools) {
    if (!IMPLEMENTED_TOOLS.includes(tool)) continue;
    const adapter = adapters[tool];
    for (const file of adapter.instructionFiles ?? [await adapter.instructionFile(cwd)]) files.add(file);
  }
  return [...files];
}

export async function inspectAgentFiles(cwd: string, tools: readonly ToolId[]): Promise<AgentFile[]> {
  const files: AgentFile[] = [];
  for (const file of await candidateFiles(cwd, tools)) {
    const inspected = await inspectAgentFile(cwd, file);
    if (inspected.state !== 'missing') files.push(inspected);
  }
  return files;
}

// Files that contain an Engly block. Broken markers throw: editing around them could destroy user content.
export async function findBlocks(cwd: string, tools: readonly ToolId[]): Promise<AgentFile[]> {
  const files = await inspectAgentFiles(cwd, tools);
  for (const file of files) {
    if (file.state === 'broken') throw new BlockError(`${file.file}: ${file.error}`);
  }
  return files.filter((file) => file.state === 'active' || file.state === 'inactive');
}

export async function requireConfig(cwd: string, version: string): Promise<EnglyConfig> {
  const config = await readConfig(cwd, version);
  if (!config) throw new Error('Engly is not installed here. Run "engly init" first.');
  return config;
}

// Only tools Engly supports today; a config written by a newer version may list more.
export function configuredTools(config: EnglyConfig | null): ToolId[] {
  const tools = config?.tools.filter((tool) => IMPLEMENTED_TOOLS.includes(tool)) ?? [];
  return tools.length > 0 ? tools : [...IMPLEMENTED_TOOLS];
}
