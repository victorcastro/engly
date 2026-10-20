import { join } from 'node:path';
import { adapters, type Delivery, IMPLEMENTED_TOOLS, type ToolId } from '../adapters/index.js';
import { BlockError, readBlock } from './block.js';
import { type EnglyConfig, readConfig } from './config.js';
import { readTextIfExists } from './fs.js';
import { renderInstructions } from './instructions.js';
import { INSTRUCTIONS_FILE } from './paths.js';

export type AgentFileState = 'missing' | 'no-block' | 'active' | 'inactive' | 'broken';

export interface AgentFile {
  file: string;
  path: string;
  text: string;
  state: AgentFileState;
  delivery: Delivery;
  error?: string;
}

export async function blockContent(config: EnglyConfig, delivery: Delivery): Promise<string> {
  if (!config.enabled) return '';
  return delivery === 'embedded' ? renderInstructions(config) : `@${INSTRUCTIONS_FILE}`;
}

export function deliveryFor(file: string, tools: readonly ToolId[]): Delivery {
  const embedded = tools.some((tool) => {
    const adapter = adapters[tool];
    return adapter.delivery === 'embedded' && adapter.instructionFiles?.includes(file);
  });
  return embedded ? 'embedded' : 'import';
}

export function isOutdated(file: AgentFile, expected: string): boolean {
  if (file.state !== 'active') return false;
  const normalize = (text: string) => text.replace(/\r\n/g, '\n').trim();
  return normalize(readBlock(file.text) ?? '') !== normalize(expected);
}

export async function inspectAgentFile(cwd: string, file: string, delivery: Delivery = 'import'): Promise<AgentFile> {
  const path = join(cwd, file);
  const text = await readTextIfExists(path);
  if (text === null) return { file, path, text: '', state: 'missing', delivery };

  try {
    const content = readBlock(text);
    if (content === null) return { file, path, text, state: 'no-block', delivery };
    return { file, path, text, state: content.trim() === '' ? 'inactive' : 'active', delivery };
  } catch (error) {
    if (error instanceof BlockError) return { file, path, text, state: 'broken', delivery, error: error.message };
    throw error;
  }
}

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
    const inspected = await inspectAgentFile(cwd, file, deliveryFor(file, tools));
    if (inspected.state !== 'missing') files.push(inspected);
  }
  return files;
}

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

export function configuredTools(config: EnglyConfig | null): ToolId[] {
  const tools = config?.tools.filter((tool) => IMPLEMENTED_TOOLS.includes(tool)) ?? [];
  return tools.length > 0 ? tools : [...IMPLEMENTED_TOOLS];
}
