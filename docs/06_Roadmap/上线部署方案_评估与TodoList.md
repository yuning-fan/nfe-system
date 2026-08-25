# NFE 系统上线部署方案 · 兼容性评估与 Todo List

> 评估基准：Supabase Pro + Cloudflare R2 综合方案
> 评估日期：2026-06-17
> 评估人：开发团队

---

## 一、方案概述

| 服务 | 用途 | 费用 |
|---|---|---|
| Supabase Pro | PostgreSQL 数据库（37 张表）+ Auth + Realtime | $25/月 |
| Cloudflare R2 | 文件存储（证件、报告、课件、头像等） | $0–5/月（前 10GB 免费） |
| **合计** | | **约 $25–30/月** |

**分桶规划：**

```
student-docs/   ← 签证、保险、护照（student_documents.file_url）
reports/        ← PDF 报告（reports.pdf_url）
materials/      ← 课件（schedules.material_url）
resources/      ← 资料库（resources 表）
avatars/        ← 头像（profiles.avatar_url）
```

---

## 二、兼容性评估结果

### ✅ 完全支持的部分（无需改动）

| 方案要素 | 现状 | 结论 |
|---|---|---|
| Supabase PostgreSQL 承载 37 张表 | 37 张表已在 Supabase 本地实例验证通过 | ✅ 直接迁移 |
| Auth 绑定 `profiles.id` | 全代码已使用 `supabase.auth`，`user.id` 关联 `profiles.id` | ✅ 无需改动 |
| 环境变量切换 | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` 已外置 `.env` | ✅ 只需改两个变量 |
| 数据库字段只存 URL 字符串 | `file_url`、`pdf_url`、`material_url` 等均为 `TEXT` 类型 | ✅ 与 R2 天然兼容 |
| RLS 基础策略已建 | 37 张表均有 `authenticated` 级 SELECT/INSERT/UPDATE Policy | ✅ 框架已有，需细化 |

---

## 三、上线前 Todo List（必做项）

### 🔴 高优先级：安全加固（上线前必须完成）

- [ ] **细化 RLS Policy**：当前所有表的 Policy 是 `authenticated` 用户通吃，登录的学生可以访问所有教职工数据。需按 `profiles.role` 进行行级权限拆分。

  **示例模板：**
  ```sql
  -- 学生只能看自己的每日打卡记录
  CREATE POLICY "students_see_own_daily_checks"
  ON daily_checks FOR SELECT
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'tutor', 'driver')
    )
  );
  ```
  需要精细化的表（优先级从高到低）：
  - `student_documents`（护照、签证等敏感文件）
  - `students_info`（个人信息）
  - `violation_logs`、`warning_letters`（风控记录）
  - `communication_logs`（沟通日志）
  - `student_credentials`（账号密码）

- [ ] **敏感文件桶关闭公开访问**：`student-docs/` 桶在 R2 中设置为私有，对外接口改用预签名 URL（有时效限制，防止链接外泄）。

### 🟡 中优先级：功能完善（MVP 后尽快补充）

- [ ] **文件上传组件开发**：当前代码中无任何文件上传逻辑（无 `supabase.storage` 或 R2 S3 API 调用）。所有 `file_url` 字段目前为空。需开发统一的上传组件，支持：
  - 上传证件（`student_documents`）
  - 上传课件（`schedules.material_url`）
  - 上传报告（`reports.pdf_url`）
  - 头像上传（`profiles.avatar_url`）

- [ ] **生产环境变量配置**：创建 `.env.production` 文件，配置：
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  VITE_R2_PUBLIC_ENDPOINT=https://pub-xxx.r2.dev
  ```

### 🟢 低优先级：优化项（跑起来后再做）

- [ ] **Realtime 推送接入**：`notifications` 表已建，但代码里没有 `supabase.channel().subscribe()` 调用。当前通知只能刷新页面查看，无主动推送。升 Pro 后可低成本接入。

- [ ] **`audit_logs` 归档策略**：该表会随着操作积累无限增长，上线一段时间后需制定归档或定期清理策略（A 层核心表保留 12 个月、B 层高频表保留 3 个月）。原 `log_audit_operations` 已于 2026-08-21 drop 并由 `audit_logs` 取代。

- [ ] **Supabase 计算实例监控**：观察查询性能，如出现慢查询再考虑升级计算实例（当前 Pro 默认 2 核足够 MVP 阶段）。

---

## 四、分阶段执行计划

```
现在（开发阶段）
✅ Supabase 免费层跑开发环境
✅ 37 张表结构已验证
[ ] R2 直接开通，免费额度内建立正确目录结构
[ ] 上传逻辑统一走 R2（从第一天建立正确结构）

上线前（正式切换）
[ ] Supabase 升 Pro，开启自动备份
[ ] 细化 RLS Policy（高优先级 - 见上方）
[ ] 敏感文件桶改预签名 URL
[ ] 配置 .env.production

上线后（持续优化）
[ ] 观察 Supabase 计算性能
[ ] 接入 Realtime 通知
[ ] 制定审计日志归档策略
[ ] R2 超 10GB 后按实际用量付费
```

---

## 五、与旧方案（阿里云/AWS）的对比

| 对比维度 | 旧方案（ECS + RDS MySQL）| 新方案（Supabase + R2）|
|---|---|---|
| 月费用 | ~$30–60/月 | ~$25–30/月 |
| 运维复杂度 | 高（需自行维护服务器、备份、SSL）| 低（全托管）|
| Auth 集成 | 需自建或接第三方 | 内置，直接绑定 profiles |
| 实时推送 | 需额外搭建 WebSocket | 内置 Realtime |
| 迁移风险 | 高（需改写数据库连接层）| 无（当前代码全基于 Supabase）|
| **推荐** | ❌ 不推荐 | ✅ **推荐，直接执行** |

> **结论**：综合方案（Supabase Pro + Cloudflare R2）与现有系统架构 **90% 兼容**，可以直接执行。唯一必须在上线前完成的是 RLS 细化，否则存在数据越权安全风险。
