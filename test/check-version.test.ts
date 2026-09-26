import { describe, expect, it } from 'vitest';
import { compareVersions, hasChangelogEntry, parseVersion } from '../scripts/check-version.mjs';

describe('compareVersions', () => {
  it('compares major, minor and patch numerically', () => {
    expect(compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.10', '1.0.9')).toBeGreaterThan(0);
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
    expect(compareVersions('1.1.0', '1.2.0')).toBeLessThan(0);
  });

  it('treats equal versions as equal', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0+build.1', '1.0.0+build.2')).toBe(0);
  });

  it('ranks a prerelease below its release', () => {
    expect(compareVersions('1.0.0-beta.1', '1.0.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '1.0.0-rc.1')).toBeGreaterThan(0);
  });

  it('compares prerelease identifiers', () => {
    expect(compareVersions('1.0.0-beta.2', '1.0.0-beta.10')).toBeLessThan(0);
    expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0);
    expect(compareVersions('1.0.0-beta', '1.0.0-alpha')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0-1', '1.0.0-alpha')).toBeLessThan(0);
    expect(compareVersions('1.0.0-alpha', '1.0.0-1')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0-alpha', '1.0.0-alpha.1')).toBeLessThan(0);
    expect(compareVersions('1.0.0-alpha.1', '1.0.0-alpha')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0-rc.1', '1.0.0-rc.1')).toBe(0);
  });

  it('throws on invalid versions', () => {
    expect(() => compareVersions('1.0', '1.0.0')).toThrow('Invalid version: 1.0');
    expect(() => compareVersions('1.0.0', 'v1.0.0')).toThrow('Invalid version: v1.0.0');
  });
});

describe('parseVersion', () => {
  it('parses core and prerelease', () => {
    expect(parseVersion('1.2.3-rc.1')).toEqual({ core: [1, 2, 3], pre: ['rc', '1'] });
    expect(parseVersion('01.2')).toBeNull();
  });
});

describe('hasChangelogEntry', () => {
  const changelog = '# Changelog\n\n## [1.0.1] - 2026-09-27\n\n## [1.0.0] - 2026-09-26\n';

  it('finds the exact version heading', () => {
    expect(hasChangelogEntry(changelog, '1.0.1')).toBe(true);
    expect(hasChangelogEntry(changelog, '1.0.0')).toBe(true);
  });

  it('does not match other versions or partial text', () => {
    expect(hasChangelogEntry(changelog, '1.0.2')).toBe(false);
    expect(hasChangelogEntry(changelog, '1.0')).toBe(false);
    expect(hasChangelogEntry('Released [1.0.1]\n', '1.0.1')).toBe(false);
  });

  it('escapes dots in the version', () => {
    expect(hasChangelogEntry('## [1x0x1]\n', '1.0.1')).toBe(false);
  });
});
