// Edge Function: meal-signup
// 供未来「微信小程序」学生端调用的报餐 API 契约。
// 本轮不接微信账号（AppID/AppSecret 待申请）——wx_login 仅留 TODO 与契约，
// get_plan / submit 已可用（用 service role 读写，身份先按传入 student_id）。
//
// 请求（POST JSON）：
//   { action: "get_plan",  student_id, date }                         → 当天该生所在公寓的排餐
//   { action: "submit",    student_id, plan_id, breakfast, lunch, dinner } → upsert 报餐
//   { action: "wx_login",  code }                                     → TODO：换 openid 定位 student
//
// ⚠️ 安全待补：openid→student 校验就位前，submit/get_plan 直接信任传入的 student_id，
//    仅供联调；上线小程序时改由 wx_login 颁发的会话解析 student_id。
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// service role 客户端：绕过 RLS，直接读写报餐相关表
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// 取某学生当前在住公寓
async function buildingOfStudent(studentId: string): Promise<string | null> {
  const { data } = await admin
    .from("dorm_assignments")
    .select("dorms(building_name)")
    .eq("student_id", studentId)
    .eq("is_active", true)
    .maybeSingle();
  // deno-lint-ignore no-explicit-any
  return (data as any)?.dorms?.building_name ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // deno-lint-ignore no-explicit-any
  let p: any;
  try {
    p = await req.json();
  } catch {
    return json({ error: "请求体非法" }, 400);
  }
  const action = p?.action;

  // ---- 学生查看当天排餐 ----
  if (action === "get_plan") {
    const { student_id, date } = p;
    if (!student_id || !date) return json({ error: "缺少 student_id/date" }, 400);
    const building = await buildingOfStudent(student_id);
    if (!building) return json({ error: "未找到该学生的在住公寓" }, 404);

    const { data: plan } = await admin
      .from("meal_plans")
      .select("id, building_name, meal_date, mode, breakfast_menu, lunch_menu, dinner_menu, signup_deadline")
      .eq("building_name", building)
      .eq("meal_date", date)
      .maybeSingle();
    if (!plan) return json({ plan: null }); // 当天未排餐

    const { data: signup } = await admin
      .from("meal_signups")
      .select("breakfast, lunch, dinner")
      .eq("plan_id", plan.id)
      .eq("student_id", student_id)
      .maybeSingle();

    return json({ plan, signup: signup ?? null });
  }

  // ---- 学生提交报餐 ----
  if (action === "submit") {
    const { student_id, plan_id, breakfast, lunch, dinner } = p;
    if (!student_id || !plan_id) return json({ error: "缺少 student_id/plan_id" }, 400);

    const { data: plan } = await admin
      .from("meal_plans")
      .select("id, signup_deadline")
      .eq("id", plan_id)
      .maybeSingle();
    if (!plan) return json({ error: "排餐不存在" }, 404);
    if (plan.signup_deadline && new Date(plan.signup_deadline).getTime() < Date.now()) {
      return json({ error: "报餐已截止" }, 409);
    }

    const { error } = await admin
      .from("meal_signups")
      .upsert(
        {
          plan_id,
          student_id,
          breakfast: !!breakfast,
          lunch: !!lunch,
          dinner: !!dinner,
          source: "miniprogram",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "plan_id,student_id" },
      );
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  // ---- 微信登录换 openid（TODO：账号申请下来后接入）----
  if (action === "wx_login") {
    const appid = Deno.env.get("WX_APPID");
    const secret = Deno.env.get("WX_APPSECRET");
    if (!appid || !secret) {
      return json({ error: "微信小程序账号未配置（WX_APPID/WX_APPSECRET 待设置）", todo: true }, 501);
    }
    // TODO: 用 code 调 https://api.weixin.qq.com/sns/jscode2session 换 openid，
    //       再查 student_wx_bindings 得 student_id，颁发会话。
    return json({ error: "wx_login 尚未实现", todo: true }, 501);
  }

  return json({ error: "未知 action" }, 400);
});
