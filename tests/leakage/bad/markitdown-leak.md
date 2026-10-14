---
title: markitdown（泄漏反例）
lang: zh
template: doc
style: off
---

## 杂格式怎样变成统一 Markdown

转换路径（过程 ≥3 步）→ 必须 flow，禁止只用文字段。

```flow
Office/PDF -> MarkItDown.convert
MarkItDown.convert -> 统一 Markdown
统一 Markdown -> RAG
```
