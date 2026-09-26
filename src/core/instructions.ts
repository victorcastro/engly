import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { EnglyConfig } from './config.js';
import { templatesDir } from './paths.js';

export const SKILL_NAMES = ['engly-on', 'engly-off', 'engly-review'] as const;
export type SkillName = (typeof SKILL_NAMES)[number];

export async function renderInstructions(config: EnglyConfig): Promise<string> {
  const template = await readFile(join(templatesDir(), 'engly.md'), 'utf8');

  const values: Record<string, string> = {
    language: config.language === 'auto' ? 'auto' : config.language,
    level: config.level,
    styleRule:
      config.style === 'light'
        ? 'show up to 3 corrections ("wrong" → "right" with a short reason) and the improved prompt.'
        : 'explain every mistake ("wrong" → "right" with a short reason) and show the improved prompt.',
    englishRule: config.reviewEnglish
      ? 'Prompt in correct English: show nothing.'
      : 'Prompt in English: show nothing, even if it has mistakes. Only coach prompts in other languages.',
    lengthRule: config.style === 'light' ? 'Keep the note to 6 lines at most.' : 'Keep the note as short as possible.',
  };

  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
}

export async function readSkill(name: SkillName): Promise<string> {
  return readFile(join(templatesDir(), 'skills', name, 'SKILL.md'), 'utf8');
}
