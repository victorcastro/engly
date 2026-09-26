#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * @param {string} version
 * @returns {{ core: number[], pre: string[] } | null}
 */
export function parseVersion(version) {
  const match = SEMVER_RE.exec(version);
  if (!match) return null;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    pre: match[4] ? match[4].split('.') : [],
  };
}

/**
 * Semver precedence: negative when a < b, 0 when equal, positive when a > b.
 * @param {string} a
 * @param {string} b
 */
export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) throw new Error(`Invalid version: ${!left ? a : b}`);

  for (let i = 0; i < 3; i++) {
    const diff = (left.core[i] ?? 0) - (right.core[i] ?? 0);
    if (diff !== 0) return diff;
  }

  if (left.pre.length === 0 || right.pre.length === 0) return right.pre.length - left.pre.length;

  for (let i = 0; i < Math.max(left.pre.length, right.pre.length); i++) {
    const x = left.pre[i];
    const y = right.pre[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const xNum = /^\d+$/.test(x);
    const yNum = /^\d+$/.test(y);
    if (xNum && yNum) return Number(x) - Number(y);
    if (xNum) return -1;
    if (yNum) return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * @param {string} changelog
 * @param {string} version
 */
export function hasChangelogEntry(changelog, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^##\\s+\\[${escaped}\\]`, 'm').test(changelog);
}

/** @param {string} baseRef */
function readBaseVersion(baseRef) {
  try {
    const pkg = execFileSync('git', ['show', `origin/${baseRef}:package.json`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return JSON.parse(pkg).version;
  } catch {
    return null;
  }
}

/**
 * @param {string} message
 * @param {string} [file]
 */
function fail(message, file = 'package.json') {
  console.log(`::error file=${file}::${message}`);
  process.exitCode = 1;
}

function main() {
  const baseRef = process.env.BASE_REF || 'main';
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version;

  if (!parseVersion(version)) return fail(`"${version}" is not a valid semver version.`);

  const baseVersion = readBaseVersion(baseRef);
  if (baseVersion === null) {
    console.log(`No package.json on ${baseRef}: skipping the version comparison.`);
  } else if (compareVersions(version, baseVersion) <= 0) {
    return fail(
      `Version ${version} must be greater than ${baseVersion} on ${baseRef}. Bump "version" in package.json.`,
    );
  } else {
    console.log(`Version ${baseVersion} → ${version}`);
  }

  if (!hasChangelogEntry(readFileSync('CHANGELOG.md', 'utf8'), version)) {
    return fail(`CHANGELOG.md has no "## [${version}]" entry.`, 'CHANGELOG.md');
  }
  console.log(`CHANGELOG.md has an entry for ${version}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
