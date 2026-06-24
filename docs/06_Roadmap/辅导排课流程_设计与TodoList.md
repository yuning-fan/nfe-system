# 辅导排课流程 · 补全设计与 TodoList

> **创建日期**：2026-06-24
> **目标**：把辅导排课从"只到 scheduled、无销课/缺勤/反馈/调课"补成完整生命周期，并把"辅导课缺勤"接入风险评分。
> **关联**：《风险评分系统_设计与TodoList》§3.5（辅导课出勤 −8）。

## 已定口径（2026-06-24）
1. **课时在"销课完成"时扣**（不再审批时预扣）。
2. **请假不扣课时、不扣风险分**；**无故缺勤才扣课时 + 风险分 −8**；出席正常扣课时。
3. **调课闭环一起做**（申请→改期→审批）。

---

## 一、完整生命周期

```
[新建排课申请] 学管/admin 或辅导发起
   status = pending_approval
      │
   ┌──┴── 审批（学管/admin）
   │
 通过 → scheduled（待上课）          拒绝 → 删除
   │
   │  到点上课，辅导老师在「上课记录」销课，三选一：
   ├─ 出席   → completed  ＋填反馈(公开/内部/作业) ＋扣课时
   ├─ 无故缺勤 → absent    ＋写 daily_checks(tutoring,absent)→风险−8 ＋扣课时
   └─ 请假   → leave      ＋写 daily_checks(tutoring,leave)  ＋不扣课时、不扣风险
   │
   │  需要改时间：
   └─ 调课 → rescheduling → 改期+审批 → 回 scheduled（schedule_changes 留痕）
              取消 → cancelled（未销课，不扣课时）
```

## 二、状态机（schedule_status）

| 状态 | 含义 | 课时 | 风险 |
|---|---|---|---|
| pending_approval | 待审批 | — | — |
| scheduled | 已排课待上课 | — | — |
| completed | 已上课（出席） | 扣 | — |
| absent | 无故缺勤 | 扣 | −8 + daily_checks |
| leave | 请假 | 不扣 | 不扣（仅 daily_checks 留痕） |
| cancelled | 已取消 | 不扣 | — |
| rescheduling | 调课中 | — | — |

## 三、要改的地方

### 数据库
- `schedule_status` 枚举新增：`absent`、`leave`、`cancelled`。（`completed`/`rescheduling` 已存在）
- 反馈字段（feedback_public / feedback_internal / homework_content）、`schedule_changes` 均已就绪，无需加表。

### useScheduleStore（store/useScheduleStore.ts）
- **改** `approveSchedule`：去掉审批时扣课时（改到销课）。
- **加** `completeSchedule(id, { outcome, feedback_public, feedback_internal, homework })`：
  - outcome=present → status=completed + 写反馈 + 扣课时。
  - outcome=absent → status=absent + 写反馈(可空) + 扣课时 + 写 daily_checks(tutoring,absent) + recomputeRisk。
  - outcome=leave → status=leave + 写 daily_checks(tutoring,leave) + 不扣课时、不重算。
- **加** `requestReschedule(id, newStart, newEnd, reason)`：status=rescheduling + 写 schedule_changes(pending)。
- **加** `approveReschedule(changeId)` / `rejectReschedule(changeId)`：通过则改 schedules 时间并回 scheduled；驳回回 scheduled。
- **加** `cancelSchedule(id, reason)`：status=cancelled（未销课不退课时，因为还没扣）。
- 扣课时逻辑抽成内部函数 `deductHours(schedule)`，销课/缺勤复用。

### 页面
- **辅导工作台「上课记录」**（staff/pages/tutor.tsx TutorRecords，现为 mock）→ 真功能：
  - 列出"我的课"（按 tutor_id），分 待上课 / 已销课 两区。
  - 每节课「销课」→ 弹窗选 出席/缺勤/请假 + 填反馈/作业 → 调 completeSchedule。
  - 「申请调课」→ 选新时间+原因 → requestReschedule。
- **辅导「我的课表」**（TutorSchedule，现 mock）→ 可后续接真排课展示（本轮可选）。
- **admin/学管「排课管理」**（TutorScheduleManagement）→ 加调课审批入口（待审批调课列表）。

### 风险引擎
- 已支持 daily_checks(tutoring) 缺勤计分，无需改。leave 状态引擎本就忽略。

## 四、TodoList（建议顺序）
1. [x] 迁移：schedule_status 加 absent/leave/cancelled。（`20260624140000_schedule_status_outcomes.sql`）2026-06-24
2. [x] store：approveSchedule 去预扣；加 completeSchedule / cancelSchedule + deductHours + writeTutoringCheck。
3. [x] 辅导「上课记录」销课 UI（出席/缺勤/请假 + 公开反馈/内部备注/作业，限今天及以前）。`staff/pages/tutor.tsx` TutorRecords。
4. [x] store：requestReschedule / approveReschedule / rejectReschedule；辅导端「申请调课」+ 排课管理「调课审批」tab（学管+admin 可批）。
5. [ ] 收尾：辅导「我的课表」接真数据（可选，仍 mock）。

> **需执行**：把迁移 `20260624140000_schedule_status_outcomes.sql` push 到云端 DB（同前：Supabase SQL 编辑器粘贴或 `supabase db push`）。

## 五、口径补充（2026-06-24 定）
- **销课时限**：只能给"今天及以前"的课销课，未到的课不允许销。
- **调课审批人**：学管 + admin 均可审批。
- 反馈"公开反馈"是否即时进双周报告引用（与报告模块联动）—— 二期再做。
