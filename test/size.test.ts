import { describe, expect, it } from 'vitest';
import { checkSize } from '../src/core/size.js';

const lines = (count: number) => 'line\n'.repeat(count);

describe('checkSize', () => {
  it('returns null without a limit', () => {
    expect(checkSize(lines(1000), undefined)).toBeNull();
  });

  it('flags files over the line limit', () => {
    const limit = { maxLines: 200, warning: 'too long' };
    expect(checkSize(lines(200), limit)).toBeNull();
    expect(checkSize(lines(201), limit)).toEqual({ label: '201 lines', warning: 'too long' });
  });

  it('counts a last line without final newline', () => {
    expect(checkSize('a\nb\nc', { maxLines: 2, warning: 'w' })?.label).toBe('3 lines');
  });

  it('treats an empty file as 0 lines', () => {
    expect(checkSize('', { maxLines: 0, warning: 'w' })).toBeNull();
  });

  it('flags files over the byte limit', () => {
    const limit = { maxBytes: 1024, warning: 'too big' };
    expect(checkSize('x'.repeat(1024), limit)).toBeNull();
    expect(checkSize('x'.repeat(31_539), limit)).toEqual({ label: '30.8 KB', warning: 'too big' });
  });

  it('measures bytes, not characters', () => {
    expect(checkSize('ñ'.repeat(600), { maxBytes: 1024, warning: 'w' })?.label).toBe('1.2 KB');
  });
});
