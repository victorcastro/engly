import { describe, expect, it } from 'vitest';
import {
  BlockError,
  buildBlock,
  detectEol,
  END_MARKER,
  findBlock,
  hasBlock,
  readBlock,
  removeBlock,
  startMarker,
  upsertBlock,
} from '../src/core/block.js';

const V = '1.0.0';
const CONTENT = '@.engly/engly.md';
const BLOCK = `<!-- engly:start v1.0.0 -->\n${CONTENT}\n<!-- engly:end -->`;

describe('detectEol', () => {
  it('detects LF', () => expect(detectEol('a\nb\n')).toBe('\n'));
  it('detects CRLF', () => expect(detectEol('a\r\nb\r\n')).toBe('\r\n'));
  it('defaults to LF for empty or single-line text', () => {
    expect(detectEol('')).toBe('\n');
    expect(detectEol('single line')).toBe('\n');
  });
});

describe('buildBlock', () => {
  it('wraps content between the markers', () => {
    expect(buildBlock(CONTENT, V)).toBe(BLOCK);
  });

  it('accepts a version with a leading v', () => {
    expect(startMarker('v1.2.3')).toBe('<!-- engly:start v1.2.3 -->');
  });

  it('uses the requested line ending, even if the content has the other one', () => {
    expect(buildBlock('one\ntwo', V, '\r\n')).toBe(`${startMarker(V)}\r\none\r\ntwo\r\n${END_MARKER}`);
    expect(buildBlock('one\r\ntwo', V, '\n')).toBe(`${startMarker(V)}\none\ntwo\n${END_MARKER}`);
  });

  it('drops trailing newlines from the content', () => {
    expect(buildBlock(`${CONTENT}\n\n`, V)).toBe(BLOCK);
  });

  it('handles empty content', () => {
    expect(buildBlock('', V)).toBe(`${startMarker(V)}\n${END_MARKER}`);
  });
});

describe('findBlock', () => {
  it('returns null when there is no block', () => {
    expect(findBlock('# Project\n')).toBeNull();
    expect(hasBlock('# Project\n')).toBe(false);
  });

  it('returns the range and version', () => {
    const text = `intro\n${BLOCK}\noutro\n`;
    const range = findBlock(text)!;
    expect(text.slice(range.start, range.end)).toBe(BLOCK);
    expect(range.version).toBe('1.0.0');
  });

  it('accepts a start marker without version', () => {
    const range = findBlock(`<!-- engly:start -->\nx\n${END_MARKER}`)!;
    expect(range.version).toBeNull();
  });

  it('throws on a start marker without end', () => {
    expect(() => findBlock(`${startMarker(V)}\nx\n`)).toThrow(BlockError);
  });

  it('throws on an end marker without start', () => {
    expect(() => findBlock(`x\n${END_MARKER}\n`)).toThrow(BlockError);
  });

  it('throws on duplicated blocks', () => {
    expect(() => findBlock(`${BLOCK}\n\n${BLOCK}\n`)).toThrow(BlockError);
  });

  it('throws when the end marker comes first', () => {
    expect(() => findBlock(`${END_MARKER}\n${startMarker(V)}\n`)).toThrow(BlockError);
  });
});

describe('readBlock', () => {
  it('returns the inner content', () => {
    expect(readBlock(`a\n${BLOCK}\nb`)).toBe(CONTENT);
  });

  it('returns the inner content of a CRLF block', () => {
    expect(readBlock(`a\r\n${buildBlock('x\ny', V, '\r\n')}\r\nb`)).toBe('x\r\ny');
  });

  it('returns an empty string for an empty block', () => {
    expect(readBlock(buildBlock('', V))).toBe('');
  });

  it('returns null without block', () => {
    expect(readBlock('nothing')).toBeNull();
  });
});

describe('upsertBlock: new file', () => {
  it('creates the file content with the block and a final newline', () => {
    const result = upsertBlock('', CONTENT, { version: V });
    expect(result).toEqual({ text: `${BLOCK}\n`, action: 'created' });
  });

  it('ignores position for an empty file', () => {
    expect(upsertBlock('', CONTENT, { version: V, position: 'top' }).text).toBe(`${BLOCK}\n`);
  });
});

describe('upsertBlock: existing file without block', () => {
  it('appends the block after a blank line', () => {
    const result = upsertBlock('# Project\n\nRules.\n', CONTENT, { version: V });
    expect(result).toEqual({ text: `# Project\n\nRules.\n\n${BLOCK}\n`, action: 'appended' });
  });

  it('adds the missing final newline before appending', () => {
    const result = upsertBlock('# Project', CONTENT, { version: V });
    expect(result.text).toBe(`# Project\n\n${BLOCK}\n`);
  });

  it('prepends the block when position is top', () => {
    const result = upsertBlock('# Project\n', CONTENT, { version: V, position: 'top' });
    expect(result).toEqual({ text: `${BLOCK}\n\n# Project\n`, action: 'prepended' });
  });

  it('keeps the original content as an exact prefix when appending', () => {
    const original = '# Project\n\n  indented   \n\ttabs\n\n\n';
    const { text } = upsertBlock(original, CONTENT, { version: V });
    expect(text.startsWith(original)).toBe(true);
  });

  it('keeps the original content as an exact suffix when prepending', () => {
    const original = '# Project\n\n  indented   \n';
    const { text } = upsertBlock(original, CONTENT, { version: V, position: 'top' });
    expect(text.endsWith(original)).toBe(true);
  });
});

describe('upsertBlock: block already present', () => {
  it('replaces only the block content', () => {
    const before = `# Project\n\n${BLOCK}\n\n## More\n`;
    const result = upsertBlock(before, 'new content', { version: V });
    expect(result.action).toBe('updated');
    expect(result.text).toBe(`# Project\n\n${startMarker(V)}\nnew content\n${END_MARKER}\n\n## More\n`);
  });

  it('updates the version in the start marker', () => {
    const { text } = upsertBlock(`${BLOCK}\n`, CONTENT, { version: '2.0.0' });
    expect(text).toBe(`<!-- engly:start v2.0.0 -->\n${CONTENT}\n${END_MARKER}\n`);
  });

  it('updates a block that has no version', () => {
    const { text } = upsertBlock(`<!-- engly:start -->\nold\n${END_MARKER}\n`, CONTENT, { version: V });
    expect(text).toBe(`${BLOCK}\n`);
  });

  it('is idempotent', () => {
    const once = upsertBlock('# Project\n', CONTENT, { version: V }).text;
    const twice = upsertBlock(once, CONTENT, { version: V }).text;
    expect(twice).toBe(once);
  });

  it('does not move the block when position is given', () => {
    const before = `# Project\n\n${BLOCK}\n`;
    expect(upsertBlock(before, CONTENT, { version: V, position: 'top' }).text).toBe(before);
  });

  it('refuses to edit broken markers', () => {
    expect(() => upsertBlock(`${startMarker(V)}\nno end\n`, CONTENT, { version: V })).toThrow(BlockError);
  });
});

describe('removeBlock', () => {
  it('returns the text untouched when there is no block', () => {
    expect(removeBlock('# Project\n')).toEqual({ text: '# Project\n', removed: false });
  });

  it('empties a file that only had the block', () => {
    expect(removeBlock(`${BLOCK}\n`)).toEqual({ text: '', removed: true });
  });

  it('restores a file after an append', () => {
    const original = '# Project\n\nRules.\n';
    const inserted = upsertBlock(original, CONTENT, { version: V }).text;
    expect(removeBlock(inserted).text).toBe(original);
  });

  it('restores a file after a prepend', () => {
    const original = '# Project\n\nRules.\n';
    const inserted = upsertBlock(original, CONTENT, { version: V, position: 'top' }).text;
    expect(removeBlock(inserted).text).toBe(original);
  });

  it('restores a file that already ended with blank lines', () => {
    const original = '# Project\n\n\n';
    const inserted = upsertBlock(original, CONTENT, { version: V }).text;
    expect(removeBlock(inserted).text).toBe(original);
  });

  it('keeps a final newline that was added to a file without one', () => {
    // Documented limitation: the final newline added before appending stays.
    const inserted = upsertBlock('# Project', CONTENT, { version: V }).text;
    expect(removeBlock(inserted).text).toBe('# Project\n');
  });

  it('removes a block from the middle of a file', () => {
    expect(removeBlock(`a\n\n${BLOCK}\n\nb\n`).text).toBe('a\n\nb\n');
    expect(removeBlock(`a\n${BLOCK}\nb\n`).text).toBe('a\nb\n');
  });

  it('removes a block at the end of a file without final newline', () => {
    expect(removeBlock(`a\n\n${BLOCK}`).text).toBe('a\n');
  });

  it('removes a block whose marker has no version', () => {
    expect(removeBlock(`a\n\n<!-- engly:start -->\nx\n${END_MARKER}\n`).text).toBe('a\n');
  });

  it('refuses to edit broken markers', () => {
    expect(() => removeBlock(`a\n${END_MARKER}\n`)).toThrow(BlockError);
  });
});

describe('CRLF files', () => {
  const original = '# Project\r\n\r\nRules.\r\n';

  it('creates the block with CRLF line endings', () => {
    const { text } = upsertBlock(original, 'line one\nline two', { version: V });
    expect(text).toBe(`# Project\r\n\r\nRules.\r\n\r\n${startMarker(V)}\r\nline one\r\nline two\r\n${END_MARKER}\r\n`);
    expect(text.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('prepends with CRLF line endings', () => {
    const { text } = upsertBlock(original, CONTENT, { version: V, position: 'top' });
    expect(text).toBe(`${startMarker(V)}\r\n${CONTENT}\r\n${END_MARKER}\r\n\r\n${original}`);
  });

  it('updates a CRLF block keeping CRLF', () => {
    const inserted = upsertBlock(original, 'old', { version: V }).text;
    const { text } = upsertBlock(inserted, 'new\ncontent', { version: V });
    expect(text).toBe(`${original}\r\n${startMarker(V)}\r\nnew\r\ncontent\r\n${END_MARKER}\r\n`);
    expect(text.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('restores the exact CRLF file on remove', () => {
    const inserted = upsertBlock(original, CONTENT, { version: V }).text;
    expect(removeBlock(inserted).text).toBe(original);
    const prepended = upsertBlock(original, CONTENT, { version: V, position: 'top' }).text;
    expect(removeBlock(prepended).text).toBe(original);
  });

  it('removes a CRLF block from the middle of a file', () => {
    const block = buildBlock(CONTENT, V, '\r\n');
    expect(removeBlock(`a\r\n\r\n${block}\r\n\r\nb\r\n`).text).toBe('a\r\n\r\nb\r\n');
  });
});

describe('content outside the markers is never changed', () => {
  const before = '# Title\r\n\n  weird   spacing \t\n<!-- a user comment -->\n```\ncode <!-- engly -->\n```\n';
  const after = '\n\n## Tail with no final newline  ';

  it('keeps the exact bytes before and after the block on update', () => {
    const file = `${before}${BLOCK}${after}`;
    const { text } = upsertBlock(file, 'completely\ndifferent\ncontent', { version: '9.9.9' });
    expect(text.startsWith(before)).toBe(true);
    expect(text.endsWith(after)).toBe(true);
    const range = findBlock(text)!;
    expect(text.slice(0, range.start)).toBe(before);
    expect(text.slice(range.end)).toBe(after);
  });

  it('keeps mixed line endings outside the block untouched', () => {
    const file = `${before}${BLOCK}${after}`;
    const updated = upsertBlock(file, 'x', { version: V }).text;
    expect(removeBlock(updated).text).toBe(before + after.slice(1));
  });

  it('survives many update cycles without drifting', () => {
    let text = `${before}${BLOCK}${after}`;
    for (let i = 0; i < 20; i++) {
      text = upsertBlock(text, `content ${i}\nline`, { version: `1.0.${i}` }).text;
    }
    const range = findBlock(text)!;
    expect(text.slice(0, range.start)).toBe(before);
    expect(text.slice(range.end)).toBe(after);
  });

  it('round-trips arbitrary user files through insert and remove', () => {
    const files = [
      '# A\n',
      '# A\n\nText\n',
      '# A\r\n\r\nText\r\n',
      '\n',
      '\n\n',
      'no newline at all\n',
      '# Unicode ñ á ü 🗣️\n',
      '<!-- other comment -->\n',
    ];
    for (const original of files) {
      for (const position of ['end', 'top'] as const) {
        const inserted = upsertBlock(original, CONTENT, { version: V, position }).text;
        expect(removeBlock(inserted).text, JSON.stringify({ original, position })).toBe(original);
      }
    }
  });
});
