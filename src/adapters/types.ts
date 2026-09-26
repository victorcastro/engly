export const TOOL_IDS = ['claude', 'codex', 'opencode', 'cursor', 'copilot'] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export type Delivery = 'import' | 'embedded' | 'own-file';

export interface SizeLimit {
  maxBytes?: number;
  maxLines?: number;
  warning: string;
}

export interface Adapter {
  id: ToolId;
  name: string;
  delivery: Delivery;
  detect(cwd: string): Promise<boolean>;
  instructionFile(cwd: string): string | Promise<string>;
  // Order matters: the first folder is the one Engly installs to (see skillTargets).
  skillDirs: readonly string[];
  sizeLimit?: SizeLimit;
}
