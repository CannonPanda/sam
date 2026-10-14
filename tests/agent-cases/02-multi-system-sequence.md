---
title: 支付回调握手
lang: zh
template: doc
style: off
---

## 多系统如何完成支付确认

```sequence
用户 -> 商户: 下单
商户 -> 支付网关: createPayment
支付网关 -> 商户: payUrl
用户 -> 支付网关: 付款
支付网关 -> 商户: notify(success)
商户 -> 支付网关: 200 OK
```
