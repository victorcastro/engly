import { anyExists } from './detect.js';
import type { Adapter } from './types.js';

export const opencode: Adapter = {
  id: 'opencode',
  name: 'OpenCode',
  delivery: 'embedded',
  detect: (cwd) => anyExists(cwd, ['opencode.json', 'opencode.jsonc', '.opencode']),
  instructionFile: () => 'AGENTS.md',
  skillDirs: ['.agents/skills', '.claude/skills', '.opencode/skills'],
};
