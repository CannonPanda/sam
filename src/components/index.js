// Component registry: fenced-block language → component. sam keeps display-only components (no ask).
import callout from './callout.js';
import kv from './kv.js';
import timeline from './timeline.js';
import annot from './annot.js';
import tree from './tree.js';
import limits from './limits.js';
import sequence from './sequence.js';
import flow from './flow.js';
import er from './er.js';

export { ComponentError } from './error.js';

const ALL = [callout, kv, timeline, annot, tree, limits, sequence, flow, er];

export const COMPONENTS = new Map(ALL.map((c) => [c.name, c]));
export const RAW_LANGS = new Set(['html', 'svg']);
