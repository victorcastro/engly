import type { SizeLimit } from '../adapters/types.js';

export interface SizeReport {
  label: string;
  warning: string;
}

export function checkSize(text: string, limit: SizeLimit | undefined): SizeReport | null {
  if (!limit) return null;

  const bytes = Buffer.byteLength(text, 'utf8');
  if (limit.maxBytes !== undefined && bytes > limit.maxBytes) {
    return { label: `${(bytes / 1024).toFixed(1)} KB`, warning: limit.warning };
  }

  const lines = text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
  if (limit.maxLines !== undefined && lines > limit.maxLines) {
    return { label: `${lines} lines`, warning: limit.warning };
  }

  return null;
}
