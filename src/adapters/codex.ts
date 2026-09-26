import { anyExists } from './detect.js';
import type { Adapter } from './types.js';

export const codex: Adapter = {
  id: 'codex',
  name: 'Codex',
  delivery: 'embedded',
  detect: (cwd) => anyExists(cwd, ['.codex', 'AGENTS.md']),
  instructionFile: () => 'AGENTS.md',
  skillDirs: ['.agents/skills'],
  sizeLimit: {
    // Real limit is 32 KiB for all AGENTS.md files combined (spec §9.6).
    maxBytes: 24 * 1024,
    warning: 'Codex may stop reading long instruction files.\nThe Engly block could be cut off.',
  },
};
