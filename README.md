# sam — Simple answer me with html

基于 [answer-me-with-html](https://github.com/QingYunA/answer-me-with-html) 的精简自用版：**只留纸张主题 paper**，去掉工具栏与复杂运行时，适合讲义页与 iframe 嵌入。

仓库：https://github.com/CannonPanda/sam

## 与 am 的差异

| | answer-me-with-html (`am`) | **sam** |
|---|---|---|
| 主题 | paper / blueprint / shadcn / 3b1b + 自定义 | **仅 paper** |
| 页内工具栏 | 主题切换、回复、标注、复制源稿 | **无** |
| 运行时 JS | 布局/回复/灯箱/更新等 | **无**（纯展示） |
| 视频 | `am video` | **无** |
| ask 组件 | 有 | **无** |
| STE / 面板规则 | 有 | **保留** |
| 展示组件 | flow / sequence / tree / … | **同左**（无 ask） |
| CSS | 默认内联全主题 | 内联 paper 展示样式，或 `--css-href` + `sam css` 外置精简 sheet |

Lab / iframe 场景优先用 sam：页更轻，不必再 strip 工具栏。

## 安装

需要 Node.js ≥ 20。

```bash
git clone https://github.com/CannonPanda/sam.git
cd sam && npm install && npm run build
```

Skill 路径：`skills/sam/`（CLI 单文件：`skills/sam/scripts/sam.mjs`）。

也可：`npm link` 后全局用 `sam`。

## 用法

```bash
# 渲染（heredoc）
node skills/sam/scripts/sam.mjs render - <<'EOF'
---
title: 示例
lang: zh
template: doc
style: 80
---
```callout tip 结论
这是一页纸张主题讲义。
```

## 流程
```flow
A[草稿] -> B[sam render]
B -> C[HTML]
```
EOF

# STE 检查
sam lint draft.md

# 外置 CSS（iframe 缓存）
sam css -o paper.css
sam render draft.md -o out.html --css-href paper.css --no-open
```

数据目录默认 `~/.sam/`（可用环境变量 `SAM_HOME` 或 `AM_HOME`）。

## 何时用 sam / 何时用 am

- **讲义、原理页、K站 intro、iframe**：用 **sam**（干净、快）。
- **需要主题切换、回复标注、视频讲解**：用上游 **am**。

## 检查

```bash
npm run build
npm run check          # 机读：USAGE/SKILL/kv CSS 等
npm run test:kv        # kv 1–6 渲染 +（有 Chrome 时）布局探测
npm run test:agent-cases  # 期望草稿可渲染（非真实模型测试）
```

## 许可

MIT（继承上游 LICENSE）。
