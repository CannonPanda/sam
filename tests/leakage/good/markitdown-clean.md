---
title: markitdown
lang: zh
template: doc
style: off
---

```callout tip 结论
微软开源多格式→Markdown 库：Office、PDF、图片、音视频等一键转成 LLM 友好文本。
```

## 杂格式怎样变成统一 Markdown

```flow
Office / PDF / 图片 / 音视频 -> MarkItDown.convert
MarkItDown.convert -> 统一 Markdown
统一 Markdown -> RAG / Agent / LLM
```

CLI 或 Python API 均可；适合插件与批处理管道。

## 和 MinerU 怎么选

| 你要… | 更合适 |
|-------|--------|
| 轻量批转、多格式一把梭 | markitdown |
| 复杂 PDF 版式 / 公式 / OCR | MinerU |
