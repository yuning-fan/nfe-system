# NFE 系统云端部署手册

> 本目录由本地真实数据库导出，是上云的唯一可信来源。
> 生成日期：2026-06-18

---

## 产物清单

| 文件 | 内容 | 用途 |
|---|---|---|
| `../supabase/migrations/*.sql` | 5 个 migration（结构+基础RLS） | `supabase db push` 建表 |
| `cloud_auth_users.sql` | 5 个员工登录账号（auth.users + identities） | 重建可登录账号 |
| `cloud_data.sql` | public 业务数据（57 profiles含52学生、65宿舍、选课等） | 灌入真实数据 |

**密码**：所有新员工账号初始密码 `Nfe@2026`（admin 沿用原密码）。

---

## 部署步骤

### Step 1 · 创建云端项目（你来操作）
1. 打开 https://supabase.com/dashboard → New Project
2. 记下：**Project Ref**（项目ID）、**Database Password**（数据库密码）
3. Settings → API 里复制 **Project URL** 和 **anon public key**
4. Settings → Database 里复制 **Connection string**（URI 格式，psql 用）

### Step 2 · 推送表结构（migrations）
```bash
cd nfe-system
npx supabase link --project-ref <你的Project-Ref>
npx supabase db push
```
> 这会把 5 个 migration 依次应用到云端，建好 37 张表、枚举、视图、触发器。

### Step 3 · 重建员工账号
```bash
psql "<云端Connection-String>" -f deploy/cloud_auth_users.sql
```
> 5 个账号 UUID 与业务数据中的 profile 完全对应，不会错位。

### Step 4 · 灌入业务数据
```bash
psql "<云端Connection-String>" -f deploy/cloud_data.sql
```
> 脚本内已自动禁用/恢复自动建档触发器，确保学生真实档案（性别/生日/护照等）完整写入。

### Step 5 · 细化 RLS 安全策略（上线前必做）⚠️
当前 RLS 是「登录用户通吃」，存在越权风险。待 `cloud_rls_refine.sql` 编写完成后：
```bash
psql "<云端Connection-String>" -f deploy/cloud_rls_refine.sql
```
> 此步骤尚未完成，是上线前最后一道安全闸门。

### Step 6 · 配置前端生产环境变量
在 `nfe-admin-web/` 下创建 `.env.production`：
```env
VITE_SUPABASE_URL=https://<你的项目>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

### Step 7 · 打包部署前端
```bash
cd nfe-admin-web
npm run build          # 产出 dist/
```
将 `dist/` 部署到 Vercel / Netlify / Cloudflare Pages（拖拽 dist 目录即可）。

---

## 验证清单（部署后逐项确认）
- [ ] 云端 SQL Editor 执行 `SELECT count(*) FROM profiles;` → 应为 57
- [ ] `SELECT count(*) FROM students_info;` → 应为 52
- [ ] 用 krystal@nfe.com / Nfe@2026 能登录前端
- [ ] 学生列表显示 52 人
- [ ] 学生详情页性别/生日/护照等字段有值（验证触发器禁用生效）
- [ ] RLS 细化后，学生账号无法读取教职工敏感表
