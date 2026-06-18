// Edge Function: r2-sign
// 为前端生成 Cloudflare R2 的预签名 URL（上传 PUT / 下载 GET）。
// R2 Secret 仅存在于本函数的环境变量中，绝不下发到前端。
//
// 请求（需带 Supabase 登录态 Authorization: Bearer <jwt>）：
//   POST { action: "upload" | "download", bucket: string, key: string, contentType?: string }
// 返回：
//   { url: string, key: string }   // url 即预签名地址，有时效

import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID")!;
const ACCESS_KEY = Deno.env.get("R2_ACCESS_KEY_ID")!;
const SECRET_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
const R2_ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

// 允许的桶白名单（防止前端写任意桶名）
const ALLOWED_BUCKETS = ["student-docs", "materials", "reports", "avatars", "resources"];
// 仅 admin/manager 可访问的敏感桶
const ELEVATED_BUCKETS = ["student-docs"];

const UPLOAD_EXPIRES = 300; // 上传 URL 有效 5 分钟
const DOWNLOAD_EXPIRES = 600; // 下载 URL 有效 10 分钟

const aws = new AwsClient({
  accessKeyId: ACCESS_KEY,
  secretAccessKey: SECRET_KEY,
  region: "auto",
  service: "s3",
});

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

  // 1. 校验登录态
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "未登录" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: "登录态无效" }, 401);

  // 2. 解析参数
  let payload: { action?: string; bucket?: string; key?: string; contentType?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "请求体非法" }, 400);
  }
  const { action, bucket, key } = payload;

  if (!action || !bucket || !key) return json({ error: "缺少 action/bucket/key" }, 400);
  if (!ALLOWED_BUCKETS.includes(bucket)) return json({ error: "非法的桶名" }, 400);
  if (action !== "upload" && action !== "download") return json({ error: "action 必须是 upload 或 download" }, 400);

  // 3. 敏感桶的角色校验（仅 admin/manager）
  if (ELEVATED_BUCKETS.includes(bucket)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "manager"].includes(profile.role)) {
      return json({ error: "无权限访问敏感文件桶" }, 403);
    }
  }

  // 4. 生成预签名 URL
  const method = action === "upload" ? "PUT" : "GET";
  const expires = action === "upload" ? UPLOAD_EXPIRES : DOWNLOAD_EXPIRES;
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const target = `${R2_ENDPOINT}/${bucket}/${encodedKey}?X-Amz-Expires=${expires}`;

  const signed = await aws.sign(target, {
    method,
    aws: { signQuery: true },
  });

  return json({ url: signed.url, key });
});
