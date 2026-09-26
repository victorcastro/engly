import { spawnSync } from 'node:child_process';

export type GitStatus = 'tracked' | 'untracked' | 'ignored' | 'no-git';

function git(cwd: string, args: string[]): number | null {
  const result = spawnSync('git', args, { cwd, stdio: 'ignore' });
  if (result.error) return null;
  return result.status;
}

export function gitStatus(cwd: string, relativePath: string): GitStatus {
  if (git(cwd, ['rev-parse', '--is-inside-work-tree']) !== 0) return 'no-git';
  if (git(cwd, ['ls-files', '--error-unmatch', '--', relativePath]) === 0) return 'tracked';
  if (git(cwd, ['check-ignore', '-q', '--', relativePath]) === 0) return 'ignored';
  return 'untracked';
}
