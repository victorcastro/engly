#!/usr/bin/env node
import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { checkOutput } from './checks.mjs';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const CLI = join(ROOT, 'dist', 'cli.js');
const TIMEOUT_MS = 180_000;

/**
 * @param {string} project
 * @param {string} prompt
 * @param {string | undefined} model
 * @returns {Promise<string>}
 */
function askAgent(project, prompt, model) {
  const args = ['-p', prompt, '--output-format', 'json', '--tools', '', '--setting-sources', 'project'];
  args.push('--no-session-persistence');
  if (model) args.push('--model', model);

  return new Promise((resolvePromise, reject) => {
    const child = execFile(
      'claude',
      args,
      { cwd: project, timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error) return reject(error);
        try {
          resolvePromise(String(JSON.parse(stdout).result ?? ''));
        } catch {
          reject(new Error('claude did not return JSON'));
        }
      },
    );
    child.stdin?.end();
  });
}

/**
 * @param {string[]} items
 * @param {number} limit
 * @param {(item: string, index: number) => Promise<void>} worker
 */
async function runPool(items, limit, worker) {
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      await worker(/** @type {string} */ (items[index]), index);
    }
  });
  await Promise.all(lanes);
}

async function main() {
  const { values } = parseArgs({
    options: {
      runs: { type: 'string', default: '1' },
      case: { type: 'string' },
      model: { type: 'string' },
      concurrency: { type: 'string', default: '4' },
    },
  });

  const runs = Math.max(1, Number(values.runs));
  const concurrency = Math.max(1, Number(values.concurrency));
  const cases = JSON.parse(readFileSync(join(ROOT, 'evals', 'cases.json'), 'utf8')).filter(
    (/** @type {{ id: string }} */ item) => !values.case || item.id.includes(values.case),
  );

  if (cases.length === 0) {
    console.error(`No eval case matches "${values.case}".`);
    process.exitCode = 1;
    return;
  }
  if (!existsSync(CLI)) {
    console.error('dist/cli.js not found. Run "npm run build" first.');
    process.exitCode = 1;
    return;
  }

  const project = mkdtempSync(join(tmpdir(), 'engly-evals-'));
  try {
    execFileSync('node', [CLI, 'init', '--tools', 'claude'], { cwd: project, stdio: 'ignore' });

    const jobs = cases.flatMap((/** @type {{ id: string }} */ item) => Array.from({ length: runs }, () => item.id));
    /** @type {Map<string, { name: string, pass: boolean }[][]>} */
    const outcomes = new Map();
    /** @type {Map<string, string[]>} */
    const errors = new Map();

    await runPool(jobs, concurrency, async (id) => {
      const item = cases.find((/** @type {{ id: string }} */ entry) => entry.id === id);
      try {
        const output = await askAgent(project, item.prompt, values.model);
        outcomes.set(id, [...(outcomes.get(id) ?? []), checkOutput(output, item.kind)]);
      } catch (error) {
        errors.set(id, [...(errors.get(id) ?? []), error instanceof Error ? error.message : String(error)]);
      }
    });

    /** @type {Map<string, { passed: number, total: number }>} */
    const byCheck = new Map();
    let failedCases = 0;

    for (const item of cases) {
      const results = outcomes.get(item.id) ?? [];
      const failedRuns = results.filter((run) => run.some((check) => !check.pass));
      const errored = errors.get(item.id)?.length ?? 0;
      const passed = results.length - failedRuns.length;
      const ok = failedRuns.length === 0 && errored === 0;
      if (!ok) failedCases++;

      console.log(`${ok ? 'PASS' : 'FAIL'}  ${item.id}  (${passed}/${runs} runs)`);
      for (const run of failedRuns) {
        const names = run.filter((check) => !check.pass).map((check) => check.name);
        console.log(`        failed: ${names.join(', ')}`);
      }
      for (const message of errors.get(item.id) ?? []) console.log(`        error: ${message}`);

      for (const check of results.flat()) {
        const stat = byCheck.get(check.name) ?? { passed: 0, total: 0 };
        stat.total++;
        if (check.pass) stat.passed++;
        byCheck.set(check.name, stat);
      }
    }

    console.log('\nPass rate by check');
    for (const [name, stat] of [...byCheck].sort(([a], [b]) => a.localeCompare(b))) {
      console.log(`  ${name.padEnd(18)} ${stat.passed}/${stat.total}`);
    }
    console.log(`\n${cases.length - failedCases}/${cases.length} cases passed`);
    if (failedCases > 0) process.exitCode = 1;
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
}

main();
