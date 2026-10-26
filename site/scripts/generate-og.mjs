import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = join(root, 'public', 'og.png');
const chrome =
  process.env.CHROME_PATH ??
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
  ].find(existsSync);

if (!chrome) {
  console.error('Chrome not found. Set CHROME_PATH to a Chrome or Chromium binary.');
  process.exit(1);
}

const font = (pkg, file) => pathToFileURL(join(root, 'node_modules', '@fontsource-variable', pkg, 'files', file)).href;
const html = readFileSync(join(root, 'scripts', 'og.html'), 'utf8')
  .replace('{{GEIST}}', font('geist', 'geist-latin-wght-normal.woff2'))
  .replace('{{MONO}}', font('jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2'));

const tmp = mkdtempSync(join(tmpdir(), 'engly-og-'));
try {
  const page = join(tmp, 'og.html');
  writeFileSync(page, html);
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1200,630',
      '--virtual-time-budget=3000',
      `--screenshot=${output}`,
      pathToFileURL(page).href,
    ],
    { stdio: 'ignore' },
  );
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`${output} (${(statSync(output).size / 1024).toFixed(0)} KB)`);
