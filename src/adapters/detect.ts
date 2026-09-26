import { access } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export async function anyExists(cwd: string, paths: string[]): Promise<boolean> {
  for (const path of paths) {
    try {
      await access(join(cwd, path));
      return true;
    } catch {}
  }
  return false;
}

// Same as anyExists, but also looks in every directory above `cwd`.
export async function anyExistsUpward(cwd: string, paths: string[]): Promise<boolean> {
  let dir = cwd;
  while (true) {
    if (await anyExists(dir, paths)) return true;
    const parent = dirname(dir);
    if (parent === dir) return false;
    dir = parent;
  }
}
