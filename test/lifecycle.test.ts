import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runInit } from '../src/commands/init.js';
import { runRemove } from '../src/commands/remove.js';
import { setEnabled } from '../src/commands/set-enabled.js';
import { runStatus } from '../src/commands/status.js';
import { runUpdate } from '../src/commands/update.js';
import { packageVersion } from '../src/core/paths.js';

vi.mock('@clack/prompts');

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'engly-lifecycle-'));
});

afterEach(async () => {
  process.exitCode = undefined;
  await rm(root, { recursive: true, force: true });
});

const read = (file: string) => readFile(join(root, file), 'utf8');
const write = async (file: string, text: string) => {
  await mkdir(join(root, file, '..'), { recursive: true });
  await writeFile(join(root, file), text);
};
const exists = (file: string) =>
  stat(join(root, file)).then(
    () => true,
    () => false,
  );
const install = (options: { apply?: boolean } = {}) => runInit({ yes: true, apply: options.apply ?? true }, root);
const config = async () => JSON.parse(await read('.engly/config.json')) as { enabled: boolean; version: string };

const USER_TEXT = '# My project\n\nUse tabs.\n\n## Tests\n\nRun npm test.\n';

describe('disable and enable', () => {
  it('empties the block on disable and restores it on enable', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();

    await setEnabled(root, false);
    expect(await read('CLAUDE.md')).toBe(
      `${USER_TEXT}\n<!-- engly:start v${packageVersion()} -->\n<!-- engly:end -->\n`,
    );
    expect((await config()).enabled).toBe(false);

    await setEnabled(root, true);
    expect(await read('CLAUDE.md')).toBe(
      `${USER_TEXT}\n<!-- engly:start v${packageVersion()} -->\n@.engly/engly.md\n<!-- engly:end -->\n`,
    );
    expect((await config()).enabled).toBe(true);
  });

  it('keeps the block near the top when disabling and enabling', async () => {
    await write('CLAUDE.md', `${'A line of user content.\n'.repeat(250)}`);
    await install();
    expect((await read('CLAUDE.md')).startsWith('<!-- engly:start')).toBe(true);

    await setEnabled(root, false);
    expect((await read('CLAUDE.md')).startsWith('<!-- engly:start')).toBe(true);
    await setEnabled(root, true);
    expect((await read('CLAUDE.md')).startsWith('<!-- engly:start')).toBe(true);
  });

  it('does not write anything when the state is already the one asked for', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    const before = await read('CLAUDE.md');

    await setEnabled(root, true);
    expect(await read('CLAUDE.md')).toBe(before);
    expect(process.exitCode).toBeUndefined();
  });

  it('does not change the version the files were written with', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await write('CLAUDE.md', (await read('CLAUDE.md')).replace(/engly:start v[^ ]+/, 'engly:start v0.0.1'));
    await write('.engly/config.json', JSON.stringify({ ...(await config()), version: '0.0.1' }));

    await setEnabled(root, false);
    expect(await read('CLAUDE.md')).toContain('<!-- engly:start v0.0.1 -->');
    expect((await config()).version).toBe('0.0.1');
  });

  it('brings back .engly/engly.md on enable when it was deleted', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await setEnabled(root, false);
    await rm(join(root, '.engly/engly.md'));

    await setEnabled(root, true);
    expect(await read('.engly/engly.md')).toContain('Engly – English coach');
  });

  it('syncs the config when only the config disagrees with the block', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await write('.engly/config.json', JSON.stringify({ ...(await config()), enabled: false }));

    await setEnabled(root, true);
    expect((await config()).enabled).toBe(true);
    expect(await read('CLAUDE.md')).toContain('@.engly/engly.md');
  });

  it('asks for "engly init" and changes nothing when there is no block', async () => {
    await install({ apply: false });
    expect(await exists('CLAUDE.md')).toBe(false);

    await setEnabled(root, true);
    await setEnabled(root, false);
    expect(await exists('CLAUDE.md')).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('needs an installed project', async () => {
    await expect(setEnabled(root, true)).rejects.toThrow('Engly is not installed here. Run "engly init" first.');
  });

  it('finds the block in AGENTS.md when a CLAUDE.md appeared after the install', async () => {
    await write('AGENTS.md', USER_TEXT);
    await install();
    await write('CLAUDE.md', '# Written later\n');

    await setEnabled(root, false);
    expect(await read('AGENTS.md')).toContain('<!-- engly:start');
    expect(await read('AGENTS.md')).not.toContain('@.engly/engly.md');
    expect(await read('CLAUDE.md')).toBe('# Written later\n');
  });
});

describe('update', () => {
  it('refreshes the version, the instructions and the skills', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await write('CLAUDE.md', (await read('CLAUDE.md')).replace(/engly:start v[^ ]+/, 'engly:start v0.0.1'));
    await write('.engly/config.json', JSON.stringify({ ...(await config()), version: '0.0.1' }));
    await write('.engly/engly.md', 'stale');
    await rm(join(root, '.claude/skills/engly-off'), { recursive: true });

    await runUpdate(root);

    expect(await read('CLAUDE.md')).toBe(
      `${USER_TEXT}\n<!-- engly:start v${packageVersion()} -->\n@.engly/engly.md\n<!-- engly:end -->\n`,
    );
    expect((await config()).version).toBe(packageVersion());
    expect(await read('.engly/engly.md')).toContain('Engly – English coach');
    expect(await exists('.claude/skills/engly-off/SKILL.md')).toBe(true);
  });

  it('uses the style from the config when it regenerates the instructions', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await write('.engly/config.json', JSON.stringify({ ...(await config()), style: 'detailed' }));

    await runUpdate(root);
    expect(await read('.engly/engly.md')).toContain('explain every mistake');
  });

  it('keeps a disabled block empty', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await setEnabled(root, false);

    await runUpdate(root);
    expect(await read('CLAUDE.md')).toBe(
      `${USER_TEXT}\n<!-- engly:start v${packageVersion()} -->\n<!-- engly:end -->\n`,
    );
  });

  it('does not add a block when there is none', async () => {
    await install({ apply: false });
    await runUpdate(root);
    expect(await exists('CLAUDE.md')).toBe(false);
    expect(await exists('AGENTS.md')).toBe(false);
    expect(await exists('.engly/engly.md')).toBe(true);
  });

  it('keeps the CRLF line endings', async () => {
    await write('CLAUDE.md', USER_TEXT.replace(/\n/g, '\r\n'));
    await install();
    await write('CLAUDE.md', (await read('CLAUDE.md')).replace(/engly:start v[^ ]+/, 'engly:start v0.0.1'));

    await runUpdate(root);
    const text = await read('CLAUDE.md');
    expect(text).toContain(`<!-- engly:start v${packageVersion()} -->\r\n@.engly/engly.md\r\n<!-- engly:end -->`);
    expect(text.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('needs an installed project', async () => {
    await expect(runUpdate(root)).rejects.toThrow('Engly is not installed here. Run "engly init" first.');
  });

  it('changes nothing when the markers are broken', async () => {
    await write('CLAUDE.md', '<!-- engly:start v1.0.0 -->\nno end marker\n');
    await write('.engly/config.json', JSON.stringify({ version: '1.0.0' }));

    await expect(runUpdate(root)).rejects.toThrow(/^CLAUDE\.md: Expected exactly one Engly block/);
    expect(await read('CLAUDE.md')).toBe('<!-- engly:start v1.0.0 -->\nno end marker\n');
    expect(await exists('.engly/engly.md')).toBe(false);
  });
});

describe('remove', () => {
  it.each([
    ['LF', '\n'],
    ['CRLF', '\r\n'],
  ])('leaves the agent file exactly as it was (%s)', async (_name, eol) => {
    const original = USER_TEXT.replace(/\n/g, eol);
    await write('CLAUDE.md', original);
    await install();

    await runRemove(root, { yes: true });

    expect(await read('CLAUDE.md')).toBe(original);
    expect(await exists('.engly')).toBe(false);
    expect(await exists('.claude')).toBe(false);
  });

  it('removes a disabled block too', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await setEnabled(root, false);

    await runRemove(root, { yes: true });
    expect(await read('CLAUDE.md')).toBe(USER_TEXT);
  });

  it('leaves an empty file when the block was all it had', async () => {
    await install();
    expect(await exists('CLAUDE.md')).toBe(true);

    await runRemove(root, { yes: true });
    expect(await read('CLAUDE.md')).toBe('');
    expect(await exists('.engly')).toBe(false);
  });

  it('keeps other skills and settings of the agent', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await write('.claude/skills/mine/SKILL.md', 'mine');
    await write('.claude/settings.json', '{}');

    await runRemove(root, { yes: true });
    expect(await read('.claude/skills/mine/SKILL.md')).toBe('mine');
    expect(await exists('.claude/settings.json')).toBe(true);
    expect(await exists('.claude/skills/engly-on')).toBe(false);
  });

  it('removes the block from AGENTS.md when a CLAUDE.md appeared after the install', async () => {
    await write('AGENTS.md', USER_TEXT);
    await install();
    await write('CLAUDE.md', '# Written later\n');

    await runRemove(root, { yes: true });
    expect(await read('AGENTS.md')).toBe(USER_TEXT);
    expect(await read('CLAUDE.md')).toBe('# Written later\n');
  });

  it('still removes everything when the config is invalid', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await write('.engly/config.json', '{ not json');

    await runRemove(root, { yes: true });
    expect(await read('CLAUDE.md')).toBe(USER_TEXT);
    expect(await exists('.engly')).toBe(false);
  });

  it('removes what is left when only the skills remain', async () => {
    await install({ apply: false });
    await rm(join(root, '.engly'), { recursive: true });

    await runRemove(root, { yes: true });
    expect(await exists('.claude')).toBe(false);
  });

  it('does nothing in a project without Engly', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await runRemove(root, { yes: true });
    expect(await read('CLAUDE.md')).toBe(USER_TEXT);
  });

  it('can be repeated', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await runRemove(root, { yes: true });
    await runRemove(root, { yes: true });
    expect(await read('CLAUDE.md')).toBe(USER_TEXT);
  });

  it('asks for --yes when there is no terminal', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    try {
      await expect(runRemove(root, {})).rejects.toThrow('Run "engly remove --yes"');
    } finally {
      if (descriptor) Object.defineProperty(process.stdin, 'isTTY', descriptor);
      else Reflect.deleteProperty(process.stdin, 'isTTY');
    }
    expect(await read('CLAUDE.md')).toContain('<!-- engly:start');
  });

  it('changes nothing when the markers are broken', async () => {
    await write('CLAUDE.md', '<!-- engly:end -->\n');
    await expect(runRemove(root, { yes: true })).rejects.toThrow(/Expected exactly one Engly block/);
    expect(await read('CLAUDE.md')).toBe('<!-- engly:end -->\n');
  });
});

describe('status', () => {
  const lines = async () => {
    const p = await import('@clack/prompts');
    return {
      warnings: vi.mocked(p.log.warn).mock.calls.map(([message]) => String(message)),
      note: vi
        .mocked(p.note)
        .mock.calls.map(([message]) => String(message))
        .join('\n'),
      outro: vi
        .mocked(p.outro)
        .mock.calls.map(([message]) => String(message))
        .join('\n'),
    };
  };

  beforeEach(async () => {
    const p = await import('@clack/prompts');
    vi.mocked(p.log.warn).mockClear();
    vi.mocked(p.note).mockClear();
    vi.mocked(p.outro).mockClear();
  });

  it('says so when Engly is not installed, even with an agent file', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await runStatus(root);
    expect((await lines()).outro).toContain('not installed');
  });

  it('shows an enabled project without warnings', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await runStatus(root);
    const { note, warnings } = await lines();
    expect(note).toContain('Status:   enabled');
    expect(note).toContain('CLAUDE.md ✓ (block active)');
    expect(warnings).toEqual([]);
  });

  it('shows a disabled project', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await setEnabled(root, false);
    await runStatus(root);
    expect((await lines()).note).toContain('Status:   disabled');
  });

  it('warns when the project files are older than the CLI', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await write('.engly/config.json', JSON.stringify({ ...(await config()), version: '0.0.1' }));
    await runStatus(root);
    expect((await lines()).warnings.join('\n')).toContain('Run "engly update"');
  });

  it('warns when the agent file is too long', async () => {
    await write('CLAUDE.md', `${'A line of user content.\n'.repeat(250)}`);
    await install();
    await runStatus(root);
    expect((await lines()).warnings.join('\n')).toMatch(/CLAUDE\.md is 25\d lines/);
  });

  it('warns when the block has no instructions or skills behind it', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await rm(join(root, '.engly/engly.md'));
    await rm(join(root, '.claude/skills/engly-review'), { recursive: true });
    await runStatus(root);
    const text = (await lines()).warnings.join('\n');
    expect(text).toContain('.engly/engly.md is missing');
    expect(text).toContain('Missing skills in .claude/skills: engly-review');
  });

  it('warns when the config and the block disagree', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await write('.engly/config.json', JSON.stringify({ ...(await config()), enabled: false }));
    await runStatus(root);
    expect((await lines()).warnings.join('\n')).toContain('Run "engly disable" to sync them');
  });

  it('warns when there is no block', async () => {
    await install({ apply: false });
    await runStatus(root);
    const { note, warnings } = await lines();
    expect(note).toContain('off (no Engly block');
    expect(warnings.join('\n')).toContain('Run "engly init" to add it');
  });

  it('reports broken markers and an invalid config instead of failing', async () => {
    await write('CLAUDE.md', '<!-- engly:start v1.0.0 -->\n');
    await write('.engly/config.json', '{ not json');
    await runStatus(root);
    const { warnings, note } = await lines();
    expect(warnings.join('\n')).toContain('is not valid JSON');
    expect(warnings.join('\n')).toContain('CLAUDE.md: Expected exactly one Engly block');
    expect(note).toContain('CLAUDE.md ✗ (broken markers)');
  });

  it('reports a missing config when the block is still there', async () => {
    await write('CLAUDE.md', USER_TEXT);
    await install();
    await rm(join(root, '.engly/config.json'));
    await runStatus(root);
    expect((await lines()).warnings.join('\n')).toContain('.engly/config.json is missing');
  });
});
