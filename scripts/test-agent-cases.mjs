#!/usr/bin/env node
// Render expected agent-case drafts (not a live model test). Case 08 is documentation only.
import { spawnSync } from 'node:child_process';
import { readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'tests/agent-cases');
const out = join(root, 'docs/agent-cases');
mkdirSync(out, { recursive: true });
const sam = join(root, 'bin/sam.js');

const files = readdirSync(dir).filter((f) => /^\d+-.*\.md$/.test(f) && f !== '08-no-html.md').sort();
let failed = 0;
for (const f of files) {
  const dest = join(out, f.replace(/\.md$/, '.html'));
  const r = spawnSync(process.execPath, [sam, 'render', join(dir, f), '-o', dest, '--no-open', '--style', 'off'], {
    encoding: 'utf8',
    cwd: root,
  });
  if (r.status !== 0) {
    console.error(`✗ ${f}\n${r.stderr || r.stdout}`);
    failed++;
  } else {
    console.log(`✓ render ${f} → ${dest}`);
  }
}
console.log(failed ? `failed ${failed}` : `all ${files.length} agent-case drafts rendered (08 is no-page by design)`);
process.exit(failed ? 1 : 0);
