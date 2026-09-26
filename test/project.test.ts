import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config.js';
import {
  blockContent,
  candidateFiles,
  configuredTools,
  findBlocks,
  inspectAgentFile,
  inspectAgentFiles,
} from '../src/core/project.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'engly-project-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const write = async (file: string, text: string) => {
  await mkdir(join(root, file, '..'), { recursive: true });
  await writeFile(join(root, file), text);
};

const ACTIVE = '# Title\n\n<!-- engly:start v1.0.0 -->\n@.engly/engly.md\n<!-- engly:end -->\n';
const EMPTY = '# Title\n\n<!-- engly:start v1.0.0 -->\n<!-- engly:end -->\n';

describe('blockContent', () => {
  it('imports the instructions when enabled and is empty when disabled', () => {
    expect(blockContent(true)).toBe('@.engly/engly.md');
    expect(blockContent(false)).toBe('');
  });
});

describe('inspectAgentFile', () => {
  it('reports a missing file', async () => {
    expect((await inspectAgentFile(root, 'CLAUDE.md')).state).toBe('missing');
  });

  it('reports a file without a block', async () => {
    await write('CLAUDE.md', '# Only user content\n');
    expect((await inspectAgentFile(root, 'CLAUDE.md')).state).toBe('no-block');
  });

  it('reports an active block', async () => {
    await write('CLAUDE.md', ACTIVE);
    expect((await inspectAgentFile(root, 'CLAUDE.md')).state).toBe('active');
  });

  it('reports an empty block as inactive', async () => {
    await write('CLAUDE.md', EMPTY);
    expect((await inspectAgentFile(root, 'CLAUDE.md')).state).toBe('inactive');
  });

  it('reports broken markers with the reason instead of throwing', async () => {
    await write('CLAUDE.md', '<!-- engly:start v1.0.0 -->\nno end marker\n');
    const file = await inspectAgentFile(root, 'CLAUDE.md');
    expect(file.state).toBe('broken');
    expect(file.error).toMatch(/Expected exactly one Engly block/);
  });
});

describe('candidateFiles', () => {
  it('lists every file Claude Code may have used', async () => {
    expect(await candidateFiles(root, ['claude'])).toEqual(['CLAUDE.md', 'AGENTS.md']);
  });

  it('ignores tools that are not implemented yet', async () => {
    expect(await candidateFiles(root, ['codex', 'cursor'])).toEqual([]);
  });
});

describe('inspectAgentFiles and findBlocks', () => {
  it('skips files that do not exist', async () => {
    await write('AGENTS.md', ACTIVE);
    expect((await inspectAgentFiles(root, ['claude'])).map((file) => file.file)).toEqual(['AGENTS.md']);
  });

  it('finds the block in AGENTS.md even when a CLAUDE.md appeared later', async () => {
    await write('AGENTS.md', ACTIVE);
    await write('CLAUDE.md', '# Written after Engly was installed\n');
    const blocks = await findBlocks(root, ['claude']);
    expect(blocks.map((block) => block.file)).toEqual(['AGENTS.md']);
  });

  it('returns every file with a block', async () => {
    await write('CLAUDE.md', ACTIVE);
    await write('AGENTS.md', EMPTY);
    const blocks = await findBlocks(root, ['claude']);
    expect(blocks.map((block) => [block.file, block.state])).toEqual([
      ['CLAUDE.md', 'active'],
      ['AGENTS.md', 'inactive'],
    ]);
  });

  it('returns nothing when no file has a block', async () => {
    await write('CLAUDE.md', '# Only user content\n');
    expect(await findBlocks(root, ['claude'])).toEqual([]);
  });

  it('throws when the markers are broken, naming the file', async () => {
    await write('AGENTS.md', '<!-- engly:end -->\n');
    await expect(findBlocks(root, ['claude'])).rejects.toThrow(/^AGENTS\.md: Expected exactly one Engly block/);
  });
});

describe('configuredTools', () => {
  it('keeps the implemented tools of the config', () => {
    expect(configuredTools({ ...defaultConfig('1.0.0'), tools: ['claude', 'codex'] })).toEqual(['claude']);
  });

  it('falls back to the implemented tools without a config or tools', () => {
    expect(configuredTools(null)).toEqual(['claude']);
    expect(configuredTools({ ...defaultConfig('1.0.0'), tools: ['codex'] })).toEqual(['claude']);
  });
});
