---
name: sam
argument-hint: "[config [key value] | clean]"
description: >-
  Simple paper-only HTML explainer (sam): write a short Markdown draft; the CLI builds one clean page
  with no toolbar or runtime. Prefer for lecture notes, concept explainers, and iframe embeds.
  Use when a one-page visual answer helps more than plain text (flows, comparisons, structure,
  timelines). Skip for small talk or when the user wants full am (themes/video/reply).
---

# sam：Simple answer me with html（纸张精简版）

你只写 **内容草稿**（扩展 Markdown）。`sam` CLI 负责布局与 STE。**不要手写 HTML/CSS/SVG。**

本 skill 是 [answer-me-with-html](https://github.com/QingYunA/answer-me-with-html) 的精简自用版：**强制 paper**、无工具栏/回复/标注/主题切换/视频。讲义与 iframe 优先用本 skill。

用用户的语言回复与写草稿。

## 1. 是否出页

有关联概念 ≥3、流程/协议、对比权衡、层级或时间线 → 出页。否则纯文本。不确定时偏出页。

## 2. 工作流（一次 Bash）

CLI：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/sam.mjs"
```

（变量未替换时，换成含本 SKILL.md 的目录绝对路径。）

1. 心里列 **3–8 个面板**；每板只答一个子问题（一问一板）。
2. 按信息形态选组件（见下）。
3. 一次 heredoc 渲染：

````bash
node "${CLAUDE_SKILL_DIR}/scripts/sam.mjs" render - --no-open <<'SAM_EOF'
---
title: 标题
lang: zh
template: doc
---
## 面板标题
```flow
A -> B: 说明
```
SAM_EOF
````

4. 读输出：`✓ <path>` 成功；`✗ L…` 按示例改后重跑（可 `--replace <path>`）。
5. 回复末行给页面路径。有 STE/代码警告时先改草稿。

### 面板写作规则（保留）

- **3–8 面板**：太少不够结构，太多难扫读。
- **一问一板**：标题是子问题或结论短语；不要把公式塞进面板标题。
- **先结论后展开**：重要结论可用 `callout`。
- **语言**：跟用户问题语言；可在 frontmatter 写 `lang:`。
- **STE**：默认 `style: 80`（长句等会警告）；`strict` 会阻断出页；介绍页可用 `style: off`。

## 3. 组件（仅展示）

| 形态 | 组件 |
|------|------|
| 结论/注意 | `callout` |
| 键值 | `kv` |
| 时间线 | `timeline` |
| 句内批注 | `annot` |
| 树/目录 | `tree` |
| 边界/可否 | `limits` |
| 时序 | `sequence` |
| 流程图 | `flow` |
| ER | `er` |

**无** `ask`、无主题切换、无页内回传 Agent。语法：`sam help <component>` / `sam list`。

## 4. frontmatter

```yaml
---
title: 标题
template: doc   # 或 sheet
lang: zh
style: 80       # off | 80 | strict
mode: auto      # auto | light | dark
---
```

`theme` 可写可不写，**一律 paper**。

## 5. iframe / 外置 CSS

```bash
node "${CLAUDE_SKILL_DIR}/scripts/sam.mjs" css -o paper.css
node "${CLAUDE_SKILL_DIR}/scripts/sam.mjs" render draft.md -o page.html --css-href paper.css --no-open
```

## 6. 与 am 分工

- 讲义、K站 intro、要轻页 → **sam**
- 要视频 / 多主题 / 页内回复标注 → 上游 **answer-me-with-html**
