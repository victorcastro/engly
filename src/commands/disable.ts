import { setEnabled } from './set-enabled.js';

export async function disableCommand(): Promise<void> {
  await setEnabled(process.cwd(), false);
}
