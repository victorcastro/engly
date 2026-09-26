import { anyExists } from './detect.js';
import type { Adapter } from './types.js';

export const CURSOR_RULE_FRONTMATTER = '---\ndescription: Engly English coach\nalwaysApply: true\n---\n';

// TODO(spec §15): Cursor reads .claude/skills/ only as a "legacy" folder and
// was not tested. If it stops doing so, Cursor + Claude Code would get no skills.
export const cursor: Adapter = {
  id: 'cursor',
  name: 'Cursor',
  delivery: 'own-file',
  detect: (cwd) => anyExists(cwd, ['.cursor', '.cursorrules']),
  instructionFile: () => '.cursor/rules/engly.mdc',
  skillDirs: ['.agents/skills', '.cursor/skills', '.claude/skills'],
};
