import { anyExists, anyExistsUpward } from './detect.js';
import type { Adapter } from './types.js';

export const claude: Adapter = {
  id: 'claude',
  name: 'Claude Code',
  delivery: 'import',
  detect: (cwd) => anyExists(cwd, ['CLAUDE.md', '.claude']),
  // Claude Code reads AGENTS.md only when there is no CLAUDE.md, .claude/CLAUDE.md or
  // CLAUDE.local.md in the working directory or any directory above it.
  instructionFile: async (cwd) => {
    if (await anyExistsUpward(cwd, ['CLAUDE.md', '.claude/CLAUDE.md', 'CLAUDE.local.md'])) return 'CLAUDE.md';
    return (await anyExists(cwd, ['AGENTS.md'])) ? 'AGENTS.md' : 'CLAUDE.md';
  },
  instructionFiles: ['CLAUDE.md', 'AGENTS.md'],
  skillDirs: ['.claude/skills'],
  sizeLimit: {
    maxLines: 200,
    warning: 'Claude Code follows long instruction files less closely.',
  },
};
