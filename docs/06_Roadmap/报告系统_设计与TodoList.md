# 报告系统 · 设计与 TodoList

> 创建：2026-06-28　依据：《警告信与预警体系_设计》§十 + 现有报告代码
> 目标：把现有"通用报告"拆成 **出勤报告（两周）** 与 **学术报告（月）** 两种，内容按类型自动预填真实数据，内嵌**预警提示区**（防微杜渐），支持 审核 → 导出（Word）。**家长推送先不做**。

## 一、现有基础（复用，不重建）
- 表 `reports`：`report_type`(biweekly/monthly/semester)、`content`(Json)、`period_start/end`、`status`(draft/reviewed/sent)、`reviewed_at`/`sent_at`/`pdf_url`、`student_id`、`title`。
- `store/useReportStore.ts`：`generateBiweeklyReports(period, studentIds?)`、`prefillContent`（已从 daily_checks/violation_logs/grade_records 预填）、`updateReport`、`publishReport`、`deleteReport`、`attachPdf`。
- 页面 `pages/Reports/ReportsPage.tsx`（列表+生成+状态）、`ReportEditor.tsx`（编辑器）。
- 复用：`riskEngine.computeRisk`（取预警项）、`gradeCalc.computeSubject`（学术报告的加权总评）、`WarningLetterGen` 里的 `exportDoc`（导出 Word 思路）。

## 二、两种报告（用现有 report_type）
| 类型 | report_type | 周期 | 内容侧重 |
|---|---|---|---|
| **出勤报告** | `biweekly` | 两周 | 官方出勤率+内部估算、缺勤/迟到明细、与合约线 95% 对比、违规、预警提示 |
| **学术报告** | `monthly` | 月 | 各科成绩+加权总评+是否过线、考核节点进度、辅导公开反馈、学术里程碑、预警提示 |

`content` JSON 按类型不同结构（TS 用可辨识联合）。

### 出勤报告 content
```
{ kind:'attendance',
  official_rate, internal_rate, present, absent, leave,
  absences:[{date,type,note}], violations:[{type,date,note}],
  alerts:[...], comment }
```
### 学术报告 content
```
{ kind:'academic',
  subjects:[{ name, total, passMark, pass, nodes:[{title,weight,score}] }],
  tutoring_feedback:[{date,subject,feedback}],
  milestones:[{title,due,done}],
  alerts:[...], comment }
```

## 三、预警提示区（防微杜渐核心）
每份报告顶部一块"需关注"，自动生成（复用 `computeRisk` 的 hardTriggers/notes + 规则）：
- 出勤：官方出勤率 <97% 逼近合约线 / <95% 违约 / <93% 学校线。
- 学术：某科加权总评 < pass_mark、有科目"待录多"、成绩下滑。
- 风险：当前风险等级黄/红、有内部或学校警告信。
- 无异常则显示"本期表现正常"。

## 四、功能与 Workflow
1. **生成**：选 类型（出勤/学术）+ 周期（默认：出勤=近两周、学术=近一月）+ 学生（全体/勾选）→ 批量建 draft，按类型 `prefillContent` 预填。
2. **编辑/审核**：ReportEditor 按类型渲染不同区块；老师补"综合评价"；预警区自动算、只读。draft → `reviewed`。
3. **导出**：审核后「导出 Word」（复用 exportDoc，含预警提示区、成绩表/出勤表）。
4. **发布留痕**：`publishReport` 置 `sent`（推送先不做，仅标记"已发/已导出"）。
5. **列表**：按类型/状态/周期筛选，显示每生每期报告。

## 五、要改的文件
- `store/useReportStore.ts`：`ReportContent` 改为联合类型；`generateReports(type, period, studentIds?)`（合并 biweekly/monthly）；`prefillAttendance`/`prefillAcademic` 两个预填（学术用 `computeSubject` 算各科总评，取辅导 `schedules.feedback_public`、里程碑）；预警区用 `computeRisk`。
- `pages/Reports/ReportsPage.tsx`：加类型选择 + 周期默认 + 类型/状态筛选。
- `pages/Reports/ReportEditor.tsx`：按 `content.kind` 渲染出勤版/学术版 + 预警提示区 + 导出 Word。
- 新增 `lib/reportExport.ts`（或复用 warningLetterGen 的 exportDoc）：把报告渲染成 .doc。
- 数据模型：`reports` 表字段已够，**无需迁移**（content 是 Json）。若要"报告级预警快照"可加列，本期不加。

## 六、验证（端到端）
1. 出勤报告：选近两周+某学生 → 生成 → 出勤率/缺勤/违规自动填 + 预警区(若出勤<97%高亮) → 补评价 → 审核 → 导出 Word。
2. 学术报告：选近一月 → 各科加权总评/过线/节点自动填（用刚建的 EAP mock 数据验证）→ 导出。
3. 状态流转 draft→reviewed→sent；列表按类型/状态筛选正确。

## 七、待确认 / 暂不做
- **导出格式**：建议 Word(.doc)（与警告信一致、零依赖）；PDF 二期。
- **家长推送**（微信/邮件）：先不做，仅导出/在线查看。
- **自动定时生成**（cron 每两周/每月）：先手动"按周期生成"，定时二期。
- 报告模板文案/排版细化：出一版后按你反馈调。

---

## 2026-08-11 更新：学术报告 Word 导出

**版式**（对齐线下《成绩记录表》，来源：家长实际收到的文档）
```
学生学业成绩记录表
学生姓名：X　学号：X　项目：X　周期：X
科目成绩：
  EAP（学术英语）
  ┌──────────┬────┬────┬────────┬──────┐
  │ 评估项    │占比│得分│记录时间│ 措施 │
  ├──────────┼────┼────┼────────┼──────┤
  │ ...      │ 5% │ 64%│2026/5/4│（空）│
  │ 已出加权小结│40%│56.1%│过线65 │剩余60%需均分70.8│
  └──────────┴────┴────┴────────┴──────┘
  （每科一张表）
辅导课反馈 / 综合评价 / 说明
```

**实现**：`lib/reportDocx.ts`（`buildAcademicDocx` / `downloadAcademicDocx` / `summarizeSubject`）
- 学术月报走真 `.docx`；出勤双周报仍走原 `lib/reportExport.ts` 的 HTML `.doc`
- **预览、编辑器、导出三处共用** `summarizeSubject`/`cnOf`/`fmtDate`，保证所见即所得
- 低于该科过线分标红加粗；权重未知标「待确认」且不计入小结；未来考核标「待录」
- 科目名自动中英对照（`SUBJECT_CN`）

**「措施」列系统不填**：导出后由学管在 Word 手写。
一度接了 `grade_records.note`，但该字段存的是内部备注（如「⚠️ 权重待确认」「原始分 44.5/50」），
会印进家长可见文档，故撤回。若将来要系统化管理干预记录，`note` 单字段不够（一条成绩可能多次跟进），
需单建干预记录表。

**已知不足**
- `记录时间` 取 `academic_milestones.due_date`，当前多为占位值 `2026-01-01`
- `content.subjects` 是生成报告时的快照，旧报告不含 `date` 字段，需重新生成才能看到完整效果
