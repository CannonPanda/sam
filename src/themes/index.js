// Paper-only page CSS for sam (display styles; no toolbar / ask / reply / remark / lightbox / video).
import { BASE_CSS, DIFF_CSS, DELTA_CSS, RTL_CSS, MATH_CSS } from '../assets.js';
import { themes } from './registry.js';
import { fontLanguages, langSelector } from './fonts.js';

const block = (selector, vars) =>
  `${selector} {\n${Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`;

function tokenCss(sel, { common = {}, light = {}, dark = {} }) {
  const parts = [block(`${sel}, ${sel}[data-mode="light"]`, { ...common, ...light })];
  if (Object.keys(dark).length) {
    parts.push(block(`${sel}[data-mode="dark"]`, dark), `@media (prefers-color-scheme: dark) {\n${block(`${sel}[data-mode="auto"]`, dark)}\n}`);
  }
  return parts.join('\n');
}

const pageSel = (t) => `html[data-theme="${t.name}"]`;
const scoped = (css, sel) => css.replace(/&/g, sel);

const languageFontCss = () => fontLanguages().map((l) => block(langSelector(l, 'html', '[data-theme][data-mode]'), { '--font-sans': l.fonts.sans }));

const ownLanguageFont = (t) => fontLanguages().map((l) => block(langSelector(l, 'html', `[data-theme="${t.name}"][data-mode]`), { '--font-sans': t.tokens.common['--font-sans'] }));

/** Feature-only CSS (math / diff / delta / rtl) — paired with an external paper.css via --css-href. */
export function featureCss({ diff = false, delta = false, rtl = false, math = false } = {}) {
  return [
    ...(math ? [MATH_CSS] : []),
    ...(diff ? [DIFF_CSS] : []),
    ...(delta ? [DELTA_CSS] : []),
    ...(rtl ? [RTL_CSS] : []),
  ].join('\n\n');
}

export function pageCss(list = themes('page'), { diff = false, delta = false, rtl = false, math = false } = {}) {
  const decorations = list.filter((t) => t.css).map((t) => scoped(t.css, pageSel(t)));
  const ownFonts = list.filter((t) => t.ownFont).flatMap(ownLanguageFont);
  return [
    list.map((t) => tokenCss(pageSel(t), t.tokens)).join('\n\n'),
    ...languageFontCss(),
    ...ownFonts,
    BASE_CSS,
    featureCss({ diff, delta, rtl, math }),
    ...decorations,
  ].filter(Boolean).join('\n\n');
}

/** Shared paper stylesheet for `sam css` / iframe <link>: display base only (~paper tokens + panels/components).
 *  Math / diff / delta / rtl stay out so the file stays lean; render with --css-href inlines those when needed. */
export function paperStylesheet({ diff = false, delta = false, rtl = false, math = false } = {}) {
  return pageCss(themes('page'), { diff, delta, rtl, math });
}
