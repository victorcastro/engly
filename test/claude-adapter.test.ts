import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { claude } from '../src/adapters/claude.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'engly-claude-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const touch = async (...parts: string[]) => {
  const path = join(root, ...parts);
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, '');
};

describe('claude.instructionFile', () => {
  it('uses CLAUDE.md in an empty project', async () => {
    expect(await claude.instructionFile(root)).toBe('CLAUDE.md');
  });

  it('uses AGENTS.md when there is no CLAUDE.md', async () => {
    await touch('AGENTS.md');
    expect(await claude.instructionFile(root)).toBe('AGENTS.md');
  });

  it('prefers CLAUDE.md when both exist', async () => {
    await touch('AGENTS.md');
    await touch('CLAUDE.md');
    expect(await claude.instructionFile(root)).toBe('CLAUDE.md');
  });

  it.each(['.claude/CLAUDE.md', 'CLAUDE.local.md'])('does not use AGENTS.md when %s exists', async (file) => {
    await touch('AGENTS.md');
    await touch(file);
    expect(await claude.instructionFile(root)).toBe('CLAUDE.md');
  });

  it('does not use AGENTS.md when a directory above has a CLAUDE.md', async () => {
    const project = join(root, 'packages', 'app');
    await touch('CLAUDE.md');
    await touch('packages', 'app', 'AGENTS.md');
    expect(await claude.instructionFile(project)).toBe('CLAUDE.md');
  });

  it('ignores an AGENTS.md that is not in the working directory', async () => {
    await touch('AGENTS.md');
    await mkdir(join(root, 'sub'));
    expect(await claude.instructionFile(join(root, 'sub'))).toBe('CLAUDE.md');
  });
});
