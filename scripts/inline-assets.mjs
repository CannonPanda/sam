// esbuild plugin: replace src/assets.js with inline strings for the skill bundle.
import { readFileSync } from 'node:fs';
import { composeMathCss } from '../src/themes/math-css.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n?/g, '\n');

export const inlineAssets = {
  name: 'inline-assets',
  setup(b) {
    b.onLoad({ filter: /src[\\/]assets\.js$/ }, () => ({
      loader: 'js',
      contents: [
        `export const VERSION = ${JSON.stringify(JSON.parse(read('../package.json')).version)};`,
        `export const BASE_CSS = ${JSON.stringify(read('../src/themes/base.css'))};`,
        `export const DIFF_CSS = ${JSON.stringify(read('../src/themes/diff.css'))};`,
        `export const DELTA_CSS = ${JSON.stringify(read('../src/themes/delta.css'))};`,
        `export const RTL_CSS = ${JSON.stringify(read('../src/themes/rtl.css'))};`,
        `export const MATH_CSS = ${JSON.stringify(composeMathCss(read('../src/themes/math.css')))};`,
      ].join('\n'),
    }));
  },
};
