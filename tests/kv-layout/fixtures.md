---
title: kv layout regression
lang: zh
template: doc
style: off
---

## 1 item auto
```kv
Name: sam
```

## 2 items auto
```kv
Name: sam
Role: renderer
```

## 3 items auto（宽应三列）
```kv
Spec: ASD-STE100
Owner: ASD
Lang: zh
```

## 4 items auto
```kv
A: one
B: two
C: three
D: four
```

## 5 items auto
```kv
A: 1
B: 2
C: 3
D: 4
E: 5
```

## 6 items auto
```kv
A: 1
B: 2
C: 3
D: 4
E: 5
F: 6
```

## explicit cols=3
```kv cols=3
X: alpha
Y: beta
Z: gamma
```

## explicit cols=1
```kv cols=1
Only: vertical
Second: still stacked
Third: three rows
```

## wide mix
```kv
* Title: Paper lecture page
Repo: https://github.com/CannonPanda/sam/tree/main/src/components/kv.js
Path: /workspace/sam/skills/sam/scripts/sam.mjs
Owner: CannonPanda
```

## long CJK + URL + inline MD
```kv
说明: 这是一段很长的中文说明用来验证 overflow-wrap 与混排不会撑破面板网格布局
URL: https://example.com/very/long/path/to/resource?query=1&more=2&even=longer
混排: 路径 `/usr/local/bin` 与 **粗体** 以及 `code`
Link: [文档](https://example.com/docs/a/b/c)
```
