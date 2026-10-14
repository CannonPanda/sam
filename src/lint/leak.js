// Content check: the reader-visible text must never expose sam's own planning, and `limits` must only carry real quotas.
// Unlike the STE rules this is NOT part of `style`: a leaked planning rule is wrong at style: off too, so it is always checked.
// Scans raw block text and panel titles, so graph labels and headings are covered as well as prose.

const RULES = [
  { rule: 'leak/must', msg: '规划口令泄漏——读者只需要内容，不需要知道你选了哪个组件', re: /必须\s*(?:用|画|改用|使用)?\s*`?(?:flow|sequence|tree|timeline|er)\b/i },
  { rule: 'leak/must-en', msg: '规划口令泄漏（英文）——读者只需要内容，不需要知道你选了哪个组件', re: /\b(?:must|should|need\s+to)\s+(?:use|be|show|draw)\s+(?:a\s+|an\s+)?`?(?:flow|sequence|tree|timeline|er)\b/i },
  { rule: 'leak/steps', msg: '触发条件泄漏——「≥3 步」是你的选型阈值，不是内容', re: /(?:过程|步骤)\s*[≥>=]{1,2}\s*3\s*步|[（(]\s*≥\s*3\s*步\s*[）)]/ },
  { rule: 'leak/skill', msg: '「根据 Skill」元指令泄漏', re: /(?:根据|按|依照|按照)\s*(?:本\s*)?(?:Skill|技能)|per\s+the\s+skill|the\s+skill\s+requires/i },
  { rule: 'leak/shape', msg: '规划术语「信息形状/结构」泄漏', re: /信息(?:形状|结构)是|(?:the\s+)?information\s+(?:shape|structure)\s+is/i },
  { rule: 'leak/discipline', msg: '写作纪律口令泄漏', re: /禁止只(?:用|以)\s*(?:文字|段落|annot|callout)|do\s+not\s+use\s+(?:only\s+)?(?:text|prose)\s+instead/i },
  { rule: 'leak/selection', msg: '选型独白泄漏——比较组件的话也属于内部规划', re: /limits\s*比[^。\n]{0,12}(?:图|合适)|比架构图合适|limits\s+(?:is\s+)?(?:better|more\s+appropriate)\s+than/i },
];

// ```limits renders value vs limit bars, so a subjective score drawn as a bar is a visible content error.
const TENS_OF_TEN = /\/\s*(?:max\s+)?10\s*\|[^|\n]*分/;
const SCORE_LABEL = /(适合度|推荐指数|评分|主观|满分|\bscore\b|\brating\b|\bgrade\b)/i;
const FRACTION = /\/\s*(?:max\s+)?\d+/;
const isSubjectiveScore = (line) => TENS_OF_TEN.test(line) || (SCORE_LABEL.test(line) && FRACTION.test(line));

const quote = (hit) => `「${hit.replace(/\s+/g, ' ').trim().slice(0, 28)}」`;

export function lintContent(doc) {
  // A page whose subject IS sam may name the rules; that is its content. Opt in explicitly, never guessed from the title.
  // parse.js only coerces numeric frontmatter, so `sam_meta: true` arrives as the string 'true'.
  if (doc.meta?.sam_meta === true || doc.meta?.sam_meta === 'true') return [];
  const warnings = [];
  const scan = (text, line) => {
    for (const r of RULES) {
      const hit = text.match(r.re);
      if (hit) warnings.push({ line, rule: r.rule, message: `${r.msg}${quote(hit[0])}`, suggestion: '删掉这句，写读者用得上的事实' });
    }
  };
  const scanLimits = (text, line) => {
    for (const raw of text.split(/\r?\n/)) {
      const l = raw.trim();
      if (isSubjectiveScore(l)) {
        warnings.push({ line, rule: 'limits/subjective', message: `主观打分不能画成 limits 进度条：${l.slice(0, 36)}`, suggestion: '改用对比表或文字' });
      }
    }
  };

  if (doc.meta?.title) scan(String(doc.meta.title), 1);
  for (const b of doc.intro) {
    if (!b.text) continue;
    scan(b.text, b.line);
    if (b.lang === 'limits') scanLimits(b.text, b.line);
  }
  for (const p of doc.panels) {
    if (p.title) scan(p.title, p.line ?? 1);
    for (const b of p.blocks) {
      if (!b.text) continue;
      scan(b.text, b.line);
      // The label text of any other graph component is reader-visible too, and is scanned above as plain text.
      if (b.lang === 'limits') scanLimits(b.text, b.line);
    }
  }
  return warnings;
}