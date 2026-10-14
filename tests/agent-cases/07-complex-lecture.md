---
title: 从草稿到讲义页
lang: zh
template: doc
style: off
---

```callout tip 结论
Agent 写扩展 Markdown，CLI 渲成静态 HTML，适合 iframe。
```

## 渲染路径怎么走

```flow
草稿 -> sam render: STE + 组件
sam render -> HTML: paper CSS
HTML -> iframe: 外置 css 可选
```

## 仓库结构要点

```tree
sam
  src
    components
    themes
  skills/sam
    SKILL.md
    scripts/sam.mjs
```

## 与上游怎么分工

| | sam | am |
|---|-----|-----|
| 主题 | 仅 paper | 多主题 |
| 工具栏 | 无 | 有 |
| 视频 | 无 | 有 |
