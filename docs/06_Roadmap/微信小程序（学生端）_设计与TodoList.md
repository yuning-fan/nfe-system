# 微信小程序（学生端）· 设计与 TodoList

> 创建：2026-07-20
> 目标：给学生一个微信小程序端。首个功能 **餐食报餐**（老师排餐 → 学生报早/中/晚 → 12 点截止 → 汇总回传老师）。**以后所有学生侧功能都在本文档累积**（见§六、变更记录）。
> 现状：小程序账号**待申请**（企业认证约 1–2 周）；后端 API 契约与数据表**已就位**（admin 端本轮已建），小程序前端**未开工**。

## 一、定位与架构
- 学生端 = 微信小程序，**独立代码库**（不在 `nfe-admin-web` 内）。前端选型：原生 WXML 或 Taro / uni-app，待定。
- 后端复用现有 Supabase：小程序**调 Edge Function**（service role 读写），不直连数据表。
- 身份：`wx.login → code → 服务端 code2session 换 openid → 查 student_wx_bindings 得 student_id`。

## 二、已就位的后端（admin 端本轮已建，见开发日志 2026-07-20）
- **表**：`meal_plans`（老师排餐）、`meal_signups`（学生报餐 breakfast/lunch/dinner + source=manual/miniprogram）、`student_wx_bindings`（openid↔student，预留）、`apartment_guardians.meal_mode`（pickup/cook）。
- **Edge Function** `supabase/functions/meal-signup/index.ts`：
  - `POST { action:"get_plan", student_id, date }` → 当天该生所在公寓的排餐（菜单+截止）
  - `POST { action:"submit", student_id, plan_id, breakfast, lunch, dinner }` → 校验未过截止 → upsert 报餐（source=miniprogram）
  - `POST { action:"wx_login", code }` → **TODO**：用 `WX_APPID`/`WX_APPSECRET` 走 code2session 换 openid（账号下来再接）
- ⚠️ **安全待补**：openid→student 未接前，`submit`/`get_plan` 暂直接信任传入的 `student_id`（仅联调）；上线前必须改为由 `wx_login` 颁发的会话解析 student_id。

## 三、部署 / 运维记录
- **Edge Function 没法在 Supabase Dashboard 部署，得用 CLI**：
  ```bash
  cd nfe-system
  supabase login                          # 需个人 access token
  supabase functions deploy meal-signup
  ```
- 账号申请下来后，配置函数密钥（Dashboard → Edge Functions → Secrets，或 `supabase secrets set WX_APPID=... WX_APPSECRET=...`）。
- **部署状态（2026-07-20 REST 实测）**：`meal-signup` **未部署**（`/functions/v1/meal-signup` 返回 NOT_FOUND）。

## 四、报餐流程（首个功能）
```
老师端(admin web) 排餐(早/中/晚菜单, 截止12点)
   → 学生小程序 看菜单 → 勾 早/中/晚 → 提交(截止前)
   → 老师端「报餐结果」自动汇总每餐份数
```
学生端页面：
1. **首次绑定**：选自己名字 / 输学号 → 绑定 openid（写 `student_wx_bindings`）。
2. **报餐**：今日/明日菜单 + 早/中/晚勾选 + 提交；已报状态回显、截止前可改。
3. 截止后只读。

## 五、TodoList
**账号 / 合规（外部，阻塞项）**
- [ ] 申请并企业认证微信小程序，拿 `AppID`/`AppSecret`
- [ ] 备案、隐私协议、提交审核发布

**后端**
- [ ] 部署 `meal-signup` 函数（CLI，见§三）
- [ ] 实现 `wx_login`（code2session）+ 配 `WX_APPID`/`WX_APPSECRET`
- [ ] openid→student 首次绑定接口（写 `student_wx_bindings`）
- [ ] `submit`/`get_plan` 改为从会话解析 `student_id`（去掉信任传参）

**前端（小程序）**
- [ ] 选型：原生 / Taro / uni-app
- [ ] 登录 + 绑定页
- [ ] 报餐页（菜单 + 勾选 + 提交 + 回显）
- [ ] 截止后只读态

## 六、未来功能（学生端待累积 —— 想到就往这加）
- （占位）请假 / 外宿申请、通知查看、课表 / 成绩查看、活动报名……按需补。

## 变更记录
- **2026-07-20** 建档。记录 Edge Function 部署方式（CLI，非 Dashboard）。后端契约（meal-signup + 三张表）已就位，函数尚未部署、小程序前端未开工，均待微信账号。
