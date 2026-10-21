import { describe, expect, it } from 'vitest';
import { betterOf, checkOutput, extractNote } from '../evals/checks.mjs';

const TRANSLATE = [
  '┌ ✨ Engly',
  '│ Better: "Write a function that adds two numbers."',
  '└',
  '',
  'Here is the function.',
].join('\n');

const CORRECTIONS = [
  '┌ ✨ Engly',
  '│ • "return" → "returns" (third person)',
  '│ Better: "Write a function that returns the sum."',
  '└',
  '',
  'Here is the function.',
].join('\n');

const CORRECT = ['┌ ✨ Engly', '│ ✓ Correct English.', '└', '', 'Here is the function.'].join('\n');

function failed(output: string, kind: string) {
  return checkOutput(output, kind)
    .filter((check) => !check.pass)
    .map((check) => check.name);
}

describe('extractNote', () => {
  it('splits the note from the task answer', () => {
    expect(extractNote(CORRECT)).toEqual({ lines: ['✓ Correct English.'], after: 'Here is the function.' });
  });

  it('reads a note quoted as a blockquote', () => {
    const quoted = CORRECT.split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    expect(extractNote(quoted)?.lines).toEqual(['✓ Correct English.']);
  });

  it('returns null without a note', () => {
    expect(extractNote('Just the answer.')).toBeNull();
  });

  it('returns null when the box is not closed', () => {
    expect(extractNote('┌ ✨ Engly\n│ Better: "x"')).toBeNull();
  });

  it('returns null when the box holds lines that are not part of it', () => {
    expect(extractNote('┌ ✨ Engly\nstray\n└')).toBeNull();
  });
});

describe('betterOf', () => {
  it('reads the quoted improved prompt', () => {
    expect(betterOf(['Better: "Do it."'])).toBe('Do it.');
  });

  it('returns null when there is no Better line', () => {
    expect(betterOf(['✓ Correct English.'])).toBeNull();
  });
});

describe('checkOutput', () => {
  it('accepts a valid translation note', () => {
    expect(failed(TRANSLATE, 'translate')).toEqual([]);
  });

  it('accepts a valid corrections note', () => {
    expect(failed(CORRECTIONS, 'corrections')).toEqual([]);
  });

  it('accepts a valid confirmation note', () => {
    expect(failed(CORRECT, 'correct')).toEqual([]);
  });

  it('fails every check when there is no note', () => {
    expect(failed('Just the answer.', 'translate')).toEqual(['note-format']);
  });

  it('rejects bullets in a translation', () => {
    expect(failed(CORRECTIONS, 'translate')).toEqual(['no-bullets']);
  });

  it('rejects a corrections note without bullets', () => {
    expect(failed(TRANSLATE, 'corrections')).toEqual(['has-bullets']);
  });

  it('rejects more than three bullets', () => {
    const bullets = Array.from({ length: 4 }, (_, i) => `│ • "a${i}" → "b${i}" (reason)`);
    const output = ['┌ ✨ Engly', ...bullets, '│ Better: "Fixed."', '└', 'Answer.'].join('\n');
    expect(failed(output, 'corrections')).toEqual(['max-bullets']);
  });

  it('rejects a note longer than six lines', () => {
    const lines = Array.from({ length: 7 }, (_, i) => `│ line ${i}`);
    const output = ['┌ ✨ Engly', ...lines, '└', 'Answer.'].join('\n');
    expect(failed(output, 'correct')).toContain('max-lines');
  });

  it('rejects a Better line that is not English', () => {
    const output = ['┌ ✨ Engly', '│ Better: "Escribe una función."', '└', 'Answer.'].join('\n');
    expect(failed(output, 'translate')).toEqual(['better-english']);
  });

  it('rejects a note without a Better line', () => {
    const output = ['┌ ✨ Engly', '│ • "a" → "b" (reason)', '└', 'Answer.'].join('\n');
    expect(failed(output, 'corrections')).toEqual(['has-better', 'better-english']);
  });

  it('rejects a confirmation note with corrections', () => {
    expect(failed(CORRECTIONS, 'correct')).toEqual(['only-confirmation']);
  });

  it('rejects a note that is not followed by the task', () => {
    const output = ['┌ ✨ Engly', '│ ✓ Correct English.', '└'].join('\n');
    expect(failed(output, 'correct')).toEqual(['task-done']);
  });

  it('rejects asking for confirmation', () => {
    expect(failed(`${CORRECT}\nShould I proceed?`, 'correct')).toEqual(['no-confirmation']);
  });

  it('allows corrections inside a mixed-language note', () => {
    expect(failed(CORRECTIONS, 'mixed')).toEqual([]);
    expect(failed(TRANSLATE, 'mixed')).toEqual([]);
  });

  it('throws on an unknown kind', () => {
    expect(() => checkOutput(CORRECT, 'nope')).toThrow('Unknown eval kind: nope');
  });
});
