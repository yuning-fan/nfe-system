# NFE 系统云端部署手册

> 本目录由本地真实数据库导出，是上云的唯一可信来源。
> 生成日期：2026-06-18

---

## 🟢 日常运维速查（上线后最常用）

> **2026-06-19 起：本地开发已直连云端，不再依赖 Docker。** `.env.local` 已指向云端 Supabase，
> 本地 `npm run dev` 看到的就是云端真实数据。**Docker 可永久关闭**（Docker Desktop 可直接退出）。
> ⚠️ 注意：本地改数据 = 改云端真实数据，勿在本地乱填测试数据。
> 如需切回本地 Docker 库：`npx supabase start` 后把 `.env.local` 换回 `http://127.0.0.1:54321` + 本地 anon key。

**部署前端（改完页面/逻辑后）：**
```bash
cd nfe-system/nfe-admin-web
npm run build          # 看到 ✓ built 才算成功；有 error TS 先修
npx vercel --prod      # 看到 ▲ Aliased https://nfe-admin-web.vercel.app 即上线
```
> `git push` 不会自动触发部署，必须手动跑 `npx vercel --prod`。线上没更新多为浏览器缓存，按 Cmd+Shift+R。

**改了数据库（加字段/导数据）：**
```bash
# 1. 直推云端
PGPASSWORD='<密码>' psql "<云端pooler连接串>" -f 你的.sql
# 2. 重新生成前端类型
cd nfe-system
SUPABASE_ACCESS_TOKEN=<token> npx supabase gen types typescript --project-id pypznlokmhzvzscaibii > nfe-admin-web/src/types/database.types.ts
# 3. 再按上面部署前端
```

| 改了什么 | 要跑什么 |
|---|---|
| 只改前端页面/逻辑 | 部署前端三步 |
| 改表结构/导数据 | 先推 SQL + 重生成类型，再部署前端 |
| 改 R2 签名逻辑 | `supabase functions deploy r2-sign --use-api` |

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
