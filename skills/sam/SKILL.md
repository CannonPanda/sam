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

**除非用户特意要求某模板，以后生成 sam 都严格执行下方「组件选用规则（强制）」。**

## 1. 是否出页

有关联概念 ≥3、流程/协议、对比权衡、层级或时间线 → 出页。否则纯文本。不确定时偏出页。

## 2. 工作流（一次 Bash）

CLI：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/sam.mjs"
```

（变量未替换时，换成含本 SKILL.md 的目录绝对路径。）

1. 心里列 **3–8 个面板**；每板只答一个子问题（一问一板）。
2. **先看信息形状再选组件**（见 §3），不按项目类型套模板。
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

## 3. 组件选用规则（强制）

**核心：先看信息形状再选组件，不按项目类型套模板。过程性内容必须有图，禁止只用文字段。**

### 判断顺序

1. **要看什么**——这一板要回答的子问题是什么？
2. **是否过程**——步骤链 / 调用 / 请求路径 / 多角色交互？是 → **必须** `flow` 或 `sequence`（见下）。
3. **图能否更快懂**——不能就别硬画；能文字就用段落 / kv / 表。
4. **一页最多 1–2 个重点可视化**——其余用文字 / kv / 表，避免满页都是图。

### 形状 → 组件（强制）

| 信息形状 | 组件 | 力度 |
|----------|------|------|
| 步骤链 / 调用关系 / 请求路径 / 多角色交互 | `flow` 或 `sequence` | **必须**画图，**禁止**只用文字段或 callout+kv 文字墙 |
| ≥3 有序步骤，或多方传递数据 | `flow` / `sequence` | **优先画图**，不要用长文代替 |
| 层级 / 目录 | `tree` | 按形状选用 |
| 时间先后（事件轴） | `timeline` | 按形状选用 |
| 差异 / 对比 | 对比表（Markdown 表） | 表格够用就表格 |
| 边界 / 限制 / 可否 | `limits` 或 `callout` | 按形状选用 |
| 易错点 / 句内强调 | `annot` | 按形状选用 |
| 事实 / 键值 | `kv` 或文字 | 按形状选用 |
| 结论 / 注意 | 段落或 `callout` | 按形状选用 |

另有 `er`（实体关系）等展示组件；**无** `ask`、无主题切换、无页内回传 Agent。语法：`sam help <component>` / `sam list`。

### 过程强制（不可打折）

以下情况 **必须** 使用 `flow` 或 `sequence`，**禁止**只用文字段、长段落，或「callout + kv」把流程写成文字墙：

- **步骤链**（有先后的多步路径）
- **调用 / 请求路径**（谁调谁、请求怎么走）
- **多角色 / 多系统交互**（参与者之间传消息或数据）

细则：

- **≥3 有序步骤**，或**多方传递数据** → **优先画图**（`flow` / `sequence`）。
- 单角色、步骤清晰 → 用 `flow`；参与者之间有消息往返 → 用 `sequence`。
- 框架 / 工作流 / 构建发布 / Agent 派发 / 模板上线等，核心是「怎么走一遍」→ **必须**有一张流程可视化。
- **面板标题或主题含过程词**（如「怎么变成」「如何走到」「流程」「步骤」「调用」「发布」「生成」「上线」「构建路径」等）→ **必须**配 `flow` / `sequence`，不得只靠文字叙述该过程。

### 克制原则（同样强制）

- **能文字别硬画**：图不能更快懂时，用段落 / kv / 表。无流程就别硬套 flow。
- **一图一问题**：一张可视化只服务一个子问题。
- **一页最多 1–2 个重点可视化**：`flow` / `sequence` / `tree` / `timeline` / `limits` / `annot` / `er` 等合计不超过 2；对比表与 kv 不计入。
- **不为用而用**：不为「看起来丰富」而堆组件。
- **表格够用就表格**：对比、清单优先 Markdown 表。
- **同类组件少重复**：同页少重复同类可视化（例如不要多个几乎同构的 flow）。
- **tree / timeline / limits / callout / annot / 对比表 / kv**：按形状照常选用，用法不变；不得用它们冒充流程说明。

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
