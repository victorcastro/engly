export const START_MARKER_PREFIX = '<!-- engly:start';
export const END_MARKER = '<!-- engly:end -->';

const START_MARKER_RE = /<!-- engly:start(?: v?([^\s>]+))? -->/g;

export type Eol = '\n' | '\r\n';
export type BlockPosition = 'top' | 'end';
export type UpsertAction = 'created' | 'appended' | 'prepended' | 'updated';

export class BlockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockError';
  }
}

export interface BlockRange {
  start: number;
  end: number;
  version: string | null;
}

export function detectEol(text: string): Eol {
  const index = text.indexOf('\n');
  if (index > 0 && text[index - 1] === '\r') return '\r\n';
  return '\n';
}

export function startMarker(version: string): string {
  return `${START_MARKER_PREFIX} v${version.replace(/^v/, '')} -->`;
}

// Broken markers throw instead of being repaired: editing around them could destroy user content.
export function findBlock(text: string): BlockRange | null {
  const starts = [...text.matchAll(START_MARKER_RE)];
  const ends = indexesOf(text, END_MARKER);

  if (starts.length === 0 && ends.length === 0) return null;

  const [startMatch] = starts;
  const [endIndex] = ends;
  if (!startMatch || endIndex === undefined || starts.length > 1 || ends.length > 1) {
    throw new BlockError(
      `Expected exactly one Engly block, found ${starts.length} start and ${ends.length} end marker(s). ` +
        'Fix the markers by hand before running Engly again.',
    );
  }

  const start = startMatch.index;
  if (endIndex < start) {
    throw new BlockError('The Engly end marker appears before the start marker.');
  }

  return { start, end: endIndex + END_MARKER.length, version: startMatch[1] ?? null };
}

export function hasBlock(text: string): boolean {
  return findBlock(text) !== null;
}

export function readBlock(text: string): string | null {
  const range = findBlock(text);
  if (!range) return null;
  const inner = text.slice(range.start, range.end);
  const afterStart = inner.indexOf('-->') + 3;
  return stripOneEol(inner.slice(afterStart, inner.length - END_MARKER.length), 'both');
}

export function buildBlock(content: string, version: string, eol: Eol = '\n'): string {
  const body = content.replace(/\r\n/g, '\n').replace(/\n+$/, '');
  const lines = [startMarker(version), ...(body === '' ? [] : body.split('\n')), END_MARKER];
  return lines.join(eol);
}

export interface UpsertOptions {
  version: string;
  position?: BlockPosition;
}

export interface UpsertResult {
  text: string;
  action: UpsertAction;
}

export function upsertBlock(text: string, content: string, options: UpsertOptions): UpsertResult {
  const eol = detectEol(text);
  const block = buildBlock(content, options.version, eol);
  const range = findBlock(text);

  if (range) {
    return { text: text.slice(0, range.start) + block + text.slice(range.end), action: 'updated' };
  }

  if (text === '') {
    return { text: block + eol, action: 'created' };
  }

  if (options.position === 'top') {
    return { text: block + eol + eol + text, action: 'prepended' };
  }

  const separator = endsWithEol(text) ? eol : eol + eol;
  return { text: text + separator + block + eol, action: 'appended' };
}

export interface RemoveResult {
  text: string;
  removed: boolean;
}

export function removeBlock(text: string): RemoveResult {
  const range = findBlock(text);
  if (!range) return { text, removed: false };

  let before = text.slice(0, range.start);
  let after = stripOneEol(text.slice(range.end), 'start');

  if (before === '') {
    after = stripOneEol(after, 'start');
  } else if (/(\r?\n)\r?\n$/.test(before)) {
    before = stripOneEol(before, 'end');
  }

  return { text: before + after, removed: true };
}

function endsWithEol(text: string): boolean {
  return text.endsWith('\n');
}

function stripOneEol(text: string, side: 'start' | 'end' | 'both'): string {
  let result = text;
  if (side === 'start' || side === 'both') {
    if (result.startsWith('\r\n')) result = result.slice(2);
    else if (result.startsWith('\n')) result = result.slice(1);
  }
  if (side === 'end' || side === 'both') {
    if (result.endsWith('\r\n')) result = result.slice(0, -2);
    else if (result.endsWith('\n')) result = result.slice(0, -1);
  }
  return result;
}

function indexesOf(text: string, search: string): number[] {
  const result: number[] = [];
  let index = text.indexOf(search);
  while (index !== -1) {
    result.push(index);
    index = text.indexOf(search, index + search.length);
  }
  return result;
}
