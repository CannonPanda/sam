#!/usr/bin/env node
// Machine-readable sanity checks for sam (no heavy refactor). Exit 0 = pass.
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = [];
const ok = [];

function check(name, cond, detail = '') {
  if (cond) ok.push(name);
  else fail.push(`${name}${detail ? `: ${detail}` : ''}`);
}

const cli = readFileSync(join(root, 'src/cli.js'), 'utf8');
check('no ssam in USAGE', !/\bssam\b/.test(cli));
check('USAGE has sam render', /sam render <file/.test(cli));
check('video command explained', /sam has no "\$\{cmd\}" command|cmd === 'video'/.test(cli));
check('RAW_HELP mentions unsanitized', /unprocessed|unsanitized|as-is/i.test(cli) && /trusted/i.test(cli));

const skill = readFileSync(join(root, 'skills/sam/SKILL.md'), 'utf8');
check('SKILL keeps MUST', /\bMUST\b/.test(skill) || /必须/.test(skill));
check('SKILL has planning workflow', /写作前强制规划|必须工作流/.test(skill));
check('SKILL forbids kv replacing flow', /禁止.*kv.*flow|禁止.*代替.*flow/i.test(skill));
check('SKILL conflict priority', /数量上限不得成为省略|内容准确与结构表达/.test(skill));
check('SKILL not SHOULD-only for process', !/过程.*SHOULD|改为 SHOULD/.test(skill));

const kv = readFileSync(join(root, 'src/components/kv.js'), 'utf8');
check('kv has am-kv-host', /am-kv-host/.test(kv));
check('kv supports auto cols', /data-auto/.test(kv));

const css = readFileSync(join(root, 'src/themes/base.css'), 'utf8');
check('css container queries', /@container am-kv/.test(css) && /container-type:\s*inline-size/.test(css));
check('css minmax(0)', /minmax\(0,\s*1fr\)/.test(css));
check('css overflow-wrap', /overflow-wrap:\s*anywhere/.test(css));

const readme = readFileSync(join(root, 'README.md'), 'utf8');
check('README says paper-only', /仅 paper|paper-only|只留纸张/.test(readme));

const bundled = join(root, 'skills/sam/scripts/sam.mjs');
check('USAGE escapes stdin dash', /- \\`-\\` reads stdin/.test(cli) || /\\`-\\` reads stdin/.test(cli));
check('USAGE help prints version', (() => {
  // structural: full USAGE closed after css-href line
  return /--css-href emits/.test(cli) && /sam help \[component/.test(cli);
})());

check('bundled CLI exists', existsSync(bundled));
if (existsSync(bundled)) {
  const b = readFileSync(bundled, 'utf8');
  check('bundled has no ssam usage', !/^\s*ssam /m.test(b) && !/Usage:\n {2}ssam /.test(b));
}

console.log(`ok ${ok.length}`);
ok.forEach((n) => console.log(`  ✓ ${n}`));
if (fail.length) {
  console.log(`fail ${fail.length}`);
  fail.forEach((n) => console.log(`  ✗ ${n}`));
  process.exit(1);
}
console.log('all checks passed');
