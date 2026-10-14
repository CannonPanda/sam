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

用用户的语言回复与写草稿。本 skill 是 [answer-me-with-html](https://github.com/QingYunA/answer-me-with-html) 的精简自用版：**强制 paper**、无工具栏/回复/标注/主题切换/视频/联网。讲义与 iframe 优先用本 skill。

组件语法细节一律 `sam help <component>` / `sam list`。本文件只定 **选什么、写什么、不写什么**。

下文用 `<SKILL_DIR>` 指**本 SKILL.md 所在目录**（各宿主变量名不同，按此定位即可）：

```bash
node <SKILL_DIR>/scripts/sam.mjs <command>
```

---

## 1. 何时出页

| 场景 | 动作 |
|------|------|
| 关联概念 ≥3、流程/协议、对比权衡、层级、时间线 | **出页** |
| 闲聊、单句事实、用户只要纯文本 | **不出页** |
| 不确定 | 偏出页 |

## 2. 阶段 A：脑内规划，不对读者可见

**只写给读者的内容。规划理由、映射口令、Skill 条文一律不进正文。** 动笔前对每一板依次问：① 这一板回答什么子问题（一问一板）② 信息结构是什么 ③ 按 §3 该用哪些组件（触发 MUST 的必须出现）④ 这张图有没有信息价值（§4）⑤ 图放哪一板。

整页一次渲染：

````bash
node <SKILL_DIR>/scripts/sam.mjs render - --no-open <<'SAM_EOF'
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

读输出：`✓ <path>` 成功；`✗ L…` 按提示改后重渲（可 `--replace <path>`）。回复末行给页面路径。

**3–8 面板**：太少不够结构，太多难扫读。标题用读者能懂的问题或结论，不要把公式塞进标题。

## 3. 结构映射（MUST｜按信息结构判断，不按标题碰运气）

| 信息结构 | 组件 | 力度 |
|----------|------|------|
| 多系统/多角色**消息交互、请求响应** | `sequence` | **MUST** |
| 有序过程/条件分支/状态转换/调用路径（≥3 个真实、可区分的步骤） | `flow` | **MUST** |
| 父子/多层分类/目录/组成 | `tree` | **MUST** |
| 时间节点、阶段或版本演进为核心 | `timeline` | **MUST** |
| 多对象**同一维度**比较（功能/价格/取舍） | Markdown 对比表 | **优先** |
| **真实**数值 vs 限额/预算/阈值上限 | `limits` | 见 §4 |
| 句内易错术语、对照纠错（克制） | `annot` | 见下 |
| 实体与关系（数据模型） | `er` | 形状匹配时用 |
| 纯元数据短键值（规格、属主、版本） | `kv` | 可用 |
| 结论/注意/单一提醒 | `callout` 或段落 | 按需 |
| 一句能说清的事实 | 文字 | 别硬画 |

细则：

- **触发看信息结构，不看标题**是否含「构建/发布/流程」。参与者之间有消息往返 → 必须 `sequence`；单角色有 ≥3 个真实可区分的有序步骤 → 必须 `flow`。
- **禁止**用 `kv` / `callout` / 长段落**代替** flow / sequence / tree / timeline；**禁止**把多步流程拆成多个 callout 冒充图。
- **禁止**为省 token 删掉强制机制，或把 MUST 降级成 SHOULD。
- `annot` 克制：同一句内有易混术语或正误对照才用，≤3 处，整页 ≤2 块。
- `kv` 只放短键值元数据；**禁止**把步骤写成「步骤1: …」塞进 kv。
- 无复杂过程就**不捏造**步骤。

**冲突时按此顺序**：内容准确与结构表达 → 触发条件对应的组件必须出现 → 视觉克制（能文字别硬画）。

**数量**：一页突出 **1–2** 个可视化重点（对比表与 kv 不计入）。确有 ≥3 个独立且确需可视化的子问题时，允许拆面板、拆页或合理增加图——**数量上限不得成为省略必要图的借口**，也不为「显得丰富」堆图。

## 4. 内容真实性（渲染成功 ≠ 内容合格）

**`limits` 是「当前值 vs 上限」的进度条**（语法见 `sam help limits`）。仅当同时满足才用：有**真实可核实**的数值；存在明确限额/预算/容量/阈值；条形能一眼判断是否接近上限。

禁止：把主观评分/推荐指数写成 `value / max 10`；无依据编造分数或上限；用 limits 表达「强/弱/适合/不适合」这类定性判断（改用对比表或文字）。无量化依据 → 表或文字。

**图的信息价值**：① 回答该板标题所问的问题 ② 体现主题**独有**机制（不是万能套话）③ 不凑规则——通用「安装 → 配置 → 运行」「写 → 构建 → 部署」若无项目特有分支/产物/角色，**不要画**，改写特有路径或改为表/文字。

## 5. 读者正文

**禁止指令泄漏**：以下内容不得出现在正文、面板标题、callout、图注里——「必须 flow / 必须 sequence」「过程≥3步」「根据 Skill / 按 Skill 要求」「信息形状是…」「禁止只用文字代替…」这类选型独白。`sam lint` 会在中英文两种写法上抓这些。

> 合法例外：页面主题**就是 sam / 组件规则本身**时，可以说明「sam 要求过程用 flow」——那是在讲产品。在 frontmatter 加 `sam_meta: true` 可免除 lint 报警。

**去模板化**：不要套「A·坐标 / B·机制 / C·比较 / D·用法」四段套路，按主题自然组织（特有机制、可验证用法、真实取舍、入口）。面板标题别拿「坐标」当空壳栏目名。

**文风**：先结论后展开；短句；少套话。不编造星标、分数、步骤。

## 6. 渲染与质检

```yaml
---
title: 标题
template: doc   # 或 sheet
lang: zh
style: 80       # off | 80 | strict
mode: auto      # auto | light | dark
---
```

`theme` 可写可不写，**一律 paper**。style `strict` 会阻断出页；介绍页可用 `style: off`。

**每次渲染后跑一次 lint**（唯一的自动闸门，与渲染同一个 CLI）：

```bash
node <SKILL_DIR>/scripts/sam.mjs lint draft.md
```

- STE 警告 → 改草稿，再 `--replace <page>` 重渲
- `Content N issues` → **规划泄漏或 limits 误用**，必须改；这条不受 `style: off` 影响

lint 兜不住、仍需自己判断的：MUST 形状是否用了对应组件（有无 kv/callout 顶替）、数字与步骤是否有依据、图是否回答该板的问题、对比是否具体。

iframe / 外置 CSS：`sam css -o paper.css`，然后 `render draft.md -o page.html --css-href paper.css --no-open`。

## 7. 交付

1. 回复说明要点（给读者的精华，不是规划过程）。
2. **末行给页面路径**。
3. 不把阶段 A 的检查表贴进用户可见回复（除非用户要审计）。

**与 am 分工**：讲义、K站 intro、要轻页 → **sam**；要视频 / 多主题 / 页内回复标注 → 上游 **answer-me-with-html**。