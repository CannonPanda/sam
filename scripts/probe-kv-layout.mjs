#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const outDir = process.argv[2];
const chromePath = process.argv[3];
const file = 'kv-doc-inline.html';
const mime = { '.html': 'text/html', '.css': 'text/css' };
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function loadPuppeteer() {
  try {
    return await import('puppeteer-core');
  } catch {
    console.log('installing puppeteer-core (no-save) for layout probe…');
    const inst = spawnSync('npm', ['install', '--no-save', 'puppeteer-core@24'], {
      encoding: 'utf8',
      cwd: root,
      timeout: 180000,
    });
    if (inst.status !== 0) {
      console.log(inst.stderr || inst.stdout);
      console.log('! puppeteer-core unavailable — layout metrics skipped');
      console.log('  Unverified: horizontal overflow / overlap at 360/768/1280 and narrow iframe');
      process.exit(0);
    }
    return await import(pathToFileURL(join(root, 'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')).href);
  }
}

const puppeteer = await loadPuppeteer();
const launch = puppeteer.launch || puppeteer.default?.launch;
if (!launch) {
  console.log('! puppeteer-core has no launch — layout metrics skipped');
  process.exit(0);
}

const server = createServer((req, res) => {
  const name = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\//, '') || file);
  try {
    const body = readFileSync(join(outDir, name));
    res.writeHead(200, { 'Content-Type': mime[extname(name)] || 'text/plain' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('no');
  }
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/${file}`;

const browser = await launch({
  executablePath: chromePath,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
let bad = 0;

async function measure(width, label) {
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  const result = await page.evaluate(() => {
    const hosts = [...document.querySelectorAll('.am-kv-host')];
    const issues = [];
    for (const host of hosts) {
      const hr = host.getBoundingClientRect();
      const cells = [...host.querySelectorAll('.am-kv-cell')];
      for (const cell of cells) {
        const r = cell.getBoundingClientRect();
        if (r.right > hr.right + 1.5) issues.push('cell overflow host');
      }
      for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
          const a = cells[i].getBoundingClientRect();
          const b = cells[j].getBoundingClientRect();
          const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          if (ox > 2 && oy > 2) issues.push('cell overlap');
        }
      }
    }
    const three = hosts.find((h) => h.querySelector('.am-kv[data-auto="3"]'));
    let cols3 = null;
    if (three && three.getBoundingClientRect().width >= 480) {
      const cells = [...three.querySelectorAll('.am-kv-cell')];
      if (cells.length >= 3) {
        const tops = cells.slice(0, 3).map((c) => Math.round(c.getBoundingClientRect().top));
        cols3 = tops[0] === tops[1] && tops[1] === tops[2];
      }
    }
    return { issues: [...new Set(issues)], cols3, hostCount: hosts.length };
  });
  const status = result.issues.length ? '✗' : '✓';
  console.log(`${status} layout ${label} (${width}px): hosts=${result.hostCount} issues=${result.issues.join(',') || 'none'} cols3=${result.cols3}`);
  if (result.issues.length) bad++;
  if (width >= 900 && result.cols3 === false) {
    console.log('✗ expected 3-col for data-auto=3 in wide container');
    bad++;
  }
}

for (const w of [360, 768, 1280]) await measure(w, 'viewport');

await page.setViewport({ width: 320, height: 700, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
const iframeIssues = await page.evaluate(() => {
  const issues = [];
  for (const host of document.querySelectorAll('.am-kv-host')) {
    const hr = host.getBoundingClientRect();
    for (const cell of host.querySelectorAll('.am-kv-cell')) {
      const r = cell.getBoundingClientRect();
      if (r.right > hr.right + 1.5) issues.push('overflow');
    }
  }
  return issues;
});
console.log(iframeIssues.length ? `✗ narrow iframe 320: ${iframeIssues}` : '✓ narrow iframe 320: no cell overflow');
if (iframeIssues.length) bad++;

await browser.close();
server.close();
process.exit(bad ? 1 : 0);
