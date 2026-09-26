import { anyExists } from './detect.js';
import type { Adapter } from './types.js';

export const claude: Adapter = {
  id: 'claude',
  name: 'Claude Code',
  delivery: 'import',
  detect: (cwd) => anyExists(cwd, ['CLAUDE.md', '.claude']),
  instructionFile: () => 'CLAUDE.md',
  skillDirs: ['.claude/skills'],
  sizeLimit: {
    maxLines: 200,
    warning: 'Claude Code follows long instruction files less closely.',
  },
};
