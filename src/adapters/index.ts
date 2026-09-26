import { claude } from './claude.js';
import { codex } from './codex.js';
import { copilot } from './copilot.js';
import { cursor } from './cursor.js';
import { opencode } from './opencode.js';
import type { Adapter, ToolId } from './types.js';

export type { Adapter, Delivery, ToolId } from './types.js';
export { TOOL_IDS } from './types.js';

// Adding a new agent = adding its adapter here (spec §5).
export const adapters: Record<ToolId, Adapter> = { claude, codex, opencode, cursor, copilot };

export const IMPLEMENTED_TOOLS: readonly ToolId[] = ['claude'];

export function skillTargets(tools: readonly ToolId[]): string[] {
  const chosen: string[] = [];
  const byChoices = [...tools].sort((a, b) => adapters[a].skillDirs.length - adapters[b].skillDirs.length);
  for (const tool of byChoices) {
    const dirs = adapters[tool].skillDirs;
    const [preferred] = dirs;
    if (preferred && !dirs.some((dir) => chosen.includes(dir))) chosen.push(preferred);
  }
  return chosen;
}

export async function detectTools(cwd: string): Promise<ToolId[]> {
  const found: ToolId[] = [];
  for (const adapter of Object.values(adapters)) {
    if (await adapter.detect(cwd)) found.push(adapter.id);
  }
  return found;
}
