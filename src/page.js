// Page envelope: settings on the root tag. sam pages have no embedded source draft / audio.
import { esc } from './svg/text.js';

const SOURCE_OPEN = '<textarea id="am-source"';
const SOURCE_RE = new RegExp(`^${SOURCE_OPEN}[^>]*>([\\s\\S]*?)<\\/textarea>`);

export function rootTag({ lang, dir, theme, mode, style }) {
  return `<html lang="${lang}"${dir === 'rtl' ? ' dir="rtl"' : ''} data-theme="${esc(theme)}" data-mode="${esc(mode)}" data-style="${esc(style)}">`;
}

export function rootCarrierAttrs() { return ''; }
export function sourceTag(source) {
  return `<textarea id="am-source" hidden readonly aria-hidden="true">${esc(source)}</textarea>`;
}
export function audioTag() { return ''; }

export function readPage(html) {
  const s = String(html);
  const root = s.match(/<html\b[^>]*>/)?.[0] ?? '';
  const attr = (name) => root.match(new RegExp(`\\s${name}="([^"]+)"`))?.[1];
  const open = s.lastIndexOf(SOURCE_OPEN);
  const m = open === -1 ? null : s.slice(open).match(SOURCE_RE);
  return {
    source: m ? unescapeHtml(m[1]) : null,
    video: false,
    template: s.match(/<main class="am-(doc|sheet)\b/)?.[1],
    theme: attr('data-theme') || 'paper',
    mode: attr('data-mode'),
    style: attr('data-style'),
    lang: attr('lang'),
    voice: null,
    voiced: false,
  };
}

export function unescapeHtml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}
