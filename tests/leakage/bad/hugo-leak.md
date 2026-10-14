---
title: Hugo（泄漏反例）
lang: zh
template: doc
style: off
---

## 内容怎样变成静态页

构建路径（≥3 步）是过程性内容 → 必须 flow，禁止只用文字/annot 代替。

```flow
内容 -> Hugo: shortcodes
Hugo -> 纯静态 HTML: 构建期 partials
```
