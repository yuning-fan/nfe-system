# 周看板（学管 + admin）· 设计与 Plan

> 创建：2026-09-10
> 目标：给学管/admin 一个「**本周回顾 + 环比上周**」的看板，一眼看清本人可见范围内学生本周的动态、异常与待办。与现有"首页驾驶舱(当下)"、"学管工作台(待处理)"互补，不重复。

## 一、定位与范围（学管 = DDL 中心）
- **核心**：学管看板主看「**名下学生本周有哪些 DDL / 要办的事**」——考核截止、报告应发、证件到期——按日期排出来，方便提前准备、催录分、提醒续签。不是泛 KPI 回顾。
- **周期**：默认「本周」（周一~周日），可 ← 上周 / 下周 → 前后翻、看近 2 周。
- **作用域**：复用 `lib/useVisibleStudents`——学管=名下学生；admin=全体（见 §四，admin 可全体 DDL 或另配 KPI）。

## 二、看板内容（DDL 中心，自上而下）
1. **周期切换条** + 顶部小结：本周 DDL 总数、**逾期未办数**、今天/明天到期数。
2. **DDL 时间线（主体）**：本周按天列出名下学生的所有截止事项，每条 = 日期 + 学生 + 类型 + 事项 + 状态。三类：
   - **考核截止**（`academic_milestones.due_date`∈周）：某科某考核在哪天截止 → 涉及名下学生 → **录成绩了吗**（`grade_records` 有无该 milestone 分；逾期未录=红，要催辅导/学管录分）。
   - **报告应发**：出勤报告(两周)/学术报告(月) 周期落在本周的学生（哪些学生本周该发报告、发了没 `reports` 有无对应期）。
   - **证件到期**（`student_documents.expiry_date`∈周/近期）：签证/保险等 → 提醒续签。
3. **逾期区（红）**：过了 due_date 仍未办的（未录成绩的考核 / 未发的报告 / 已过期证件）单独置顶。
4. **待审批**（排课/调课/警告信，复用 AcademicHome 口径）——顺带放，非 DDL 核心。

> ⚠️ 数据依赖：考核截止靠 `academic_milestones.due_date`——目前不少是占位 `2026-01-01`，需先把 EAP 等考核节点的真实日期配好（考核节点配置页），DDL 才准。

## 三、数据查询（都按 scope 过滤 student_id）
| 区块 | 表 | 过滤 |
|---|---|---|
| 考核截止 | academic_milestones + student_subject_selections（定位涉及学生）+ grade_records（是否已录） | due_date∈周；名下学生所选科目的节点 |
| 报告应发 | reports（该期是否已生成）+ 学生列表 | 周期落在本周的类型 |
| 证件到期 | student_documents | expiry_date∈周/近30天 |
| 逾期 | 上述三类 | due/expiry < 今天 且 未办 |
| 待审批 | schedules / schedule_changes / warning_letters | status=pending* |

- 考核截止涉及学生：milestone 挂在 program_subject 上（模板级），涉及"名下学生中选了该科的人"。→ 用 `student_subject_selections`（enrollment→student）反查名下学生里选了该 subject 的，逐人判断该考核成绩录了没。
- 计数/存在性用 `select('*',{count:'exact',head:true})` 或按学生聚合（参考 AcademicHome 的 headCount）。

## 四、位置与路由
- 新增组件 `pages/Dashboard/WeeklyBoard.tsx`（scope 内自洽）。
- **学管**：staffConfig academic 加导航「周看板」→ 注册 `academic/weekly` = `<WeeklyBoard/>`。
- **admin**：MainLayout 侧栏加「周看板」→ App.tsx 路由 `/weekly`。
- 两端同组件；admin scope=null 自动全体。

## 五、要改/新增的文件
- 新增 `pages/Dashboard/WeeklyBoard.tsx`（周期状态 + scope + 各查询 + KPI/榜/待办/流水渲染）。
- 复用：`useVisibleStudents`、AcademicHome 的 headCount 模式、`gradeCalc`（不及格判定可选）、现有 `pill/stat-card/card` 样式。
- `staff/staffConfig.tsx` + `staff/StaffSubPage.tsx`（学管入口）。
- `layouts/MainLayout.tsx` + `App.tsx`（admin 入口）。
- 无需迁移（纯查询聚合）。

## 六、验证
1. 学管进「周看板」→ 只统计名下学生；admin 进 → 全体。
2. 切上周/本周 → 数字与流水随周期变；环比箭头正确。
3. 用张铄 EAP mock + 近期点名/违规数据核对某周计数。
4. 榜单点击进档案；待办点击跳对应页。

## 七、待确认 / 可选二期
- 周定义：周一~周日、默认「本周」是否 OK？前后翻看近 2 周够不够？
- **admin 侧**：想跟学管一样看「全体学生 DDL」，还是 admin 走另一套（更偏 KPI 管理总览）？建议 admin 也复用同一 DDL 看板（scope=全体），需要总览再单加。
- **DDL 三类**（考核截止 / 报告应发 / 证件到期）是否都要，还是先只做**考核截止**（最核心）？
- 逾期区是否要能一键跳去录分 / 发报告。
- 导出/打印周 DDL 清单：二期。
