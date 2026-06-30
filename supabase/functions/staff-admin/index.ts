// Edge Function: staff-admin
// 员工账号管理：新建员工 / 改角色 / 重置密码 / 启用停用。
// 用 service_role 调用 Supabase Auth Admin API，该密钥仅存于本函数环境，绝不下发前端。
// 调用方必须是 admin（校验其 JWT 对应 profiles.role）。
//
// 请求（需带 admin 登录态 Authorization: Bearer <jwt>）：
//   POST { action, ... }
//   - create:         { action:"create", email, password, full_name, role, phone? }
//   - update_role:    { action:"update_role", user_id, role }
//   - reset_password: { action:"reset_password", user_id, password }
//   - set_status:     { action:"set_status", user_id, status }   // status: 1 启用 / 0 停用

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STAFF_ROLES = ["admin", "manager", "tutor", "patrol", "life", "driver"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1. 校验调用方登录态
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "未登录" }, 401);
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await caller.auth.getUser();
  if (authErr || !user) return json({ error: "登录态无效" }, 401);

  // 2. 解析参数
  let p: any;
  try { p = await req.json(); } catch { return json({ error: "请求体非法" }, 400); }
  const action = p.action;

  // 3. 权限：建学生(create_student)允许任意已登录员工；其余员工账号管理动作仅 admin
  const { data: callerProfile } = await caller.from("profiles").select("role").eq("id", user.id).single();
  if (action !== "create_student" && (!callerProfile || callerProfile.role !== "admin")) {
    return json({ error: "仅管理员可管理员工账号" }, 403);
  }

  // service_role 客户端（拥有 auth admin 权限）
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (action === "create") {
      const { email, password, full_name, role, phone } = p;
      if (!email || !password || !full_name || !role) return json({ error: "缺少必填字段" }, 400);
      if (!STAFF_ROLES.includes(role)) return json({ error: "非法角色" }, 400);
      if (String(password).length < 6) return json({ error: "密码至少 6 位" }, 400);

      // 建 auth 用户（自动确认邮箱，免去验证邮件）
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name },
      });
      if (cErr || !created.user) return json({ error: cErr?.message || "创建账号失败" }, 400);

      // 建/补 profile（upsert 兼容是否存在 handle_new_user 触发器）
      const { error: pErr } = await admin.from("profiles").upsert({
        id: created.user.id, full_name, role, phone: phone || null, status: 1,
      }, { onConflict: "id" });
      if (pErr) {
        // 回滚：删掉刚建的 auth 用户，避免孤儿账号
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: "档案写入失败：" + pErr.message }, 400);
      }
      return json({ ok: true, id: created.user.id });
    }

    if (action === "create_student") {
      const { full_name, english_name, gender, phone, school_name, source_school } = p;
      if (!full_name) return json({ error: "姓名为必填" }, 400);

      // 学生暂不登录：自动生成占位邮箱/密码，仅为满足 auth 用户 + profiles 外键
      const email = `stu-${crypto.randomUUID()}@nfe.local`;
      const password = crypto.randomUUID();
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name },
      });
      if (cErr || !created.user) return json({ error: cErr?.message || "创建学生账号失败" }, 400);
      const id = created.user.id;

      // profiles（role=student）。可能有触发器自动建 students_info，故用 upsert。
      const { error: pErr } = await admin.from("profiles").upsert({
        id, full_name, role: "student", phone: phone || null, status: 1,
      }, { onConflict: "id" });
      if (pErr) {
        await admin.auth.admin.deleteUser(id);
        return json({ error: "档案写入失败：" + pErr.message }, 400);
      }

      // students_info（基础档案，触发器可能已建空行 → upsert 补字段）
      const { error: sErr } = await admin.from("students_info").upsert({
        student_id: id, english_name: english_name || null, gender: gender || null,
        school_name: school_name || null, source_school: source_school || null,
        risk_level: "green", total_risk_score: 100,
      }, { onConflict: "student_id" });
      if (sErr) return json({ error: "学生信息写入失败：" + sErr.message }, 400);

      return json({ ok: true, id });
    }

    if (action === "update_role") {
      const { user_id, role } = p;
      if (!user_id || !role) return json({ error: "缺少参数" }, 400);
      if (!STAFF_ROLES.includes(role)) return json({ error: "非法角色" }, 400);
      const { error } = await admin.from("profiles").update({ role }).eq("id", user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { user_id, password } = p;
      if (!user_id || !password) return json({ error: "缺少参数" }, 400);
      if (String(password).length < 6) return json({ error: "密码至少 6 位" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "set_status") {
      const { user_id, status } = p;
      if (user_id == null || status == null) return json({ error: "缺少参数" }, 400);
      if (user_id === user.id) return json({ error: "不能停用自己的账号" }, 400);
      const enable = Number(status) === 1;
      // profiles.status 供前端展示；ban 真正阻断登录
      const { error: sErr } = await admin.from("profiles").update({ status: enable ? 1 : 0 }).eq("id", user_id);
      if (sErr) return json({ error: sErr.message }, 400);
      const { error: bErr } = await admin.auth.admin.updateUserById(user_id, {
        ban_duration: enable ? "none" : "876000h", // 停用 ≈100年
      });
      if (bErr) return json({ error: bErr.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "未知 action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
