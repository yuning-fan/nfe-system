# 风险评分系统 · 设计口径与实现 TodoList

> **创建日期**：2026-06-23 · **状态核对**：2026-07-12
> **目标**：把风险预警从「全员绿 100、纯手动」做到「客观指标自动算分 + 自动升降级 + 人工覆盖」可跑起来的程度。
> **依据**：《NFE_系统方案说明书_v2_0.docx》3.8 风险评分系统、《课后定向培养与自习室管理规定》、名校/绿通合约、staff 工作台原型。
>
> **2026-07-12 盘点结论**：专项完成度约 75–80%，核心链路（录入→即时算分→自动升降级→明细透明）已可跑。
> 超出本档范围的已完成项：预警亮红灯双红线体系（Phase 20）、扣分/阈值全量配置化（Phase 21，`risk_config` 表 + 系统配置页）。
> 剩余未做：等级变更通知推送、学生档案风险折线图、`warning_letter_violations` 联动写入（详见各 Step 标注）。

---

## 0. 现状（为什么要做）

- `students_info.risk_level` / `total_risk_score` 是**纯手动字段**，当前 52 人全是 green / 100，从未变过。
- **没有任何自动算分**（无触发器 / 函数 / 定时任务 / Edge Function）。
- 唯一会改风险的途径 = 三步走警告信审批（`useRiskStore.approveWarning` 手动扣分）。
- 风险页 = 读 `risk_level` 字段分红黄绿桶 + 变更日志 + 警告信流程。
- **上游数据缺失**：缺勤/晚归/违规对应的录入 UI（晚自习点名 / 违规登记）尚未建，`violation_logs`、`daily_checks` 几乎空。

---

## 1. 合约/企划给出的硬约束（口径之锚）

- **出勤率 ≥ 95%**（主合约，挂钩"保录取"与退费）→ 低于 95% 触发书面警告。
- 晚自习 **18:00 全体点名**，每 30 分钟巡查。
- 电子设备：**1 小时内同一学生 2 次**违规（手机/闲聊/睡觉）= 记 1 次"表现不佳"入违约档案。
- 请假须**提前 24h 群内留痕 + 双重确认**，否则视为**无故缺勤**。
- 因身体/精神原因缺勤，**事后有医证可不计入**出勤考核。
- 三步走警告：口头通报 → 电子警告信 → 现场签字；**累计 3 封 = 严重违约**。
- 企划 3.8 客观指标：15 天内缺勤次数、晚归次数、自习违规次数、成绩低于阈值次数、违纪数；主观：情绪/生活适应/家长反馈。

---

## 2. 评分口径（确定方案）

> 100 分制、扣分制、**15 天滚动窗口**；沿用现有 `total_risk_score`（满分 100，扣分越多越危险），与现有审批扣分逻辑一致。

### 2.1 客观指标（系统自动算）✅ 本期重点

| 指标 | 数据源 | 口径 | 扣分 |
|---|---|---|---|
| 缺勤（无医证 / 未留痕请假） | `daily_checks` status='absent' | 每次 | −8 |
| **连续缺勤 ≥ 3 天** | `daily_checks` | 硬触发 | **直接红** |
| 出勤率 < 95% | `daily_checks` 周期统计 | 周期内 | 触发警告流程 |
| 晚归未报备 | `violation_logs`(type=晚归) | 每次 | −5 |
| 自习违规（"表现不佳"） | `violation_logs` | 每条（=1h 内 2 次） | −5 |
| 严重违纪 | `violation_logs` | 每条 | −10 |
| 成绩低于阈值 | 成绩记录 | 每科 | −6 |
| 证件临期 | `student_documents` expiry_date | ≤30 / 14 / 7 天 | −5 / −10 / −20 |
| 欠费 | `student_fees` | 到期未缴 | −10 |
| 警告信累计 | `warning_letters` | 第 1 / 2 / 3 封 | −10 / −20 / **直接红** |

### 2.2 主观指标（老师手动录入，可选，二期）

- 情绪：稳定 0 / 需关注 −5 / 异常 −15
- 生活适应、家长反馈频繁度（待细化）

### 2.3 等级映射

- 🟢 绿 ≥ 85
- 🟡 黄 60–84（或任一主观"需关注"）
- 🔴 红 < 60，或命中任一硬触发（连续缺勤≥3 天 / 第 3 封警告 / 签证≤7 天）

### 2.4 通知与留痕（企划）

- 绿 → 黄：推送分管学管 + 生活老师。
- 黄 → 红：推送管理员 + 学管 + 生活，并驾驶舱置顶。
- 所有变更写 `log_risk_changes`，`trigger_type = auto / manual_override`，记操作人/时间/原因。
- **扣分值与阈值放系统配置页可调**（一期可先写常量，二期接配置）。

---

## 3. 数据模型现状（好消息：基本就绪）

- **`daily_checks`** 一张表覆盖三种点名：`check_type` 枚举 = `morning` / `night_study` / `dorm_check`；`status` = `present` / `absent` / `leave`；含 student_id / staff_id / notes / created_at。**查寝（DormCheck）已在写这张表**。
- **`violation_logs`** 已有 `reason`、`deduction_points`、reporter_id；**缺** `violation_type`、`status`（审批/存档）两列，需小迁移。
- `student_documents`（expiry_date）、`student_fees`、`warning_letters` 均已有真实数据/逻辑。

---

## 3.5 录入分工（2026-06-24 定稿）—— 扣分分散到各角色面板，自动汇总

> 核心原则：**学管 / admin 不手动录扣分**。各角色在自己的工作面板做日常动作（点名、违规、成绩），系统**录入即时重算**该学生 15 天窗口总分 → 自动升降级 → 汇总到学管 / admin 看板。

| 录入角色 | 面板 / 动作 | 指标 | 扣分 | 落表 |
|---|---|---|---|---|
| 巡查老师 | 晚自习点名（标缺席） | 晚自习出勤 | −8 | `daily_checks` type=night_study |
| 巡查老师 | 自习违规（手机/睡觉/闲聊） | 自习违规 | 每次 −5 | `violation_logs` |
| 生活老师 | 早上出勤确认（标未出门） | 学校上课出勤 | −8 | `daily_checks` type=morning |
| 生活老师 | 晚归登记 | 晚归未报备 | −5 | `violation_logs` |
| 生活老师 | 查寝（异常，可开关、扣分可配） | 查寝异常 | 可配置 | `daily_checks` type=dorm_check |
| 辅导老师 | 上课记录（标缺席） | 辅导课出勤 | −8 | `daily_checks` type=tutoring（需加枚举） |
| 学管老师 | 学业跟进 / 违纪处理 | 成绩低于阈值 / 严重违纪 | −6 / −10 | 成绩记录 / `violation_logs` |
| 系统自动 | 无需人录 | 证件临期 / 欠费 / 警告信累计 | 按 §2.1 | 已有表 |
| 学管 / admin | 只读汇总看板 + 警告信审批 + 人工微调 | — | — | — |

- **三种出勤分开统计**：晚自习（巡查）/ 学校上课（生活早上确认）/ 辅导课（辅导老师），各自的人录各自的，互不混。需给 `daily_checks.check_type` 增加 `tutoring` 枚举值。
- 旧集中式 `/violations` 页 → 改为**只读汇总看板**（全校违规 + 扣分明细），不再作为手动录入主入口。
- 算分时机：**录入即时重算**（事件触发），不等定时任务。

---

## 4. 实现 TodoList（按顺序，目标=跑起来）

### Step 1 · 违规登记（产出违纪/晚归数据，接已有警告信流程）✅ 2026-06-23
- [x] 迁移：`violation_logs` 加 `violation_type text`、`status text`（pending/archived），登记 migration + 重生成类型。（`20260623220000`）
- [x] 新建违规登记页/弹窗：选学生 + 类型（缺席自习/手机使用/晚归/睡觉/闲聊/严重违纪/其他）+ 原因 + 扣分（按类型预设默认值）+ reporter_id。（`pages/Risk/ViolationLog.tsx`，路由 `/violations`，侧栏「违规记录」）
- [x] 近期违规列表 + 状态流转（待存档→已存档）+ 搜索/状态筛选/分页。
- [x] 「申请警告信」按钮接现有三步走（复用 `WarningLetterModal` + `useRiskStore.issueWarning`）。
- 备注：违规与警告信的 `warning_letter_violations` 关联表暂未联动写入（可后续补，使风险扣分追溯到具体违规）。**2026-07-12 核对：仍未联动**——`useRiskStore.issueWarning` 只写 `warning_letters`；学生档案侧已有该关联表的读取（`useStudentStore`），补写入即可闭环。已在代码中加 TODO 标注。

### Step 2 · 晚自习点名 + 早上出勤（产出缺勤数据）
- [x] 通用点名组件 `src/staff/components/RollCall.tsx`，传 `check_type`（night_study / morning / tutoring）复用。2026-06-24
- [x] 逐人三态（在场/缺席/请假）+ 备注，批量 insert `daily_checks`；提交后对涉及学生即时 `recomputeRisk`。
- [x] 历史点名记录（近 30 天，按日期汇总 应到/在场/缺席/请假）。
- [x] store 通用方法 `useDailyCheckStore.submitDailyChecks(checkType, records)`，`submitDormChecks` 改为委托它。
- [x] **巡查 · 晚自习点名**已接真功能（`staff/pages/patrol.tsx` PatrolRollcall → `<RollCall checkType="night_study">`，应到=全体在读）。
- [x] **生活 · 早上出勤**已接真功能（`staff/pages/life.tsx` LifeMorning → `<RollCall checkType="morning" scope="today_school">`，应到=今日有课学生，按 `school_timetable` day_of_week 1=周一..7=周日 + 生效区间取名单）。2026-06-24
- [x] RollCall 加 `scope`('all' | 'today_school') 名单范围开关；点名记录支持当天覆盖、历史展开改状态/删单条/删当天，改删均即时重算。
- [x] 辅导 · 上课记录缺勤——**已改道完成**（2026-06-26 Phase 19）：不走 `daily_checks(check_type='tutoring')`，改由销课时的 `schedules.status='absent'` 直接计分（撤销重销即自动消分，避免双写）。引擎侧见 `riskEngine.ts` 1b) 辅导课缺勤；`tutoring` 枚举保留但引擎跳过该类型。§3.5 表中「落表 daily_checks type=tutoring」口径随之作废。

### Step 3 · 风险自动算分引擎（核心）✅ 引擎已建 2026-06-24
- [x] 算分引擎 `src/lib/riskEngine.ts`（前端、录入即时触发）：按 §2 口径，15 天窗口统计 `daily_checks`(absent，分 night_study/morning/tutoring/dorm_check) / `violation_logs`(扣分汇总) / 警告信累计 / 证件临期 / 欠费 / 成绩低于阈值 → 算 `total_risk_score` → 映射等级（≥85 绿 / 60-84 黄 / <60 红）→ 硬触发（连续缺勤≥3天 / 第3封警告 / 证件≤7天）直接红。
- [x] 等级变化写 `log_risk_changes`（trigger_type=`system_auto`）。
- [x] 接通现有录入：违规登记保存/存档（`ViolationLog`）、查寝/点名提交（`useDailyCheckStore`）、警告信审批（`useRiskStore.approveWarning` 改为交引擎重算）后即时调用 `recomputeRisk`。
- [x] 迁移 `20260624120000_check_type_tutoring.sql`：`check_type` 加 `tutoring`。
- [x] **迁移已确认全部 push 云端**（2026-07-13 用 `supabase gen types` 对比云端核实：`check_type` 含 tutoring、`risk_config` 等表齐全，与本地 0 差异）。仅剩「首次 `recomputeAll()` 是否跑过」未确认——看风险页全员分数是否仍全 100，需要则点「一键重算全员」。
- [ ] 等级变更触发通知（驾驶舱置顶 + 推送）——**仍未做**（2026-07-12 核对）：`notifications` 等三张表已建，前端零接入；等级变更目前仅写 `log_risk_changes` 并显示在风险页「近期等级变更记录」。已在代码中加 TODO 标注。
- [x] 风险页展示自动分项明细——**已完成**：风险页「扣分明细查询」卡片，任选学生（含绿色）展示逐项扣分表格 + 硬触发 + 信息性备注（`RiskAlerts.tsx`）。人工覆盖入口保留。

### Step 4 · 收尾
- [x] 阈值/扣分接入系统配置页（可调）——**已完成**（2026-06-26 Phase 21）：`risk_config` 表全量种子（扣分项/阈值红线两类），`riskEngine.loadConfig()` 优先读配置、读不到回落代码默认；配置页 `pages/Settings/SystemSettings.tsx` 可编辑并一键按新口径重算全员。
- [ ] 学生档案风险等级旁近三个月折线（企划 3.8）——**未做**（2026-07-12 核对）：`log_risk_changes` 已有时间序列数据，缺可视化组件。已在代码中加 TODO 标注。
- [ ] 主观指标录入（二期）。

---

## 5. 待确认/可调项

- §2.1 各项**扣分数值与等级阈值**（85/60 分界）是否合理，后续按真实数据校准。
- 成绩"低于阈值"的分数线口径（按科目/加权）。
- 算分触发方式：定时（每日跑）vs 事件触发（录入即重算）vs 手动按钮——一期建议先手动/每日。
