---
title: three.js 该不该上
lang: zh
template: doc
style: off
---

```callout tip 结论
真 3D / WebGL 场景用 three.js；2D UI 动效用 Motion / Magic UI，别混成主观打分条。
```

## 和 2D 动效栈怎么分工

| 维度 | three.js | Motion | Magic UI | Lenis |
|------|----------|--------|----------|-------|
| 主战场 | 3D / WebGL | 2D UI 动效 | 2D 特效块 | 滚动 |
| 运行时重量 | 重 | 中 | 中 | 轻 |
| 性能红线 | 低面数 + 简单光照；移动端降级 | 避免满屏叠 three | 勿替 Dialog/Form | 单独引入即可 |

## 落地注意

落地页放轻量 3D hero 时控制面数与光照；背景轻微漂浮即可，别抢内容焦点。
