#!/usr/bin/env node
// Render kv fixtures (inline CSS + --css-href) and optionally probe layout with Chrome.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs/kv-fixtures');
const sam = join(root, 'bin/sam.js');
mkdirSync(outDir, { recursive: true });

function run(args, label) {
  const r = spawnSync(process.execPath, [sam, ...args], { encoding: 'utf8', cwd: root });
  if (r.status !== 0) {
    console.error(`✗ ${label}\n${r.stderr || r.stdout}`);
    process.exit(1);
  }
  console.log(`✓ ${label}`);
  return r.stdout;
}

const paperCss = join(outDir, 'paper.css');
run(['css', '-o', paperCss], 'sam css');

run(['render', 'tests/kv-layout/fixtures.md', '-o', join(outDir, 'kv-doc-inline.html'), '--no-open', '--style', 'off'], 'render doc inline');
run(['render', 'tests/kv-layout/fixtures.md', '-o', join(outDir, 'kv-doc-href.html'), '--no-open', '--style', 'off', '--css-href', './paper.css'], 'render doc css-href');
run(['render', 'tests/kv-layout/sheet-narrow.md', '-o', join(outDir, 'kv-sheet-inline.html'), '--no-open', '--style', 'off'], 'render sheet inline');
run(['render', 'tests/kv-layout/sheet-narrow.md', '-o', join(outDir, 'kv-sheet-href.html'), '--no-open', '--style', 'off', '--css-href', './paper.css'], 'render sheet css-href');

const doc = readFileSync(join(outDir, 'kv-doc-inline.html'), 'utf8');
const checks = [
  ['has am-kv-host', /class="am-kv-host"/.test(doc)],
  ['data-auto=1', /data-auto="1"/.test(doc)],
  ['data-auto=3', /data-auto="3"/.test(doc)],
  ['data-auto=6', /data-auto="6"/.test(doc)],
  ['explicit cols=3', /--kv-cols:\s*3/.test(doc)],
  ['explicit cols=1', /--kv-cols:\s*1/.test(doc)],
  ['wide cell', /am-kv-cell--wide/.test(doc)],
  ['container CSS present', /@container am-kv/.test(doc)],
];
let failed = 0;
for (const [name, pass] of checks) {
  console.log(pass ? `✓ html: ${name}` : `✗ html: ${name}`);
  if (!pass) failed++;
}
if (failed) process.exit(1);

const chromeWhich = spawnSync('which', ['google-chrome'], { encoding: 'utf8' });
const chromePath = chromeWhich.status === 0 ? chromeWhich.stdout.trim() : '';
if (!chromePath) {
  console.log('! Chrome not found — skipped viewport overflow/overlap checks (360/768/1280, narrow iframe)');
  console.log('all render + structural checks passed');
  process.exit(0);
}

const probe = spawnSync(process.execPath, [join(root, 'scripts/probe-kv-layout.mjs'), outDir, chromePath], {
  encoding: 'utf8',
  cwd: root,
  timeout: 180000,
});
process.stdout.write(probe.stdout || '');
process.stderr.write(probe.stderr || '');
if (probe.status !== 0 && probe.status !== null) process.exit(probe.status || 1);
console.log('kv layout tests finished');
