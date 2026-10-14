// The one test sam keeps: the examples still render, lint still runs, and a planning leak still fails.
// Everything the removed suite did beyond this was a grep over source text, a headless-browser probe, or a render
// of fixtures that `sam render` already covers whenever they are written.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (args, input) => execFileSync(process.execPath, [join('bin', 'sam.js'), ...args], {
  encoding: 'utf8', input: input ?? '', stdio: ['pipe', 'pipe', 'pipe'],
});

const DRAFTS = ['examples/tcp.md', 'examples/tcp.en.md', 'examples/ste100.md'];
const out = mkdtempSync(join(tmpdir(), 'sam-smoke-'));
const fails = (input, args) => {
  try {
    run(args, input);
    return false;
  } catch {
    return true;
  }
};

try {
  for (const d of DRAFTS) {
    const page = join(out, `${d.split('/').pop().replace(/\.md$/, '')}.html`);
    const log = run(['render', d, '-o', page, '--no-open']);
    if (!log.includes('✓')) throw new Error(`${d} did not report success:\n${log}`);
    console.log(`✓ render ${d}`);
    run(['lint', d]);
    console.log(`✓ lint   ${d}`);
  }

  const doc = (body) => `---\ntitle: t\n---\n## 面板\n${body}\n`;

  // A planning leak must fail lint even with the STE check off: it is a content defect, not a style one.
  if (!fails(doc('正文写：过程≥3步，必须 flow。'), ['lint', '-', '--style', 'off'])) {
    throw new Error('lint --style off let a zh planning leak pass');
  }
  console.log('✓ leak fails lint with --style off (zh)');

  if (!fails(doc('This should be a sequence diagram for the handshake.'), ['lint', '-', '--style', 'off'])) {
    throw new Error('lint --style off let an en planning leak pass');
  }
  console.log('✓ leak fails lint with --style off (en)');

  if (!fails(doc('```limits\n适合度 | 8 / max 10 | 分\n```'), ['lint', '-'])) {
    throw new Error('lint let a subjective score through limits');
  }
  console.log('✓ subjective score rejected in limits');

  // A leak inside a graph label must be caught too: the label is reader-visible.
  if (!fails(doc('```flow\nA[必须用 sequence] -> B[结果]\n```'), ['lint', '-'])) {
    throw new Error('lint missed a leak inside a graph label');
  }
  console.log('✓ leak inside a graph label is caught');

  // A clean draft must stay quiet, and a page about sam itself may name the rules.
  run(['lint', '-', '--style', 'off'], doc('这是一段普通说明文字，没有泄漏。'));
  run(['lint', '-', '--style', 'off'], '---\ntitle: sam 的组件规则\nsam_meta: true\n---\n## 面板\n过程≥3步时必须 flow。\n');
  console.log('✓ clean draft quiet; sam_meta page exempt');

  console.log('\nsmoke ok');
} finally {
  rmSync(out, { recursive: true, force: true });
}