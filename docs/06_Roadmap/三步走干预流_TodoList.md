# 三步走干预流 · 开发 TodoList

> 创建日期：2026-06-18
> 优先级：高（Phase 3 最后一块核心业务）

---

## 现状说明

底层已完成约 60%：
- `useRiskStore.ts` — `issueWarning`、`approveWarning`、`markWarningSigned` 已实现
- `WarningLetterModal.tsx` — 发起弹窗已完成
- `RiskAlerts.tsx` — 待审批列表和"批准下发"按钮已有

---

## Task 1 — 修 approveWarning 风险分逻辑
- **文件**：`src/pages/Risk/RiskAlerts.tsx`
- **工时估计**：30 分钟
- **状态**：[ ] 待完成

**问题**：`RiskAlerts.tsx` handleApprove 中写死了 `warning.warning_level >= 2 ? 'red' : 'yellow'` 和扣分逻辑，与文档不符。

**正确逻辑**（对照 `05_Workflows/三步走干预流.md`）：
- Level 1 (Verbal) → risk_level = `yellow`，扣 **0** 分
- Level 2 (Written) → risk_level = `yellow`，扣 **10** 分
- Level 3 (Final) → risk_level = `red`，扣 **20** 分

---

## Task 2 — 补"拒绝"按钮逻辑
- **文件**：`src/store/useRiskStore.ts` + `src/pages/Risk/RiskAlerts.tsx`
- **工时估计**：1 小时
- **状态**：[ ] 待完成

**内容**：
1. Store 中新增 `rejectWarning(warningId: number)` 方法，将 `warning_letters.status` 更新为 `rejected`
2. `RiskAlerts.tsx` 拒绝按钮接入 `Modal.confirm` 确认弹窗，成功后刷新待审批列表

---

## Task 3 — 修复审批后大盘数据刷新时序
- **文件**：`src/pages/Risk/RiskAlerts.tsx`
- **工时估计**：15 分钟
- **状态**：[ ] 待完成

**问题**：`handleApprove` 成功后调用了 `fetchDashboardData()` + `fetchPendingWarnings()`，但可能存在异步时序问题导致红/黄学生列表和风险分未能即时更新。需加 `await` 确保顺序执行。

---

## Task 4 — 已下发警告信历史归档区块
- **文件**：`src/store/useRiskStore.ts` + `src/pages/Risk/RiskAlerts.tsx`
- **工时估计**：2 小时
- **状态**：[ ] 待完成

**内容**：
1. Store 中新增 `issuedWarnings` state 和 `fetchIssuedWarnings()` 方法，查询 `status IN ('issued', 'signed_onsite')` 的记录
2. `RiskAlerts.tsx` 在"待审批"区块下方新增"已下发警告记录"折叠区块
3. 每条记录提供"标记已签字"按钮，接入已有的 `markWarningSigned()`

---

## Task 5 — 学生详情页嵌入警告历史卡片
- **文件**：`src/pages/Students/StudentDetail.tsx`
- **工时估计**：1.5 小时
- **状态**：[ ] 待完成

**内容**：在学生档案页新增"警告记录"卡片，展示该学生所有历史警告（按时间倒序，含级别、佐证、发起人、状态），让学管无需跳转即可查看完整干预历史。

---

## 执行顺序

```
Task 1 修 bug → Task 2 拒绝按钮 → Task 3 刷新时序
                                          ↓
                        Task 4 历史归档 → Task 5 详情页嵌入
```

Task 1–3 修缮现有功能，预计半天内完成。
Task 4–5 补全完整闭环，另需半天。
