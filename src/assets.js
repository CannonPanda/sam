// Static assets. Development reads from disk; scripts/build.mjs inlines strings into the skill bundle.
import { readFileSync } from 'node:fs';
import { composeMathCss } from './themes/math-css.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

export const VERSION = JSON.parse(read('../package.json')).version;
export const BASE_CSS = read('./themes/base.css');
export const DIFF_CSS = read('./themes/diff.css');
export const DELTA_CSS = read('./themes/delta.css');
export const RTL_CSS = read('./themes/rtl.css');
export const MATH_CSS = composeMathCss(read('./themes/math.css'));
