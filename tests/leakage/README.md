# 指令泄漏与 limits 语义夹具

这些是 **固定反例/正例**，供 `npm run test:leakage` 机读，并供人工对照 Lab 问题。

| 路径 | 期望 | 对应 Lab 问题 |
|------|------|----------------|
| `bad/markitdown-leak.md` | 检出泄漏 | markitdown 正文写「必须 flow」 |
| `bad/hugo-leak.md` | 检出泄漏 | Hugo 正文写「必须 flow」 |
| `bad/shape-jargon-leak.md` | 检出泄漏 | 「信息形状是…」 |
| `bad/threejs-limits-abuse.md` | 检出 limits 滥用 | 主观分塞进 limits |
| `bad/generic-install-flow.md` | 标记空泛流（启发式） | 安装→配置→运行凑数 |
| `good/markitdown-clean.md` | 通过 | 同主题无泄漏写法 |
| `good/sam-meta-ok.md` | 通过（`sam_meta: true`） | 讲解 sam 时可谈组件规则 |
| `good/plain-note.md` | 通过 | 无需复杂可视化 |

**不能**用本目录冒充「真模型已改善」；只能证明：规则已写清 + 自动检查能抓住已知坏稿。
