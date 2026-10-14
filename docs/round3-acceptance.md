# 第三轮验收笔记（Skill / 测试集；非 Lab 整站重写）

## limits 结论

读过 `src/components/limits.js`：组件语义是 **value vs limit 进度条**（`label | value / limit | unit`），超限标红。  
Lab three.js / Tailwind / Magic UI 把主观「x / max 10 分」塞进 limits —— **是选用错误，不是渲染器 bug**。本轮只改 Skill 规则 + 夹具；**未改** limits 实现与主语法。

## 图表前后对照（≥3）

| 主题 | 前（Lab 问题） | 后（本仓期望草稿） |
|------|----------------|--------------------|
| markitdown | 正文泄漏「过程≥3步→必须 flow」+ 转换 flow | `11-real-data-pipeline-flow.md`：保留特有转换链，无规划口令；`leakage/good/markitdown-clean.md` |
| three.js | limits 主观 10/max10 分 | `16-threejs-no-fake-limits.md`：对比表分工；真实配额见 `12-limits-with-units.md` |
| anthropics/skills | 「信息形状是目录层级」泄漏 + tree | `09-anthropic-skills-tree.md`：tree + 表，无规划术语 |
| 空泛上手 | 安装→配置→运行凑 MUST | `leakage/bad/generic-install-flow.md` 检出；普通说明用 `14`/`15` 纯文字 |
| am 多角色 | 泄漏「必须 sequence」 | `10-am-multi-role-sequence.md`：sequence 讲清三角色，无口令 |

## 不可削弱项核对

| 约束 | 状态 |
|------|------|
| MUST 强制组件 | 保留（§3） |
| Paper-only | 未改 |
| 不大改渲染器 | 未改组件实现 |
| 不改组件主语法 | limits/flow/… 语法未动 |
| MUST→SHOULD | 未降级 |

## 自动化

`npm run check` / `test:leakage` / `test:agent-cases` / `test:kv` / `npm test`  
泄漏脚本可抓 Lab 现存反例；**不能**代替真模型回归。
