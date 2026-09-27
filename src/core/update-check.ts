import updateNotifier from 'update-notifier';
import { packageInfo } from './paths.js';

export function notifyIfUpdateAvailable(): void {
  try {
    updateNotifier({ pkg: packageInfo() }).notify();
  } catch {}
}
