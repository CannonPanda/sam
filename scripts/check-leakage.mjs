#!/usr/bin/env node
/**
 * Detect Skill-planning leaks and limits semantic abuse in drafts/HTML.
 * Not a live model test — fixtures prove the checker catches known bad Lab patterns.
 *
 * Escape: frontmatter `sam_meta: true` (or title clearly about sam skill docs)
 * allows talking about component rules when the page IS about sam.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** High-confidence instruction-leak patterns (reader-visible body). */
const LEAK_PATTERNS = [
  { id: 'must-component', re: /必须\s*(flow|sequence|tree|timeline)\b/i, msg: '规划口令「必须 <组件>」泄漏' },
  { id: 'arrow-must', re: /→\s*必须\s*(flow|sequence|tree|timeline|用)/i, msg: '「→必须 …」选型口令泄漏' },
  { id: 'steps-ge3', re: /过程\s*[≥>=]\s*\s*3\s*步|[（(]≥\s*3\s*步[）)]/, msg: '触发条件「≥3步」泄漏' },
  { id: 'per-skill', re: /根据\s*Skill|按\s*Skill\s*要求|按本\s*Skill/i, msg: '「根据 Skill」元指令泄漏' },
  { id: 'info-shape', re: /信息形状是|信息结构是/, msg: '规划术语「信息形状/结构是」泄漏' },
  { id: 'forbid-text-only', re: /禁止只用(文字|段落|annot|callout)/, msg: '写作纪律口令泄漏' },
  { id: 'limits-vs-arch', re: /limits\s*比.*(图|架构)|比架构图合适/, msg: '选型独白泄漏' },
  { id: 'planning-steps', re: /写作前强制规划|判断信息形状后|必选 MUST 组件/, msg: '阶段 A 规划步骤泄漏' },
];

/** Subjective score rows inside ```limits — abuse of value/limit bars. */
const LIMITS_SCORE_RE = /```limits\s*([\s\S]*?)```/gi;
const SUBJECTIVE_UNIT = /\|[^|\n]*\/\s*(?:max\s+)?10\s*\|[^|\n]*分/;
const SUBJECTIVE_LABEL = /(适合度|推荐|评分|主观|分\)|\bscore\b)/i;

/** Generic install→config→run flow with no project-specific nouns. */
const GENERIC_FLOW_RE = /```flow\s*([\s\S]*?)```/gi;
const GENERIC_FLOW_HINT =
  /安装\s*->\s*配置[\s\S]*配置\s*->\s*运行|写\s*->\s*构建[\s\S]*构建\s*->\s*部署/;

function stripFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { fm: '', body: src };
  return { fm: m[1], body: m[2] };
}

function isSamMeta(fm, body, titleHint = '') {
  if (/^\s*sam_meta\s*:\s*true\s*$/m.test(fm)) return true;
  const title = (fm.match(/^\s*title\s*:\s*(.+)$/m)?.[1] || titleHint || '').trim();
  // Page about sam skill / component rules — legitimate to discuss MUST mapping.
  if (/^sam\b/i.test(title) && /组件|Skill|规则|MUST|规划/i.test(title + body.slice(0, 400))) return true;
  if (/sam\s*组件规则|讲解\s*sam|本\s*skill/i.test(title)) return true;
  return false;
}

function stripCodeFences(body) {
  // Keep fence language tags out of leak scan noise; still scan prose outside fences.
  return body.replace(/```[\s\S]*?```/g, '\n');
}

function checkLeakage(body, { allowMeta }) {
  const issues = [];
  if (allowMeta) return issues;
  const prose = stripCodeFences(body);
  for (const p of LEAK_PATTERNS) {
    if (p.re.test(prose)) issues.push({ kind: 'leak', id: p.id, msg: p.msg });
  }
  return issues;
}

function checkLimitsAbuse(body) {
  const issues = [];
  let m;
  const re = new RegExp(LIMITS_SCORE_RE.source, 'gi');
  while ((m = re.exec(body))) {
    const block = m[1];
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (SUBJECTIVE_UNIT.test(line) || (SUBJECTIVE_LABEL.test(line) && /\/\s*(?:max\s+)?\d+/.test(line))) {
        issues.push({
          kind: 'limits-abuse',
          id: 'subjective-score',
          msg: `limits 疑似主观分（无真实限额）: ${line.slice(0, 80)}`,
        });
      }
    }
  }
  return issues;
}

function checkGenericFlow(body, { expectGenericFlag }) {
  const issues = [];
  let m;
  const re = new RegExp(GENERIC_FLOW_RE.source, 'gi');
  while ((m = re.exec(body))) {
    const block = m[1];
    if (GENERIC_FLOW_HINT.test(block.replace(/\s+/g, ''))) {
      issues.push({
        kind: 'generic-flow',
        id: 'install-config-run',
        msg: '空泛安装/发布流（安装→配置→运行 或 写→构建→部署）',
      });
    }
  }
  // Heuristic only when caller asks (bad fixture suite).
  if (!expectGenericFlag) {
    return issues.filter((i) => i.kind !== 'generic-flow');
  }
  return issues;
}

function collectFiles(dir, acc = []) {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) collectFiles(p, acc);
    else if (/\.(md|html)$/.test(name)) acc.push(p);
  }
  return acc;
}

function analyzeFile(path, opts = {}) {
  const src = readFileSync(path, 'utf8');
  const { fm, body } = path.endsWith('.html')
    ? { fm: '', body: src.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '') }
    : stripFrontmatter(src);
  const allowMeta = isSamMeta(fm, body);
  const issues = [
    ...checkLeakage(body, { allowMeta }),
    ...checkLimitsAbuse(body),
    ...checkGenericFlow(body, { expectGenericFlag: opts.flagGeneric !== false }),
  ];
  return { path, allowMeta, issues };
}

// --- fixture expectations ---
const badDir = join(root, 'tests/leakage/bad');
const goodDir = join(root, 'tests/leakage/good');

let failed = 0;
const report = [];

function rel(p) {
  return relative(root, p);
}

for (const f of collectFiles(badDir).sort()) {
  const r = analyzeFile(f, { flagGeneric: true });
  const ok = r.issues.length > 0;
  if (!ok) {
    failed++;
    report.push(`✗ expected issues, got none: ${rel(f)}`);
  } else {
    report.push(`✓ bad caught ${rel(f)} (${r.issues.map((i) => i.id).join(', ')})`);
  }
}

for (const f of collectFiles(goodDir).sort()) {
  const r = analyzeFile(f, { flagGeneric: true });
  // good/plain and clean should have zero; sam-meta may mention MUST but allowMeta clears leaks
  const leaks = r.issues.filter((i) => i.kind === 'leak' || i.kind === 'limits-abuse');
  // generic-flow on good fixtures would also be a fail
  const bad = [...leaks, ...r.issues.filter((i) => i.kind === 'generic-flow')];
  if (bad.length) {
    failed++;
    report.push(`✗ unexpected issues in ${rel(f)}: ${bad.map((i) => i.msg).join('; ')}`);
  } else {
    report.push(`✓ good clean ${rel(f)}${r.allowMeta ? ' [sam_meta]' : ''}`);
  }
}

// Optional: scan Lab intros if present (informational + fail on known offenders if path exists)
const labIntros = join(root, '../k-station-lab/public/intros');
if (statSync(labIntros, { throwIfNoEntry: false })?.isDirectory()) {
  const knownOffenders = ['markitdown.html', 'hugo.html', 'threejs.html', 'anthropics-skills.html'];
  for (const name of knownOffenders) {
    const p = join(labIntros, name);
    if (!statSync(p, { throwIfNoEntry: false })) continue;
    const r = analyzeFile(p, { flagGeneric: false });
    // HTML from Lab: threejs has limits in HTML not md fence — add HTML limits heuristic
    let issues = r.issues;
    if (name === 'threejs.html') {
      const raw = readFileSync(p, 'utf8');
      if (/max 10\s*分|\/ max 10/.test(raw) && /am-limits/.test(raw)) {
        issues = [...issues, { kind: 'limits-abuse', id: 'subjective-score', msg: 'Lab threejs HTML limits 主观分' }];
      }
    }
    if (issues.length === 0) {
      // Lab may have been fixed later; warn but do not fail the sam package for external site drift
      report.push(`! Lab ${name}: no longer matches known offender patterns (ok if Lab regenerated)`);
    } else {
      report.push(`✓ Lab offender still detectable: ${name} (${issues.map((i) => i.id).join(', ')})`);
    }
  }
}

console.log(report.join('\n'));
if (failed) {
  console.error(`\nfailed ${failed}`);
  process.exit(1);
}
console.log(`\nleakage fixtures ok`);
