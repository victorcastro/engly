import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedRoot: string | undefined;

export function packageRoot(): string {
  if (cachedRoot) return cachedRoot;
  let dir = dirname(fileURLToPath(import.meta.url));
  while (true) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string };
      if (pkg.name === 'engly') {
        cachedRoot = dir;
        return dir;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error('Could not locate the engly package root.');
    dir = parent;
  }
}

export function templatesDir(): string {
  return join(packageRoot(), 'templates');
}

export interface PackageInfo {
  name: string;
  version: string;
}

let cachedInfo: PackageInfo | undefined;

export function packageInfo(): PackageInfo {
  if (cachedInfo) return cachedInfo;
  const pkg = JSON.parse(readFileSync(join(packageRoot(), 'package.json'), 'utf8')) as PackageInfo;
  cachedInfo = { name: pkg.name, version: pkg.version };
  return cachedInfo;
}

export function packageVersion(): string {
  return packageInfo().version;
}

export const ENGLY_DIR = '.engly';
export const CONFIG_FILE = `${ENGLY_DIR}/config.json`;
export const INSTRUCTIONS_FILE = `${ENGLY_DIR}/engly.md`;
