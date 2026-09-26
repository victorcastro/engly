import { setEnabled } from './set-enabled.js';

export async function enableCommand(): Promise<void> {
  await setEnabled(process.cwd(), true);
}
