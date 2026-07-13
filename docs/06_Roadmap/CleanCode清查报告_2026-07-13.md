# Clean Code 清查报告

> ⚠️ **历史快照（2026-07-13）**：执行任何清理前必须用 `rg`/`grep` 重新盘点，勿直接按本文件的行号/计数动手。
> **依据**：《Clean Code Rules 通用模板》；**范围**：`nfe-admin-web/src`（82 文件 / 约 1.75 万行）。
> **总评**：B。架构分层与 store 职责划分合格，四处结构性违规值得排期清理，页面超长多数暂可接受。

---

## 一、量化基线（rg 盘点，Rule 11）

| 指标 | 数值 |
|---|---|
| `as any`（除 database.types.ts） | **174 处 / 47 文件**（useStudentStore 21、useAcademicStore 17、useDcgStore 9…） |
| 「选学生」下拉框重复实现 | **14 个文件** |
| 学生名单查询（students_info 联 profiles）分散自查 | ~12 个文件 |
| 风险等级→中文标签映射重复定义 | ~9 个文件（措辞不一致：干预/关注/正常 vs 红/黄/绿） |
| 页面文件 > 220 行 | 18 个（最大 StudentDetail.tsx 870 行，单组件函数） |
| store > 200 行 | 5 个（useAcademicStore 619 最大，职责尚单一） |
| 组件 > 150 行 | 1 个（RollCall 349，职责单一可接受） |
| 页面直连 supabase 绕过 store | 5 个文件 |
| `15 * 86400000` 硬编码（未 import RISK_WINDOW_DAYS） | 2 处（WarningLetterModal、patrol.tsx） |
| `toISOString().slice(0, 10)` 日期格式化散写 | 13 处 |

## 二、违规清单（按修改成本收益排序）

### V1 · 选学生下拉 + 学生名单查询重复 ×14 —— Rule 3
14 个文件各自实现「showSearch 选学生」Select，上游名单查询也各自 join `profiles`、各自排序。改一次「学生显示名/排序规则」要动十几个文件。
**方案**：抽 `components/common/StudentSelect.tsx`（内部走 `useStudentStore` 的共享名单），按 Rule 11 逐目录替换调用方，一个目录一个提交。

### V2 · `as any` 174 处 —— Rule 4
Phase 8 曾专项移除，后续新代码回退。riskEngine 去 any 时类型立刻抓出一个 null 隐患，其余 store 大概率同样埋雷。
**方案**：只做 store 层（约 60 处，收益最高），从 useStudentStore/useAcademicStore 开始；页面层的 UI 便利性 any 暂容忍。每个 store 一个提交，`tsc -p tsconfig.app.json` 兜底。

### V3 · 错误处理三模式混用 + 关键流程静默失败 —— Rule 6
store 层 throw / return false / 仅 console.error 三种并存。**最重要**：`riskEngine.recomputeRisk` 失败静默返回 null，所有调用方 fire-and-forget——点名/违规提交成功但算分失败时用户无感知（违反「关键流程不允许静默失败」）。
**方案**：① recomputeRisk 失败时由调用方 `message.warning('风险分重算失败，请稍后在风险页一键重算')`（小改，先做）；② store 错误模式统一为「throw + 页面层统一 catch 提示」，随 V2 逐 store 顺带做。

### V4 · 风险等级标签映射 ×9 + 窗口天数硬编码 —— Rule 7
**方案**：新建 `lib/riskLabels.ts` 导出 `RISK_LEVEL_LABEL` / `riskPill()`，统一措辞；两处 `15 * 86400000` 改 import `RISK_WINDOW_DAYS`。

## 三、超阈值但暂不动（记录在案）

- **StudentDetail.tsx（870 行单组件函数，≥6 组职责）**：18 个超标页面中唯一真正该拆的。拆法：按卡片抽子组件（基本信息/签证保险/课表/警告信记录），已有 PhaseFeePanel/DcgPanel/GradebookCard/FollowUpTimelineCard 先例可循。属**高风险模块**，动它必须走 Rule 10 四段式（契约→基线测试→搬运→改行为分离）。
- 其余 17 个超标页面：多为单一职责长列表页（Rule 8「行数弱于职责数」），不拆。
- 5 个页面直连 supabase（RiskAlerts/Housing/DcgPanel/PhaseFeePanel/EnrollmentModal）：Rule 2 边界渗漏，但「页面直查只读数据」已成项目惯例；新代码不再新增此模式即可，存量不强改。
- `loadConfig` 静默回落默认值：有意容错，建议失败时 `console.warn` 一次（配置与实际算分静默不一致的风险）。

## 四、合格项

状态所有权清晰（11 个 store 单一所有者、无派生值存 state）；无巨型 store；组件跨角色复用好（RollCall、ViolationLog）；hooks 干净（usePagination 17 行）；TODO(二期) 标记规范已建立；提交历史单一意图。

## 五、建议执行顺序（均为低风险清理，不必走四段式；每步独立提交）

1. **V3-①** recomputeRisk 失败提示 —— ✅ 已完成（2026-07-13）：riskEngine 加 `setRecomputeFailureHandler` 注册点（lib 层不依赖 UI），App.tsx 注册带 10s 节流的 `message.warning`，单点覆盖全部 16 个调用点；`loadConfig` 失败补 `console.warn` 留痕。
2. **V4** riskLabels 常量 + RISK_WINDOW_DAYS —— ✅ 已完成（2026-07-13）：新建 `lib/riskLabels.ts`（LABEL/PILL_CLASS/normalize），替换 StudentList/StudentDetail/staff-ui/patrol/RiskAlerts 五处映射，统一措辞为「🔴 干预 / 🟡 关注 / 🟢 正常」（staff 侧原「红色/黄色」随之变更）；两处 `15 * 86400000` 改 import `RISK_WINDOW_DAYS`；`ATTEND_LABEL` 从 riskEngine 导出，WarningLetterModal 复用。区块标题类文案（「重点干预」小节头等）系上下文文案，不纳入映射，保留。
3. **V1** StudentSelect 共享组件 + 逐目录替换（半天，消重最大头）
4. **V2/V3-②** store 层去 as any + 错误模式统一，每次一个 store（细水长流，穿插在功能开发间隙）
5. StudentDetail 拆分：**不排期**，等下次要在该页加新卡片时顺势按四段式拆。
