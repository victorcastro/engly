export const MAX_NOTE_LINES = 6;
export const MAX_BULLETS = 3;
export const CONFIRMATION_LINE = '✓ Correct English.';
export const KINDS = ['translate', 'mixed', 'corrections', 'correct'];

const NON_ENGLISH_RE = /[ñ¿¡áéíóúàèìòùâêîôûãõçüäöß]/i;
const CONFIRMATION_RE = /\b(?:shall I proceed|should I proceed|do you want me to|would you like me to)\b/i;
const BETTER_RE = /^Better:\s*"?(.*?)"?$/;

/**
 * @param {string} output
 * @returns {{ lines: string[], after: string } | null}
 */
export function extractNote(output) {
  const lines = output.split('\n').map((line) => line.trim().replace(/^>\s*/, ''));
  const start = lines.findIndex((line) => line.startsWith('┌ ✨ Engly'));
  if (start === -1) return null;

  const end = lines.findIndex((line, index) => index > start && line.startsWith('└'));
  if (end === -1) return null;

  const body = lines.slice(start + 1, end);
  if (!body.every((line) => line.startsWith('│'))) return null;

  return {
    lines: body.map((line) => line.replace(/^│\s?/, '').trimEnd()),
    after: lines
      .slice(end + 1)
      .join('\n')
      .trim(),
  };
}

/** @param {string[]} lines */
export function betterOf(lines) {
  for (const line of lines) {
    const match = BETTER_RE.exec(line);
    if (match) return match[1] ?? '';
  }
  return null;
}

/**
 * @param {string} output
 * @param {string} kind
 * @returns {{ name: string, pass: boolean }[]}
 */
export function checkOutput(output, kind) {
  if (!KINDS.includes(kind)) throw new Error(`Unknown eval kind: ${kind}`);

  const note = extractNote(output);
  if (!note) return [{ name: 'note-format', pass: false }];

  const better = betterOf(note.lines);
  const bullets = note.lines.filter((line) => line.startsWith('•'));
  const hasBetter = better !== null && better.length > 0;
  const betterIsEnglish = hasBetter && !NON_ENGLISH_RE.test(better);

  const results = [
    { name: 'note-format', pass: true },
    { name: 'max-lines', pass: note.lines.length <= MAX_NOTE_LINES },
    { name: 'task-done', pass: note.after.length > 0 },
    { name: 'no-confirmation', pass: !CONFIRMATION_RE.test(output) },
  ];

  if (kind === 'correct') {
    results.push({ name: 'only-confirmation', pass: note.lines.length === 1 && note.lines[0] === CONFIRMATION_LINE });
    return results;
  }

  results.push({ name: 'has-better', pass: hasBetter }, { name: 'better-english', pass: betterIsEnglish });

  if (kind === 'translate') results.push({ name: 'no-bullets', pass: bullets.length === 0 });
  if (kind === 'corrections') results.push({ name: 'has-bullets', pass: bullets.length > 0 });
  if (kind === 'mixed' || kind === 'corrections')
    results.push({ name: 'max-bullets', pass: bullets.length <= MAX_BULLETS });

  return results;
}
