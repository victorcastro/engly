import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ToolId } from '../adapters/types.js';
import { CONFIG_FILE } from './paths.js';

export const LEVELS = ['auto', 'A2', 'B1', 'B2', 'C1'] as const;
export const STYLES = ['light', 'detailed'] as const;

export type Level = (typeof LEVELS)[number];
export type Style = (typeof STYLES)[number];

export interface EnglyConfig {
  version: string;
  language: string;
  level: Level;
  style: Style;
  reviewEnglish: boolean;
  enabled: boolean;
  tools: ToolId[];
}

export function defaultConfig(version: string): EnglyConfig {
  return {
    version,
    language: 'auto',
    level: 'auto',
    style: 'light',
    reviewEnglish: true,
    enabled: true,
    tools: [],
  };
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function configPath(cwd: string): string {
  return join(cwd, CONFIG_FILE);
}

export async function readConfig(cwd: string, version: string): Promise<EnglyConfig | null> {
  let raw: string;
  try {
    raw = await readFile(configPath(cwd), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigError(`${CONFIG_FILE} is not valid JSON.`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ConfigError(`${CONFIG_FILE} must contain a JSON object.`);
  }

  return validateConfig({ ...defaultConfig(version), ...(parsed as Partial<EnglyConfig>) });
}

export async function writeConfig(cwd: string, config: EnglyConfig): Promise<void> {
  const path = configPath(cwd);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(validateConfig(config), null, 2)}\n`, 'utf8');
}

export function validateConfig(config: EnglyConfig): EnglyConfig {
  if (!(LEVELS as readonly string[]).includes(config.level)) {
    throw new ConfigError(`Invalid level "${config.level}". Use one of: ${LEVELS.join(', ')}.`);
  }
  if (!(STYLES as readonly string[]).includes(config.style)) {
    throw new ConfigError(`Invalid style "${config.style}". Use one of: ${STYLES.join(', ')}.`);
  }
  if (config.language !== 'auto' && !/^[a-z]{2,3}$/.test(config.language)) {
    throw new ConfigError(`Invalid language "${config.language}". Use "auto" or a language code like "es".`);
  }
  if (typeof config.enabled !== 'boolean' || typeof config.reviewEnglish !== 'boolean') {
    throw new ConfigError('"enabled" and "reviewEnglish" must be true or false.');
  }
  if (!Array.isArray(config.tools)) {
    throw new ConfigError('"tools" must be a list.');
  }
  return config;
}
