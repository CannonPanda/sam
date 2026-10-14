// Draft → single-file HTML. Pipeline: parse → STE lint → render panels → template → CSS (inline or external paper.css).
// sam: paper only, no toolbar / runtime / colophon / source / lightbox / update notice.

import { parseDoc, ParseError, applyOverrides, CHOICES } from './parse.js';
import { md, collectHtmlNotes } from './markdown.js';
import { COMPONENTS, RAW_LANGS, ComponentError } from './components/index.js';
import { TEMPLATES } from './templates/index.js';
import { pageCss, featureCss } from './themes/index.js';
import { BUILTIN, AUTO, pickTheme } from './themes/registry.js';
import { lintDoc } from './lint/ste.js';
import { esc } from './svg/text.js';
import { VERSION } from './assets.js';
import { rootTag, sourceTag } from './page.js';
import { resolveLanguage } from './language.js';
import { inlineImages, ImageError, IMAGE_EXAMPLE } from './images.js';
import { renderCode, CodeError } from './code.js';
import { isolateLtrRuns } from './bidi.js';
import { hasMath } from './math.js';

export class RenderError extends Error {
  constructor(message, { line, component, example } = {}) {
    super(message);
    this.name = 'RenderError';
    this.line = line;
    this.component = component;
    this.example = example;
  }
}

export class LintError extends Error {
  constructor(warnings) {
    super(`STE check failed (style: strict): ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`);
    this.name = 'LintError';
    this.warnings = warnings;
  }
}

// cssHref: when set, emit <link rel="stylesheet" href="…"> instead of inlining CSS (iframe-friendly cache).
export function renderDoc(source, overrides = {}, defaults = {}, { themes = BUILTIN, previousLanguage, baseDir, codeDir, knownImages, knownCode, cssHref, embedSource = true } = {}) {
  const choices = { theme: themes.choices('page') };
  const parsed = parseDoc(source, { defaults, choices });
  const metaIn = applyOverrides(parsed.meta, overrides, { ...CHOICES, ...choices });
  if (metaIn.template === 'video') throw new ParseError('sam does not support template: video (use answer-me-with-html for videos)', 0);
  // Force paper. auto / blueprint / shadcn / 3b1b → paper.
  const forcedTheme = 'paper';
  const problem = themes.problem(forcedTheme, 'page');
  if (problem) throw new ParseError(problem, 0);
  void pickTheme;
  void AUTO;
  const doc = { ...parsed, meta: { ...metaIn, theme: forcedTheme } };

  const language = resolveLanguage({ declared: doc.meta.lang, previous: previousLanguage, text: source });
  const warnings = doc.meta.style === 'off' ? [] : lintDoc(doc, language);
  if (doc.meta.style === 'strict' && warnings.length) throw new LintError(warnings);

  const stats = { panels: doc.panels.length, components: {}, code: [], codeWarnings: [], componentWarnings: [], htmlWarnings: [], mathWarnings: [] };
  const ui = language.ui;
  const ctx = { seq: 0, stats, ui, dir: language.dir, images: { baseDir, known: knownImages }, code: { baseDir: codeDir, known: knownCode } };
  const loose = doc.intro.find((b) => b.type === 'fence' && COMPONENTS.get(b.lang)?.panelOnly);
  if (loose) throw new RenderError(`${loose.lang} belongs in a panel: put it under the ## heading of the panel the answer changes`, { line: loose.line, component: loose.lang, example: COMPONENTS.get(loose.lang).example });
  const introHtml = renderBlocks(doc.intro, ctx);
  const panels = doc.panels.map((p) => ({ ...p, html: renderBlocks(p.blocks, ctx) }));
  const page = TEMPLATES[doc.meta.template]({ meta: doc.meta, introHtml, panels, ui, language });
  const body = language.dir === 'rtl' ? isolateLtrRuns(page) : page;
  const html = shell({ meta: doc.meta, language, body, source: embedSource ? source : '', cssHref });
  return { html, warnings, stats, meta: doc.meta, language };
}

function hasVisuals({ intro, panels }) {
  return [...intro, ...panels.flatMap((p) => p.blocks)].some((b) => b.type === 'fence' && (COMPONENTS.has(b.lang) || RAW_LANGS.has(b.lang)));
}
void hasVisuals;

export function renderBlocks(blocks, ctx) {
  return blocks.map((b) => {
    const { result, notes } = collectHtmlNotes(() => (b.type === 'md' ? `<div class="am-md">${md(b.text)}</div>` : renderFence(b, ctx)), { math: !ctx.video });
    noteHtml(b, notes.filter((n) => !n.math), ctx);
    noteMath(b, notes.filter((n) => n.math), ctx);
    return embedImages(b, result, ctx);
  }).join('\n');
}

function noteHtml(block, notes, ctx) {
  if (!notes.length || !ctx.stats.htmlWarnings) return;
  const lines = block.text.split('\n');
  const first = block.type === 'md' ? block.line : block.line + 1;
  const used = new Map();
  for (const { at, message } of notes) {
    const tag = at.split('\n')[0];
    const places = lines.flatMap((l, i) => Array(l.split(tag).length - 1).fill(i));
    const n = used.get(tag) ?? 0;
    used.set(tag, n + 1);
    ctx.stats.htmlWarnings.push({ line: first + (places[Math.min(n, places.length - 1)] ?? 0), message });
  }
}

function noteMath(block, notes, ctx) {
  if (!notes.length || !ctx.stats.mathWarnings) return;
  const first = block.type === 'md' ? block.line : block.line + 1;
  const next = new Map();
  for (const { at, message } of notes) {
    const index = block.text.indexOf(at, next.get(at) ?? 0);
    next.set(at, index + 1);
    ctx.stats.mathWarnings.push({ line: first + (index < 0 ? 0 : block.text.slice(0, index).split('\n').length - 1), message });
  }
}

const MARKDOWN_FENCES = new Set(['callout', 'kv', 'tree', 'timeline']);

function embedImages(block, html, ctx) {
  try {
    return inlineImages(html, { ...ctx.images, checkText: block.type === 'md' || MARKDOWN_FENCES.has(block.lang) });
  } catch (err) {
    if (!(err instanceof ImageError)) throw err;
    const idx = block.text.split('\n').findIndex((l) => l.includes(err.ref) || l.includes(encodeURI(err.ref)));
    const first = block.type === 'md' ? block.line : block.line + 1;
    throw new RenderError(err.message, { line: first + Math.max(idx, 0), component: 'image', example: IMAGE_EXAMPLE });
  }
}

const RAW_RISKY = /<\s*(script|iframe|object|embed|form)\b/i;

function renderFence(block, ctx) {
  const { lang, args, text, line } = block;
  if (RAW_LANGS.has(lang)) {
    if (RAW_RISKY.test(text) && ctx.stats.htmlWarnings) {
      ctx.stats.htmlWarnings.push({
        line,
        message: `${lang} fence embeds markup as-is (includes <script>/<iframe>/…); only use trusted author content`,
      });
    }
    return text;
  }
  const comp = COMPONENTS.get(lang);
  if (!comp) return codeBlock(block, ctx);
  if (comp.pageOnly && ctx.video) throw new RenderError(`${lang} works on a page only; a video cannot take answers`, { line, component: lang, example: comp.example });
  ctx.stats.components[lang] = (ctx.stats.components[lang] ?? 0) + 1;
  try {
    const warn = ({ line: at = 0, message }) => ctx.stats.componentWarnings?.push({ line: line + at, component: lang, message });
    return comp.render(text, { args, uid: () => `am${++ctx.seq}`, ui: ctx.ui, dir: ctx.dir ?? 'ltr', video: ctx.video, warn });
  } catch (err) {
    if (!(err instanceof ComponentError)) throw err;
    throw new RenderError(err.message, {
      line: line + (err.line || 0),
      component: lang,
      example: comp.example,
    });
  }
}

function codeBlock(block, ctx) {
  try {
    const { html, file, warnings } = renderCode(block, { ...ctx.code, ui: ctx.ui, copy: false });
    if (file && ctx.stats.code) ctx.stats.code.push(file);
    if (ctx.stats.codeWarnings) ctx.stats.codeWarnings.push(...warnings.map((w) => ({ line: block.line, ...w })));
    return html;
  } catch (err) {
    if (!(err instanceof CodeError)) throw err;
    throw new RenderError(err.message, { line: block.line + err.line, component: 'code', example: err.example });
  }
}

export function timestamp(d = new Date(), order = 'ymd') {
  const p = (n) => String(n).padStart(2, '0');
  const time = `${p(d.getHours())}:${p(d.getMinutes())}`;
  if (order === 'dmy') return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} ${time}`;
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${time}`;
}

export const hasDelta = (html) => html.includes('class="am-delta-bar"');

// Kept for callers that strip update notices from old am pages; sam never emits them.
export function withoutUpdateNotice(html) {
  return html;
}

function shell({ meta, language, body, source, cssHref }) {
  const root = { lang: language.htmlLang, dir: language.dir, theme: 'paper', mode: meta.mode, style: meta.style };
  const cssOpts = {
    diff: body.includes('class="am-codeblock am-codeblock--diff"'),
    delta: hasDelta(body),
    rtl: language.dir === 'rtl',
    math: hasMath(body),
  };
  // External paper.css is the lean display base; feature CSS (math/diff/delta/rtl) is inlined when needed.
  const cssBlock = cssHref
    ? `<link rel="stylesheet" href="${esc(cssHref)}">${(() => {
      const extra = featureCss(cssOpts);
      return extra ? `
<style>
${extra}
</style>` : '';
    })()}`
    : `<style>
${pageCss(BUILTIN.embedFor('paper', 'page'), cssOpts)}
</style>`;
  return `<!doctype html>
${rootTag(root)}
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="sam ${VERSION}">
<title>${esc(meta.title || 'sam')}</title>
${cssBlock}
</head>
<body>
${body}
${source ? sourceTag(source) : ''}
</body>
</html>
`;
}
