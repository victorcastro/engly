import { describe, expect, it } from 'vitest';
import { skillTargets } from '../src/adapters/index.js';

describe('skillTargets', () => {
  it('uses .claude/skills for Claude Code alone', () => {
    expect(skillTargets(['claude'])).toEqual(['.claude/skills']);
  });

  it('uses .agents/skills when Claude Code is not selected', () => {
    expect(skillTargets(['codex'])).toEqual(['.agents/skills']);
    expect(skillTargets(['opencode', 'cursor', 'copilot'])).toEqual(['.agents/skills']);
  });

  it('reuses .claude/skills for agents that also read it', () => {
    expect(skillTargets(['claude', 'opencode'])).toEqual(['.claude/skills']);
    expect(skillTargets(['claude', 'cursor'])).toEqual(['.claude/skills']);
    expect(skillTargets(['copilot', 'claude'])).toEqual(['.claude/skills']);
  });

  it('adds .agents/skills only when Codex is selected with Claude Code', () => {
    expect(skillTargets(['claude', 'codex', 'opencode', 'cursor', 'copilot']).sort()).toEqual([
      '.agents/skills',
      '.claude/skills',
    ]);
  });

  it('returns nothing without tools', () => {
    expect(skillTargets([])).toEqual([]);
  });
});
