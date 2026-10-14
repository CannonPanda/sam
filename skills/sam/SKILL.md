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

**除非用户特意要求某模板，以后生成 sam 都严格执行下方强制规则（MUST 不可改回 SHOULD）。**

---

## 1. 定位与是否出页

| 场景 | 动作 |
|------|------|
| 关联概念 ≥3、流程/协议、对比权衡、层级、时间线 | **出页** |
| 闲聊、单句事实、用户只要纯文本 | **不出页** |
| 不确定 | 偏出页 |

CLI：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/sam.mjs"
```

（变量未替换时，换成含本 SKILL.md 的目录绝对路径。）

组件语法细节一律：`sam help <component>` / `sam list`。本文件只定 **选什么**，不定完整语法。

---

## 2. 必须工作流（写作前强制规划）

**内部规划，不对用户展示。禁止先写完长文再贴装饰组件。**

对每一板按顺序做完再写草稿：

1. **识别面板问题**——这一板要回答的子问题是什么？（一问一板）
2. **判断信息形状**——过程？多方消息？层级？时间？对比？边界？事实？
3. **必选组件**——按下表映射；触发 MUST 的必须出现，不得用 callout+kv 文字墙顶替
4. **规划位置**——哪一板放哪张图；若 ≥3 个独立确需可视化的问题 → 拆面板/拆页或增加图（见 §4）
5. **写内容**——结论先行；图服务该板问题；复杂语法查 `sam help`
6. **自检遗漏**——过程板有无 flow/sequence？该 tree/timeline 的有没有？有没有用 kv 冒充流程？

整页一次 heredoc 渲染：

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

读输出：`✓ <path>` 成功；`✗ L…` 按示例改后重跑（可 `--replace <path>`）。回复末行给页面路径。有 STE/代码警告时先改草稿。

### 面板写作（保留）

- **3–8 面板**：太少不够结构，太多难扫读。
- **一问一板**：标题是子问题或结论短语；不要把公式塞进面板标题。
- **先结论后展开**：重要结论可用 `callout`。
- **语言**：跟用户问题语言；可在 frontmatter 写 `lang:`。
- **STE**：默认 `style: 80`；`strict` 会阻断出页；介绍页可用 `style: off`。

---

## 3. 信息结构 → 组件强制映射

**按信息结构判断，不靠关键词碰运气，不按项目类型套模板。**

| 信息形状 | 组件 | 力度 |
|----------|------|------|
| 多系统 / 多角色 **消息交互、请求响应** | `sequence` | **MUST** |
| 有序过程 / 条件分支 / 状态转换 / 单角色步骤链 / 调用路径 | `flow` | **MUST** |
| 父子 / 多层分类 / 目录 / 组成 | `tree` | **MUST** |
| 时间节点、阶段或版本演进为核心 | `timeline` | **MUST** |
| 多对象 **同一维度** 比较（功能/价格/取舍） | Markdown **对比表** | **优先** |
| 限制、配额、阈值 vs 上限、边界 | `limits` 或 `callout` | 见下方触发 |
| 句内易错术语、对照纠错（克制） | `annot` | 见下方触发 |
| 实体与关系（数据模型） | `er` | 形状匹配时用 |
| 纯元数据短键值（标题块、规格、属主） | `kv` | 可用 |
| 结论 / 注意 / 单一提醒 | 段落或 `callout` | 按需 |
| 简单事实一句能说清 | 文字 | 别硬画 |

### MUST 细则（不可打折）

- **sequence**：参与者之间有消息往返、请求/响应、多系统握手 → **必须** sequence；**禁止**只用段落或 callout+kv。
- **flow**：≥3 有序步骤、条件分支、状态机、构建/发布/派发路径、面板标题含过程词（怎么变成 / 如何走到 / 流程 / 步骤 / 调用 / 发布 / 生成 / 上线 / 构建路径…）→ **必须** flow（单角色清晰步骤）或 sequence（多方消息）。
- **tree**：明确的父子层级、组织/目录/模块组成 → **必须** tree；不要用缩进列表冒充。
- **timeline**：时间先后或版本阶段是该板的主问题 → **必须** timeline。
- **禁止**用 `kv` / `callout` / 长段落 **代替** flow / sequence / tree / timeline。
- **禁止**为省 token 删掉上述强制机制或把 MUST 改回 SHOULD。

### 可执行触发（避免永远被忽略）

**limits** — 出现任一则用：

- 有「当前值 / 上限」或「不得超过 N」的可量化约束
- 配额、容量、字数/个数限制、阈值阈值
- 需要一眼看出是否超限

**annot** — 同时满足才用（克制）：

- 同一句里有易混术语或正误对照
- 标注 ≤3 处；整页 annot 块尽量 ≤2
- 不用于整段讲解

**er** — 实体 + 关系（含基数）是该板主问题；否则用表或文字。

**kv** — 仅短键值元数据（标题、规格、属主、版本号）；**禁止**把步骤写成「步骤1: …」塞进 kv。

**callout** — 单条结论/警告/提示；**禁止**把多步流程拆成多个 callout 冒充图。

另有展示组件无 `ask`、无主题切换、无页内回传 Agent。

---

## 4. 优先级与冲突

冲突时按此顺序（高 → 低）：

1. **内容准确与结构表达**（该用的图必须在，信息不错）
2. **触发条件对应的组件必须出现**（MUST 表）
3. **视觉克制默认**（能文字别硬画；一图一问题；不为多样性堆图）

### 数量与拆分

- 默认一页突出 **1–2** 个可视化重点；对比表与 kv **不计入** 该上限。
- 若存在 **≥3 个独立、确需可视化** 的子问题：**允许**拆面板、拆页，或合理增加图。
- **数量上限不得成为省略必要图的借口。**
- 禁止用 callout+kv 偷懒替代流程可视化。
- 同类可视化少重复（不要多个几乎同构的 flow）。
- 不为「看起来丰富」而滥用图表。

### 正例 / 反例（少量）

**正例**

- 「用户 → API → DB 的请求响应」→ 一板 `sequence`
- 「草稿 → 渲染 → HTML」三步 → 一板 `flow`
- 「公司 / 部门 / 小组」→ `tree`
- 「v1 → v2 → v3 演进」→ `timeline`
- 「三款产品功能对比」→ Markdown 表
- 「规格名 / 版本 / 属主」→ `kv`

**反例**

- 多步发布流程只用 callout + kv 列「步骤」→ **错误**
- 多系统交互写成三段文字 → **错误**
- 为凑数给一句事实硬套 flow → **错误**
- 因「已经有两张图」而删掉第三个必要 sequence → **错误**

---

## 5. 草稿与 CLI

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

iframe / 外置 CSS：

```bash
node "${CLAUDE_SKILL_DIR}/scripts/sam.mjs" css -o paper.css
node "${CLAUDE_SKILL_DIR}/scripts/sam.mjs" render draft.md -o page.html --css-href paper.css --no-open
```

---

## 6. 渲染检查与交付

渲染后自检：

1. MUST 组件是否都在、且能渲染（无 `✗`）
2. 有无用 kv/callout 顶替 flow/sequence/tree/timeline
3. 不该画的有没有硬画；图表是否服务面板问题
4. 窄宽布局是否可读（kv 1–6 项、长 URL/路径不撑破）

交付：回复说明要点；**末行给页面路径**。

### 与 am 分工

- 讲义、K站 intro、要轻页 → **sam**
- 要视频 / 多主题 / 页内回复标注 → 上游 **answer-me-with-html**
