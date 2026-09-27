import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { packageInfo, packageRoot, packageVersion } from '../src/core/paths.js';

describe('packageInfo', () => {
  it('matches the name and version in package.json', () => {
    const pkg = JSON.parse(readFileSync(join(packageRoot(), 'package.json'), 'utf8')) as {
      name: string;
      version: string;
    };
    expect(packageInfo()).toEqual({ name: pkg.name, version: pkg.version });
  });

  it('is cached: repeated calls return the same object', () => {
    expect(packageInfo()).toBe(packageInfo());
  });
});

describe('packageVersion', () => {
  it('matches the version from packageInfo', () => {
    expect(packageVersion()).toBe(packageInfo().version);
  });
});
