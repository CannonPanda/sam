import { mdInline } from '../markdown.js';
import { esc } from '../svg/text.js';
import { ComponentError, contentLines } from './error.js';
import { parseAttrs } from '../parse.js';

export default {
  name: 'kv',
  summary: 'Key-value grid / title block (metadata)',
  syntax: `\`\`\`kv [cols=N]
key: value
* wide key: value   ← starts with *: spans the full row, larger text
\`\`\`
- Splits at the first colon (: or the fullwidth colon); the value may contain more colons.
- Omit cols for adaptive layout (container queries): 1–6 items rearrange by panel width.
- Explicit cols=1…6 fixes the column count (still wraps long text; does not shrink below 1).
- Prefer kv for short metadata facts — never as a substitute for flow / sequence.`,
  example: '```kv\n* Title: Simplified Technical English\nSpecification: ASD-STE100\nOwner: ASD\n```',
  render(text, { args }) {
    const attrs = parseAttrs(args);
    const hasCols = Object.prototype.hasOwnProperty.call(attrs, 'cols');
    const cols = hasCols ? Math.max(1, Math.min(Number(attrs.cols) || 2, 6)) : null;
    const cells = contentLines(text).map(({ text: t, line }) => {
      const wide = t.startsWith('*');
      const body = wide ? t.slice(1).trim() : t;
      const m = body.match(/^([^:：]+)[:：]\s*(.*)$/);
      if (!m) throw new ComponentError(`kv line has no colon: "${t}"; expected key: value`, line);
      return `<div class="am-kv-cell${wide ? ' am-kv-cell--wide' : ''}"><dt>${esc(m[1].trim())}</dt><dd>${mdInline(m[2])}</dd></div>`;
    });
    if (!cells.length) throw new ComponentError('kv needs at least one key: value line', 1);
    const n = cells.length;
    // Host is the size container; the dl is the grid (container queries cannot style the container itself).
    const auto = cols === null ? ` data-auto="${n}"` : '';
    const style = cols !== null ? ` style="--kv-cols: ${cols}"` : '';
    return `<div class="am-kv-host"><dl class="am-kv"${auto}${style}>${cells.join('')}</dl></div>`;
  },
};
