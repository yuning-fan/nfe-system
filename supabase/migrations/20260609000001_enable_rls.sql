-- ==========================================
-- NFE 系统数据库 - 启用行级安全控制 (RLS)
-- ==========================================

-- 1. 为 public schema 下的所有表启用 RLS (消除 rls_disabled_in_public 警告)
DO $$
DECLARE
    row record;
BEGIN
    FOR row IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(row.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END;
$$;

-- 2. 修改视图以修复 security_definer_view 警告
-- 默认视图在查询时使用创建者的权限 (Security Definer)。
-- 我们将其改为使用调用者的权限 (Security Invoker)。
ALTER VIEW v_course_remaining SET (security_invoker = true);

-- 3. 建立最基础的 RLS 策略 (Policies)
-- 注意：这里仅作初始化的保底策略，防止前端 API 请求完全被拒绝。
-- 真实业务中，需要根据具体业务流精细化配置。

-- (A) 允许所有已登录的管理员和教务 (role IN admin/manager) 对所有表进行增删改查
-- 在 Supabase 中，可以通过 JWT 解析出的自定义 claims 或读取 profiles 表来判断角色。
-- 简单起见，这里假设系统内部的服务端调用绕过 RLS（使用 service_role key），
-- 而前端如果请求，默认开启“仅认证用户可见”的底线防御。

DO $$
DECLARE
    row record;
BEGIN
    FOR row IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        -- 允许已登录用户读取所有数据 (后续可收紧为：学生只能看自己的)
        EXECUTE 'CREATE POLICY "Allow read access for authenticated users" ON public.' || quote_ident(row.tablename) || ' FOR SELECT TO authenticated USING (true);';
        
        -- 允许已登录用户插入数据
        EXECUTE 'CREATE POLICY "Allow insert for authenticated users" ON public.' || quote_ident(row.tablename) || ' FOR INSERT TO authenticated WITH CHECK (true);';

        -- 允许已登录用户更新数据
        EXECUTE 'CREATE POLICY "Allow update for authenticated users" ON public.' || quote_ident(row.tablename) || ' FOR UPDATE TO authenticated USING (true);';
    END LOOP;
END;
$$;
