import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hasInstalledSkills, installSkills, removeSkills, skillStatus } from '../src/core/install.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'engly-install-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const exists = (...parts: string[]) =>
  stat(join(root, ...parts)).then(
    () => true,
    () => false,
  );

const writeFileIn = async (file: string, text = '') => {
  await mkdir(join(root, file, '..'), { recursive: true });
  await writeFile(join(root, file), text);
};

describe('installSkills', () => {
  it('writes the three skills in the folder of the tool', async () => {
    await installSkills(root, ['claude']);
    for (const skill of ['engly-on', 'engly-off', 'engly-review']) {
      expect(await readFile(join(root, '.claude/skills', skill, 'SKILL.md'), 'utf8')).toContain(`name: ${skill}`);
    }
  });
});

describe('skillStatus', () => {
  it('lists the skills that are missing in each folder', async () => {
    await installSkills(root, ['claude']);
    await rm(join(root, '.claude/skills/engly-off'), { recursive: true });
    expect(await skillStatus(root, ['claude'])).toEqual([{ dir: '.claude/skills', missing: ['engly-off'] }]);
  });

  it('reports every skill as missing in an empty project', async () => {
    expect(await skillStatus(root, ['claude'])).toEqual([
      { dir: '.claude/skills', missing: ['engly-on', 'engly-off', 'engly-review'] },
    ]);
  });
});

describe('removeSkills', () => {
  it('removes the skills and the folders that end up empty', async () => {
    await installSkills(root, ['claude']);
    const removed = await removeSkills(root);
    expect(removed.sort()).toEqual([
      '.claude/skills/engly-off',
      '.claude/skills/engly-on',
      '.claude/skills/engly-review',
    ]);
    expect(await exists('.claude')).toBe(false);
  });

  it('keeps skills and folders that are not Engly’s', async () => {
    await installSkills(root, ['claude']);
    await writeFileIn('.claude/skills/mine/SKILL.md', 'mine');
    await writeFileIn('.claude/settings.json', '{}');
    await removeSkills(root);
    expect(await readFile(join(root, '.claude/skills/mine/SKILL.md'), 'utf8')).toBe('mine');
    expect(await exists('.claude/skills/engly-on')).toBe(false);
    expect(await exists('.claude/settings.json')).toBe(true);
  });

  it('removes the skills of every folder an agent may use', async () => {
    await writeFileIn('.agents/skills/engly-on/SKILL.md');
    await writeFileIn('.github/skills/engly-review/SKILL.md');
    await writeFileIn('.github/workflows/ci.yml');
    await removeSkills(root);
    expect(await exists('.agents')).toBe(false);
    expect(await exists('.github/skills')).toBe(false);
    expect(await exists('.github/workflows/ci.yml')).toBe(true);
  });

  it('leaves an empty skills folder alone when there was nothing to remove', async () => {
    await mkdir(join(root, '.claude/skills'), { recursive: true });
    expect(await removeSkills(root)).toEqual([]);
    expect(await exists('.claude/skills')).toBe(true);
  });
});

describe('hasInstalledSkills', () => {
  it('is true only while an Engly skill exists', async () => {
    expect(await hasInstalledSkills(root)).toBe(false);
    await installSkills(root, ['claude']);
    expect(await hasInstalledSkills(root)).toBe(true);
    await removeSkills(root);
    expect(await hasInstalledSkills(root)).toBe(false);
  });
});
