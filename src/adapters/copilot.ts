import { anyExists } from './detect.js';
import type { Adapter } from './types.js';

export const copilot: Adapter = {
  id: 'copilot',
  name: 'GitHub Copilot',
  delivery: 'embedded',
  detect: (cwd) => anyExists(cwd, ['.github/copilot-instructions.md', '.github/instructions']),
  instructionFile: () => '.github/copilot-instructions.md',
  skillDirs: ['.agents/skills', '.claude/skills', '.github/skills'],
};
