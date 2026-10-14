---
title: 一次提问怎样变成讲义页
lang: zh
template: doc
style: off
---

```callout tip 结论
人、Agent、CLI 三角色接力：草稿进 CLI，出来才是讲义路径。
```

## 多角色怎样完成一次渲染

```sequence
你 -> Agent: 提问（如讲清 TCP 握手）
Agent -> Agent: 写 3–8 面板 Markdown 草稿
Agent -> am CLI: render 草稿
am CLI -> Agent: ✓ HTML 路径或 ✗ 行号+示例
Agent -> 你: 讲义页路径
```

## 什么时候用 am，什么时候用 sam

| 需求 | am | sam |
|------|----|-----|
| 全功能讲义 | 合适 | 精简 |
| iframe / 备课轻页 | 偏重 | 合适 |
| 多主题 / 视频 / 页内回复 | 有 | 无 |
