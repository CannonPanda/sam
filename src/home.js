// Data directory: ~/.sam, or SAM_HOME / AM_HOME.
import { mkdirSync, existsSync, statSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const defaultHome = () => join(homedir(), '.sam');

export function ensureHome(home) {
  const fresh = !existsSync(home);
  mkdirSync(home, { recursive: true, mode: 0o700 });
  if (process.platform === 'win32' || !(fresh || home === defaultHome())) return;
  if ((statSync(home).mode & 0o777) !== 0o700) chmodSync(home, 0o700);
}
