# MVP 开发任务拆解与进度视图 (Roadmap)

> **当前阶段**：Phase 1 完成，正在进入 Phase 2。
> **最后更新**：2026-06

## Phase 1: 基础设施与数据底座 (已完成 ✅)
- [x] **架构选型与环境搭建**：React + Vite + TypeScript 前端脚手架，本地 Supabase 容器化后端。
- [x] **数据库 Schema 定稿**：完成 37 张核心表、视图及枚举类型的设计（V4.1）。
- [x] **种子数据注入**：编写 Python 数据清洗脚本，将真实的 Excel 补课学生数据解析并安全导入 `students_info` 等表。
- [x] **全栈联调起步**：前端引入 `@supabase/supabase-js` 与 `zustand` 状态管理。完成全局学生数据流（包含 RLS 临时放通策略），成功渲染真实数据至大盘。

## Phase 2: 核心前端页面与 CRUD (进行中 🚀)
- [ ] **学生档案详情页 (Profile Detail)**：点击学生列表后，进入详情页，展示其签证、课程、紧急联系人、风险记录。
- [ ] **动态筛选与搜索**：实现学生列表的学校、风险等级、在读状态的组合条件查询。
- [ ] **统一鉴权与 RLS 收紧**：
  - 前端搭建基于 Supabase Auth 的登录/登出页面。
  - 后端回收匿名 (Anon) 访问权限，针对 `admin`, `manager`, `tutor` 角色编写严密的 Row-Level Security 策略。

## Phase 3: 业务工作流 (待开发 ⏳)
- [ ] **教务选课流**：实现 `student_enrollments` 与 `student_subject_selections` 的连贯操作。
- [ ] **日常打卡流**：查寝打卡、接送机/日常通勤打卡模块开发。
- [ ] **三步走干预流**：针对黄/红灯学生的异常警告发放与跟进流程。

## Phase 4: 测试、部署与上线 (待开发 ⏳)
- [ ] 前端打包优化与部署 (Vercel/Netlify 等)。
- [ ] Supabase 本地环境向云端生产环境的平滑迁移。
