// sam CLI: render / patch / video / lint / theme / list / help. main() takes injected streams and environment variables, for testing.

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { VERSION } from './assets.js';
import { join, resolve, dirname, basename, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { renderDoc, RenderError, LintError } from './render.js';
import { parseDoc, ParseError, CHOICES } from './parse.js';
import { lintDoc, formatWarning } from './lint/ste.js';
import { resolveLanguage } from './language.js';
import { COMPONENTS } from './components/index.js';
import { themeNames, loadThemes } from './themes/registry.js';
import { afterRender, clean, usage, mb, CLEAN } from './housekeeping.js';
import { runUpdateCheck } from './update.js';
import { amHome, readConfig, setConfig, resetConfig, configChoices, CONFIG_KEYS, ConfigError } from './config.js';
import { ensureHome } from './home.js';
import { loadMath } from './math-load.js';
import { replacePanel, PatchError } from './patch.js';
import { readState } from './state.js';
import { readPage } from './page.js';
import { readEmbeddedImages } from './images.js';
import { readEmbeddedCode, MAX_CODE_LINES, LONG_CODE_LINES } from './code.js';
import { runServe, serveLink, DEFAULT_PORT } from './serve.js';

const MAX_LISTED_WARNINGS = 20;

const USAGE = `sam ${VERSION} — Simple answer me with html (paper-only, no toolbar/runtime)

Usage:
  ssam render <file|->  [-o <path>] [--replace <page>] [--no-open] [--css-href <url>]
                       [--template sheet|doc] [--style off|80|strict] [--mode auto|light|dark]
  ssam patch  <html> --panel <title> [file|-] [--from file] [--no-open]
  ssam lint   <file|->  [--style off|80|strict]
  sam css    [-o paper.css]   write the shared paper stylesheet (for iframe <link>)
  ssam config [set <key> <value> | get <key> | reset [key]]
  ssam serve  [--port 8765] [--lan] [--public-url <origin>]
  ssam clean  [--days 30] [--all] [--dry-run]
  ssam list
  ssam help [component|format|code|image|patch]

- Theme is always paper. No toolbar, colophon, reply/remark, or Agent round-trip JS.
- `-` reads stdin (heredoc). Default output: ~/.sam/pages/ (SAM_HOME / AM_HOME overrides).
- STE warnings: fix draft and re-run with --replace <page>.
- --css-href emits <link rel="stylesheet"> instead of inlining CSS (pair with sam css).`;

const FORMAT = `Draft format (extended Markdown)

---
template: sheet        # sheet: blueprint board (default, multi-panel grid) | doc: linear explainer (one column + contents)
theme: paper           # sam is paper-only (other theme names are ignored)
title: Page title      # or use "# Title" as the first line of the body
subtitle: Subtitle     # optional
cols: 3                # number of sheet grid columns, default 3
style: 80              # STE check strictness: off | 80 (default, warn only) | strict (no page if it fails)
mode: auto             # auto follows the system | light | dark
source: asd-ste100.org # any other key shows in the page header meta line
---
Intro (optional, shown below the title)

## A Panel title {span=2 meta="top-right note"}
Plain Markdown: paragraphs, lists, tables, quotes, inline code...
Write ok / no / warn in a table cell (text may follow, e.g. "ok approved") to get a ✓ / ✗ / ! badge.

\`\`\`flow LR          ← fence language = component name, followed by component arguments
A -> B
\`\`\`

\`\`\`html             ← html / svg fences are embedded as-is (escape hatch)
<div>any content</div>
\`\`\`

- "## " starts a panel; the letter ID is optional (A, B, C... are assigned automatically). A capital letter and a space before a capitalized word is read as the ID: write "## B A Miss Goes Unseen" to keep the word "A". span is a hint: the page sizes panels to fit their content, so wide tables and diagrams need no span. Write span only for a panel that must stand out.
- An image on its own line, ![what it shows](path), becomes a captioned figure and is embedded in the page; see sam help image.
- Math in text: $x^2$ is inline; a block is a line with only $$, the TeX, and a line with only $$ (or one line: $$ E = mc^2 $$). Put a long formula in a block: a block scrolls
  inside its panel, and an inline formula may wrap after = or +. \\$ writes a dollar sign. The TeX is typeset when the page is made (Temml): no script, no network.
  $5 and $10 stay text (a closing $ has no space before it and no digit after it), and so does $PATH:$HOME (a closing $ with a letter or _ after it does not close; write $n$-th, not $n$th).
  Code, diagrams and video take no math. In a table cell write \\vert x \\vert, not |x|. \\ref, \\eqref and \\label are not supported (they give a warning; \\tag{1} works in a block).
  TeX that cannot be read stays as raw TeX in red, with a warning and its line: fix it and render again with --replace.
- A placeholder such as <host> is shown as text. Inside a sentence only text-level tags stay (b, i, kbd, sup, a, span, br, img ...), and tags that break the page (script, style, iframe ...) are shown as text too. Put raw markup in an html or svg fence and code in backticks.
- Any other fence language is a code block; \`\`\`ts src=path lines=18-30 quotes real code from a file; see sam help code.
- For the component list see sam list; for one component's syntax see sam help <component>.`;

const IMAGE_HELP = `Images: a screenshot, photo or render that already exists as a file

![What the picture shows](/absolute/path/to/screenshot.png)

- Put the image alone on its line; the alt text becomes its caption, so write what the picture shows (the STE check reads it).
- Use the absolute path. A relative path is read from the draft file's folder, or from the current folder when the draft comes from stdin. A space in the path is fine.
- PNG, JPG, GIF, WebP, AVIF and SVG files up to 5 MB. The file is embedded in the page, which stays one file that opens offline.
- http(s) URLs and data: URIs are left as they are. A URL needs the network when the page is opened.
- The page keeps the path of each image. sam patch embeds the image again from the file, or from the page when the file is gone.
- Images are for things a diagram cannot show, such as a real screen. Do not generate or invent images.`;

const CODE_HELP = `Code blocks: real code from a file, or code you type

\`\`\`ts src=server/routes.ts lines=18-30 hl=22
\`\`\`

\`\`\`ts title="limits.ts · sketch"
export const LIMIT = 50
\`\`\`

- A fence whose language is not a component is a code block. Each block gets a header and a Copy button.
- src= quotes a file: the CLI reads the lines, so you do not type them, and the code is the real code. Leave the block empty.
  The path is read from the current folder, and only files inside it are quoted. lines=18-30 (or lines=18) picks the lines; without it the whole file is quoted.
- The header shows path:lines, or title= when you set it. Write "sketch" in the title of code that does not exist yet.
- hl=22 or hl=20-22,25 highlights lines by their shown number. start=38 numbers a typed block from 38.
- A diff: a fence with the language diff holds a unified diff you paste, and the CLI draws it (see below).
- 10 to ${LONG_CODE_LINES} lines make the point best: a longer block gets a warning, and more than ${MAX_CODE_LINES} lines is an error.
- Files that hold keys by convention (.env, *.pem, id_rsa, .ssh/, .git/ …) and files with anything that looks like a key or a token are refused.
- The render lists every embedded file. The page keeps the path; sam patch reads the file again, or keeps the page's copy when the file has moved.

Diff blocks: show a change

\`\`\`diff file=src/code.js
@@ -60,3 +60,3 @@
 export function parseCodeArgs(args) {
-  const attrs = parseAttrs(args);
+  const attrs = parseAttrs(args, { diff: true });
   const opts = {};
\`\`\`

- Paste the unified diff. Each line starts with + (added, green), - (removed, red) or a space (context); a line with nothing on it counts as context.
- @@ -60,3 +60,3 @@ starts a hunk: the CLI shows it as a thin row and numbers the lines from it, with two gutters, old and new. Without @@, start=N numbers from N; with neither, the block has no numbers.
- file= names the file in the header, and the language label comes from its extension. A +++ b/path line names it when file= is missing; title= wins over both.
- The header shows a stat after the title: +1 −1. Copy copies the diff as written.
- hl= uses new-side numbers and needs numbers (@@ or start=).
- diff --git, index, ---, +++ and "\\ No newline at end of file" lines are accepted and not drawn.
- Cut lines (a line with only ... or …) are an error: the gutter cannot know how many lines were skipped. Split the diff into two hunks, each with its own @@ header.
- A hunk whose line counts do not match its @@ header is a warning. src= is not supported for a diff yet: paste the diff.
- The limits are the same as for other code blocks: a warning above ${LONG_CODE_LINES} lines, an error above ${MAX_CODE_LINES}, and the key and token check.`;

const RAW_HELP = `LANG — embed as-is (escape hatch)

When the fence language is LANG, the content goes into the page unprocessed. Use it only when no component can show the content;
use theme variables for colors (such as var(--ink), var(--accent)) so the content stays readable across themes and light/dark modes.

Example:
\`\`\`LANG
<div style="color: var(--accent)">any content</div>
\`\`\``;


export async function main(argv, io = {}) {
  const out = io.stdout ?? process.stdout;
  const err = io.stderr ?? process.stderr;
  const env = io.env ?? process.env;
  const print = (s = '') => out.write(`${s}\n`);
  const fail = (s) => err.write(`${s}\n`);

  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        out: { type: 'string', short: 'o' },
        replace: { type: 'string' },
        'css-href': { type: 'string' },
        'no-open': { type: 'boolean' },
        open: { type: 'boolean' },
        theme: { type: 'string' },
        template: { type: 'string' },
        style: { type: 'string' },
        mode: { type: 'string' },
        voice: { type: 'string' },
        mp4: { type: 'boolean' },
        webm: { type: 'boolean' },
        panel: { type: 'string' },
        from: { type: 'string' },
        days: { type: 'string' },
        port: { type: 'string' },
        lan: { type: 'boolean' },
        'public-url': { type: 'string' },
        all: { type: 'boolean' },
        'dry-run': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    });
  } catch (e) {
    fail(`✗ ${e.message}\n\n${USAGE}`);
    return 2;
  }
  const { values: opts, positionals: [cmd, arg, ...rest] } = parsed;

  if (opts.version) return print(VERSION), 0;
  if (opts.help || !cmd) return print(USAGE), 0;

  // The built-in themes plus the user's theme files, read once per command.
  const themes = loadThemes(amHome(env));
  const ctx = { print, fail, env, io, themes };
  switch (cmd) {
    case 'render': return withSource(arg, io, fail, (src, baseDir) => cmdRender(src, opts, ctx, baseDir));
    case 'patch': return cmdPatch(arg, rest[0], opts, ctx);
    case 'lint': return withSource(arg, io, fail, (src) => cmdLint(src, opts, { print, fail }));
    case 'config': return cmdConfig([arg, ...rest].filter((x) => x !== undefined), ctx);
    case 'css': return cmdCss(opts, ctx);
    case 'clean': return cmdClean(opts, { print, fail, env });
    case 'serve': return cmdServe(opts, { print, fail, env });
    case '__update-check': return (await runUpdateCheck(amHome(env))) ? 0 : 1;
    case 'list': return cmdList(ctx), 0;
    case 'help': return cmdHelp(arg, { print, fail });
    default:
      fail(`✗ Unknown command "${cmd}"\n\n${USAGE}`);
      return 2;
  }
}

async function withSource(arg, io, fail, fn) {
  if (!arg) {
    fail('✗ Missing the draft argument: pass a file path, or - to read from stdin');
    return 2;
  }
  const cwd = io.cwd ?? process.cwd();
  let src;
  try {
    src = arg === '-' ? await readStream(io.stdin ?? process.stdin) : readFileSync(resolve(cwd, arg), 'utf8');
  } catch (e) {
    fail(`✗ Cannot read the draft: ${e.message}`);
    return 2;
  }
  if (!src.trim()) {
    fail('✗ The draft is empty');
    return 2;
  }
  // Relative image paths are read from the draft file's folder, or from the current folder for a draft on stdin.
  return fn(src, arg === '-' ? cwd : dirname(resolve(cwd, arg)));
}

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// Whether to open automatically: --open forces it > --no-open > AM_NO_OPEN (not 0) > CI environment > config open.
export function shouldOpen(opts, env, config) {
  if (opts.open) return true;
  if (opts['no-open']) return false;
  if (env.AM_NO_OPEN && env.AM_NO_OPEN !== '0') return false;
  if (env.CI) return false;
  return config.open !== false;
}

async function cmdRender(src, opts, ctx, baseDir) {
  const { fail, print } = ctx;
  const replaced = opts.replace === undefined ? null : pagePath(opts.replace, ctx);
  if (replaced === false) {
    fail(`✗ --replace takes a page that sam render wrote (a .html file in ${join(amHome(ctx.env), 'pages')})`);
    return 2;
  }
  const config = loadConfig(ctx);
  const { theme, mode, style } = config.values;
  await loadMath(src);
  let result;
  try {
    result = renderDoc(src, { theme: 'paper', template: opts.template, style: opts.style, mode: opts.mode }, { theme: 'paper', mode, style }, { themes: ctx.themes, baseDir, codeDir: ctx.io.cwd ?? process.cwd(), cssHref: opts['css-href'] });
  } catch (e) {
    return reportError(e, fail);
  }
  const file = outputPath('pages', result.meta.title, opts, ctx);
  emit(result, file, ctx);
  // Delete the earlier attempt only now: a render that fails above keeps it.
  if (replaced && replaced !== resolve(file)) rmSync(replaced, { force: true });
  // A page with STE, code or math warnings is likely to be rendered again, so it opens only when --open asks for it.
  const held = !opts.open && hasRetryWarnings(result) && shouldOpen(opts, ctx.env, config.values);
  if (held) print(`  Not opened because of the warnings; to render again, add --replace ${file}`);
  return finish(file, held ? { ...opts, 'no-open': true } : opts, config, ctx);
}


const hasRetryWarnings = (result) => result.warnings.length > 0 || (result.stats.codeWarnings ?? []).length > 0 || (result.stats.mathWarnings ?? []).length > 0;

// The absolute path of a page, or false when arg does not name a .html file directly inside pages/. The file may be gone.
function pagePath(arg, { env, io }) {
  const path = resolve(io.cwd ?? process.cwd(), arg);
  return dirname(path) === resolve(amHome(env), 'pages') && basename(path).endsWith('.html') ? path : false;
}

const PATCH_HELP = `Replace one panel of a rendered page in place

Usage:
  sam patch <html-file> --panel <title> < new-panel.md
  sam patch <html-file> --panel <title> --from new-panel.md
  sam patch <html-file> --panel <title> -

- Reads the source draft from the hidden <textarea id="am-source"> in <html-file>.
- --panel matches a ## section's title, its letter ID, or "ID title".
- The new draft comes from stdin or from --from / a second file argument: it may include the ## heading or only the panel body.
- Renders again with the current renderer and overwrites the same HTML path; it writes no new timestamped file.
- Keeps the page's template, theme, light/dark mode and STE style (recorded on the page's root tag when it was made). Later config changes do not apply to patched pages; to change them add --theme / --mode / --style.
- If the panel is not found, or the page has no #am-source, the exit code is non-zero and the file is not changed.`;


async function cmdPatch(htmlArg, fromArg, opts, ctx) {
  const { fail, io } = ctx;
  if (!htmlArg || htmlArg === '-') {
    fail(htmlArg ? '✗ patch needs the path of an existing HTML file; it cannot read the page from stdin' : '✗ Missing the HTML file path');
    return 2;
  }
  if (!opts.panel || !String(opts.panel).trim()) {
    fail('✗ Missing --panel <title>');
    return 2;
  }
  const cwd = io.cwd ?? process.cwd();
  const file = resolve(cwd, htmlArg);
  let html;
  try {
    html = readFileSync(file, 'utf8');
  } catch (e) {
    fail(`✗ Cannot read the HTML: ${e.message}`);
    return 2;
  }
  const page = readPage(html);
  let source = page.source;
  if (source == null) {
    fail('✗ The page has no #am-source; re-render with sam, or pass the full draft via a future --draft (sam keeps a hidden source for patch)');
    return 1;
  }
  const from = opts.from ?? fromArg;
  let replacement;
  try {
    replacement = !from || from === '-' ? await readStream(io.stdin ?? process.stdin) : readFileSync(resolve(cwd, from), 'utf8');
  } catch (e) {
    fail(`✗ Cannot read the new panel draft: ${e.message}`);
    return 2;
  }
  let patched;
  try {
    patched = replacePanel(source, opts.panel, replacement);
  } catch (e) {
    if (!(e instanceof PatchError)) return reportError(e, fail);
    fail(`✗ ${e.message}`);
    return 1;
  }
  const config = loadConfig(ctx);
  const { mode, style } = config.values;
  const overrides = {
    template: opts.template ?? page.template,
    theme: 'paper',
    mode: opts.mode ?? page.mode,
    style: opts.style ?? page.style,
  };
  await loadMath(patched);
  let result;
  try {
    result = renderDoc(patched, overrides, { theme: 'paper', mode, style }, {
      themes: ctx.themes,
      previousLanguage: page.lang,
      baseDir: cwd,
      codeDir: cwd,
      knownImages: readEmbeddedImages(html),
      knownCode: readEmbeddedCode(html),
      cssHref: opts['css-href'],
    });
  } catch (e) {
    return reportError(e, fail);
  }
  emit(result, file, ctx);
  return finish(file, opts, config, ctx);
}

function loadConfig({ fail, env, themes }) {
  themeWarnings({ fail, themes });
  const config = readConfig(env, themes);
  if (config.warning) fail(`! ${config.warning}`);
  return config;
}

// Theme files that were skipped, once per command.
function themeWarnings({ fail, themes }) {
  themes.warnings.forEach((w) => fail(`! ${w}`));
}

// Output path: the -o path when given, otherwise pages/ or videos/ in the data directory. io.now can inject a clock.
function outputPath(dir, title, opts, { env, io }) {
  if (opts.out) return resolve(io.cwd ?? process.cwd(), opts.out);
  return join(amHome(env), dir, `${slug(title)}-${stamp(new Date(io.now?.() ?? Date.now()))}.html`);
}

// Write a page. A page inside the data directory makes it private first; a page saved elsewhere (-o) leaves its folder alone.
function writePage(file, html, env) {
  const home = resolve(amHome(env));
  if (resolve(file).startsWith(home + sep)) ensureHome(home);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// Write the page, print the path, a one-line summary (note follows the summary) and writing warnings. Shared by render / video / patch.
function emit(result, file, { print, env }, note = '') {
  writePage(file, result.html, env);
  print(`✓ ${file}`);
  // With sam serve running, a page inside the data directory also gets an http link.
  const link = serveLink(amHome(env), file);
  if (link) print(`  link: ${link}`);
  print(`  ${summaryLine(result)}${note}`);
  // The code the page now holds, so the user can check it before sharing the page.
  if (result.stats.code?.length) print(`  code embedded from: ${result.stats.code.join(', ')}`);
  const long = result.stats.codeWarnings ?? [];
  if (long.length) {
    print(`  code ${count(long.length, 'warning')} (trim the block and run again, or keep it if every line matters):`);
    long.forEach((w) => print(`  L${w.line} [${w.rule}] ${w.message}`));
  }
  printComponentWarnings(result.stats.componentWarnings, print);
  printHtmlWarnings(result.stats.htmlWarnings, print);
  printMathWarnings(result.stats.mathWarnings, print);
  printWarnings(result.warnings, print, result.meta.style);
}

// What a component noticed in its own block (a group box that would be empty after a change). The page is still written.
function printComponentWarnings(notes = [], print) {
  if (!notes.length) return;
  print(`  diagram ${count(notes.length, 'warning')} (the page is written; fix the draft if that is not what you meant):`);
  notes.toSorted((a, b) => a.line - b.line).slice(0, MAX_LISTED_WARNINGS).forEach((w) => print(`  L${w.line} [${w.component}] ${w.message}`));
  if (notes.length > MAX_LISTED_WARNINGS) print(`  … ${notes.length - MAX_LISTED_WARNINGS} more`);
}

// Raw HTML the render changed (a placeholder shown as text, a tag or attribute removed). Not STE warnings: they never fail style: strict.
function printHtmlWarnings(notes = [], print) {
  const lines = [...new Set(notes.toSorted((a, b) => a.line - b.line).map((w) => `L${w.line} [html] ${w.message}`))];
  if (!lines.length) return;
  print(`  html ${count(lines.length, 'warning')} (the page differs from the draft here; fix the draft if that is not what you meant):`);
  lines.slice(0, MAX_LISTED_WARNINGS).forEach((l) => print(`  ${l}`));
  if (lines.length > MAX_LISTED_WARNINGS) print(`  … ${lines.length - MAX_LISTED_WARNINGS} more`);
}

// A formula Temml could not read (shown as raw TeX) or one that uses \ref, \eqref or \label. The page is written, but it is not what the draft meant, so it does not open.
function printMathWarnings(notes = [], print) {
  if (!notes.length) return;
  print(`  math ${count(notes.length, 'warning')} (the page is written; fix the TeX and render again):`);
  notes.toSorted((a, b) => a.line - b.line).slice(0, MAX_LISTED_WARNINGS).forEach((w) => print(`  L${w.line} [math] ${w.message}`));
  if (notes.length > MAX_LISTED_WARNINGS) print(`  … ${notes.length - MAX_LISTED_WARNINGS} more`);
}

function summaryLine(result) {
  const { meta, stats } = result;
  if (result.beats !== undefined) {
    return `video · ${meta.theme} · ${count(stats.panels, 'scene')} · ${count(result.beats, 'beat')} · ${result.duration.toFixed(1)}s · voice: ${result.voiceName}`;
  }
  const comps = Object.entries(stats.components).map(([k, v]) => `${k}×${v}`).join(' ');
  return `${meta.template} · ${meta.theme} · ${count(stats.panels, 'panel')}${comps ? ` · ${comps}` : ''}`;
}

// "1 file", "2 files".
const count = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

// Wrap-up after a successful render: print maintenance notices, open the browser per config. io.open can inject the opener.
function finish(file, opts, config, ctx) {
  printHints(config, ctx);
  if (shouldOpen(opts, ctx.env, config.values)) (ctx.io.open ?? openFile)(file);
  return 0;
}

// Notices attached after a successful render (cleanup, update), for the Agent, which asks the user.
function printHints(config, { env, io, print }) {
  try {
    const hints = afterRender({
      home: amHome(env), env, config: config.values, current: VERSION,
      scriptPath: io.scriptPath, background: Boolean(io.background),
    });
    hints.forEach((h) => print(h));
  } catch {
    // A maintenance-notice error does not affect the render result.
  }
}

function cmdClean(opts, { print, fail, env }) {
  if (opts.days !== undefined && !/^\d+$/.test(opts.days.trim())) {
    fail('✗ --days needs a non-negative integer');
    return 2;
  }
  const days = opts.days === undefined ? CLEAN.days : Number(opts.days);
  const home = amHome(env);
  const before = usage(home);
  const dry = Boolean(opts['dry-run']);
  const r = clean(home, { days, all: Boolean(opts.all), dryRun: dry });
  const scope = opts.all ? 'all pages and videos' : `pages and videos older than ${count(days, 'day')}`;
  print(`Data directory: ${home} (${mb(before.total)} in total: ${count(before.pages.count, 'page')}, ${count(before.videos.count, 'video')}, ${mb(before.cache.bytes)} voice-over cache)`);
  print(dry
    ? `Would delete ${count(r.files, 'file')}, freeing ${mb(r.bytes)} (${scope} + voice-over cache). Run without --dry-run to delete.`
    : `✓ Deleted ${count(r.files, 'file')}, freeing ${mb(r.bytes)} (${scope} + voice-over cache). Settings were kept.`);
  return 0;
}

function cmdServe(opts, { print, fail, env }) {
  if (opts.port !== undefined && !(/^\d+$/.test(opts.port.trim()) && Number(opts.port) <= 65535)) {
    fail('✗ --port needs a number from 0 to 65535 (0 picks a free port)');
    return 2;
  }
  const port = opts.port === undefined ? DEFAULT_PORT : Number(opts.port);
  return runServe({ home: amHome(env), port, lan: !!opts.lan, publicUrl: opts['public-url'], print, fail });
}

function cmdLint(src, opts, { print, fail }) {
  let doc;
  try {
    doc = parseDoc(src);
  } catch (e) {
    return reportError(e, fail);
  }
  const style = opts.style ?? doc.meta.style;
  if (!CHOICES.style.includes(style)) {
    fail(`✗ Invalid style value "${style}". Choose one of: ${CHOICES.style.join(' | ')}`);
    return 2;
  }
  // The language decides the rule family, exactly as it does in render and video: a draft whose language has no rules of
  // its own must be measured with the language-neutral ones, and must not get the Chinese or English rules.
  const language = resolveLanguage({ declared: doc.meta.lang, text: src });
  const warnings = style === 'off' ? [] : lintDoc(doc, language);
  printWarnings(warnings, print, style);
  return style === 'strict' && warnings.length ? 1 : 0;
}

function printWarnings(warnings, print, style) {
  if (style === 'off') return print('  STE check is off');
  if (!warnings.length) return print('  STE ✓ 0 warnings');
  print(`  STE ${count(warnings.length, 'warning')} (fix the draft and run again):`);
  warnings.slice(0, MAX_LISTED_WARNINGS).forEach((w) => print(`  ${formatWarning(w)}`));
  if (warnings.length > MAX_LISTED_WARNINGS) print(`  … ${warnings.length - MAX_LISTED_WARNINGS} more; run sam lint to see all`);
}

function reportError(e, fail) {
  if (e instanceof RenderError) {
    fail(`✗ L${e.line} [${e.component}] ${e.message}`);
    if (e.example) fail(`  Correct example:\n${e.example.replace(/^/gm, '    ')}`);
    fail(`  Full syntax: sam help ${e.component}`);
    return 1;
  }
  if (e instanceof ParseError) {
    fail(`✗ ${e.line ? `L${e.line} ` : ''}Cannot parse the draft: ${e.message}`);
    return 1;
  }
  if (e instanceof LintError) {
    fail(`✗ ${e.message}; no page was written:`);
    e.warnings.forEach((w) => fail(`  ${formatWarning(w)}`));
    return 1;
  }
  throw e;
}

const showValue = (v) => (typeof v === 'boolean' ? (v ? 'on' : 'off') : String(v));

function cmdConfig(args, { print, fail, env, themes }) {
  const [action, key, value] = args;
  try {
    if (action === 'set') {
      if (key === undefined || value === undefined) throw new ConfigError('Usage: sam config set <key> <value>');
      print(`✓ ${key} = ${showValue(setConfig(key, value, env, themes))}`);
      return 0;
    }
    if (action === 'get') {
      if (!CONFIG_KEYS[key]) throw new ConfigError(`No setting named "${key}". Available: ${Object.keys(CONFIG_KEYS).join(' | ')}`);
      print(showValue(readConfig(env, themes).values[key]));
      return 0;
    }
    if (action === 'reset') {
      resetConfig(key, env);
      print(key ? `✓ ${key} reset to default` : '✓ All settings reset to default');
      return 0;
    }
    if (action !== undefined) throw new ConfigError(`Unknown action "${action}". Usage: sam config [set <key> <value> | get <key> | reset [key]]`);
  } catch (e) {
    if (!(e instanceof ConfigError)) throw e;
    fail(`✗ ${e.message}`);
    return 2;
  }
  themeWarnings({ fail, themes });
  const { values, stored, warning, path } = readConfig(env, themes);
  if (warning) fail(`! ${warning}`);
  print(`Config file: ${path}`);
  for (const [k, spec] of Object.entries(CONFIG_KEYS)) {
    const mark = k in stored ? '*' : ' ';
    const options = spec.type === 'bool' ? 'on | off' : configChoices(k, themes).join(' | ');
    print(`${mark} ${k.padEnd(13)}${showValue(values[k]).padEnd(10)}${spec.label} (${options})`);
  }
  if (env.AM_NO_OPEN && env.AM_NO_OPEN !== '0') print('Note: the AM_NO_OPEN environment variable is set and overrides the open setting.');
  print('* marks a value you changed. Change: sam config set <key> <value>; reset to default: sam config reset [key]');
  return 0;
}

function cmdList({ print, fail, themes }) {
  themeWarnings({ fail, themes });
  print('Templates (template):');
  print('  sheet   blueprint board: a grid of letter-numbered panels, for a one-screen overview (default)');
  print('  doc     linear explainer: one-column reading, with contents when there are 3+ panels');
  print('\nThemes (theme):');
  for (const th of themes.list('page')) print(`  ${th.name.padEnd(10)}${th.summary}`);
  print('\nComponents (fence language):');
  for (const c of COMPONENTS.values()) print(`  ${c.name.padEnd(10)}${c.summary}`);
  print('  html/svg  embed as-is (escape hatch)');
  print('  <other>   code block; src=path lines=a-b quotes a file (sam help code)');
  print('\nSyntax: sam help <component>; draft format: sam help format');
}

async function cmdCss(opts, { print, env, io }) {
  const { paperStylesheet } = await import('./themes/index.js');
  const file = opts.out
    ? resolve(io.cwd ?? process.cwd(), opts.out)
    : join(amHome(env), 'paper.css');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, paperStylesheet());
  print(`✓ ${file}`);
  return 0;
}


function cmdHelp(name, { print, fail }) {
  if (!name) return print(USAGE), 0;
  if (name === 'format') return print(FORMAT), 0;
  if (name === 'image') return print(IMAGE_HELP), 0;
  if (name === 'code') return print(CODE_HELP), 0;
  if (name === 'patch') return print(PATCH_HELP), 0;
  if (name === 'html' || name === 'svg') return print(RAW_HELP.replace(/LANG/g, name)), 0;
  const comp = COMPONENTS.get(name);
  if (!comp) {
    fail(`✗ No component named "${name}". Available: ${[...COMPONENTS.keys()].join(', ')}, html, svg, format, code, image, patch`);
    return 2;
  }
  print(`${comp.name} — ${comp.summary}\n\n${comp.syntax}\n\nExample:\n${comp.example}`);
  return 0;
}

function slug(title) {
  const s = String(title || 'page').trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return s || 'page';
}

function stamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function openFile(file) {
  const [cmd, args] = process.platform === 'darwin' ? ['open', [file]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', file]]
      : ['xdg-open', [file]];
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).on('error', () => {}).unref();
  } catch {
    // Failing to open the browser does not affect the output; the path is already printed.
  }
}
