# Agent 行为回归用例（人工评估 + 可渲染样例）

这些是**固定输入 + 期望组件 + 评估标准**，供 Agent / 人工对照，**不能冒充真实模型自动测试**。
每个 `NN-*.md` 是可渲染的「期望草稿」样例（正确选用组件后的目标形态）。评估时：给 Agent 同主题自然语言问题，对照本目录期望。

`npm run test:agent-cases` 只证明：**期望草稿能被 sam 渲染**（语法/组件可用）。**不证明**线上 Agent 已改善——无法跑真模型时不要谎称行为已变好；请交测试集 + 本标准给人审。

泄漏 / limits 滥用反例见 `tests/leakage/`（`npm run test:leakage`）。

## 指标

| 指标 | 说明 |
|------|------|
| 该用的用了 | MUST 形状出现对应组件 |
| 不该用的没用 | 无多余 flow/图表；无空泛安装流 |
| 不滥 callout/kv | 不用文字墙顶替流程 |
| 不漏 flow/structure | 过程/层级不缺图 |
| 无指令泄漏 | 正文无「必须 flow / ≥3步 / 信息形状…」 |
| limits 语义 | 仅真实数值+限额；无主观「x/max10 分」 |
| 能渲染 | `sam render` 成功 |
| 无布局炸 | 各宽度可读 |
| 去模板化 | 不强制 A坐标/B机制/C比较/D用法 |

## 用例一览

| # | 文件 | 输入主题 | 期望组件 | 不应出现 |
|---|------|----------|----------|----------|
| 1 | 01-three-step-flow | 三步业务流程 | **flow** | 仅 callout+kv 步骤墙 |
| 2 | 02-multi-system-sequence | 多系统请求响应 | **sequence** | 纯段落描述握手 |
| 3 | 03-org-tree | 多层组织 | **tree** | 仅缩进列表冒充 |
| 4 | 04-tech-timeline | 技术时间线 | **timeline** | 仅编号段落 |
| 5 | 05-product-compare | 多产品对比 | **Markdown 表** | 无意义饼图/堆 flow |
| 6 | 06-plain-facts | 普通事实 | 文字或 **kv** | flow/sequence |
| 7 | 07-complex-lecture | 复杂讲义多结构 | flow+tree+表等，可多板 | 单板文字墙 |
| 8 | 08-no-html | 不需 HTML 的简单问 | **不出页** | 强行 render |
| 9 | 09-anthropic-skills-tree | 官方 skills 仓层级 | **tree** + 表 | 泄漏「信息形状是」；整仓当一 skill |
| 10 | 10-am-multi-role-sequence | 人/Agent/CLI 渲染 | **sequence** | 泄漏「必须 sequence」；纯段落 |
| 11 | 11-real-data-pipeline-flow | MarkItDown 转换链 | **flow**（特有节点） | 空泛安装流；泄漏 ≥3步口令 |
| 12 | 12-limits-with-units | STE 句长配额 | **limits** + 单位 | 主观适合度打分 |
| 13 | 13-kv-three-and-five | 元数据 3/5 项 | **kv** | 步骤塞进 kv |
| 14 | 14-plain-library-blurb | 普通库说明 | **文字** | 硬画 flow/limits |
| 15 | 15-plain-config-note | 配置说明 | **文字** | 硬画可视化 |
| 16 | 16-threejs-no-fake-limits | 3D vs 2D 分工 | **对比表** | limits 主观「10/max10 分」 |

## 人工评估步骤

1. 向 Agent 提出「输入主题」列的自然语言问题（勿直接贴期望草稿）。
2. 若出页：检查组件是否匹配「期望」；有无泄漏；limits 是否真实配额；渲染是否成功；布局是否正常。
3. 对照「不应出现」列打叉即不合格。
4. 用例 8：应纯文本回答，无 HTML 路径。
5. 用例 14–15：允许不出复杂图；硬凑安装流或 limits 打分即不合格。

## 与 Lab 反例对照

| Lab 页 | 问题 | 本仓对应 |
|--------|------|----------|
| markitdown / Hugo | 正文泄漏「必须 flow / ≥3步」 | `tests/leakage/bad/*-leak.md`；正例 11 |
| three.js / Tailwind / Magic UI | limits 主观分 | `tests/leakage/bad/threejs-limits-abuse.md`；正例 12、16 |
| 多页 A/B/C/D | 模板化 | Skill §5.2；正例按主题自然结构 |
| vitepress 等 | 空泛写→构建→部署 | `tests/leakage/bad/generic-install-flow.md` |
