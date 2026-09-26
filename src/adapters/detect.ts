import { access } from 'node:fs/promises';
import { join } from 'node:path';

export async function anyExists(cwd: string, paths: string[]): Promise<boolean> {
  for (const path of paths) {
    try {
      await access(join(cwd, path));
      return true;
    } catch {}
  }
  return false;
}
