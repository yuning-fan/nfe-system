-- ==========================================================
-- RLS 安全细化（上线前安全闸门）
-- 威胁模型：本系统仅员工登录（学生不登录）。
-- 目标：
--   1. 敏感表（学校账号密码、护照签证文件）仅 admin/manager 可读写
--   2. 警告信审批(UPDATE) 仅 admin/manager
--   3. 补齐教务删除功能所需的 DELETE 策略
--   4. 提供防 RLS 递归的角色判定函数
-- ==========================================================

-- ──────────────────────────────────────────────
-- 0. 角色判定辅助函数（SECURITY DEFINER 绕过 RLS，避免在 profiles 上递归）
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_elevated()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_user_role() IN ('admin', 'manager');
$$;

-- ──────────────────────────────────────────────
-- 1. student_credentials（学校平台账号密码）→ 仅 admin/manager
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.student_credentials;
DROP POLICY IF EXISTS "Allow insert for authenticated users"      ON public.student_credentials;
DROP POLICY IF EXISTS "Allow update for authenticated users"      ON public.student_credentials;

CREATE POLICY "elevated read credentials"   ON public.student_credentials FOR SELECT TO authenticated USING (public.is_elevated());
CREATE POLICY "elevated insert credentials" ON public.student_credentials FOR INSERT TO authenticated WITH CHECK (public.is_elevated());
CREATE POLICY "elevated update credentials" ON public.student_credentials FOR UPDATE TO authenticated USING (public.is_elevated());
CREATE POLICY "elevated delete credentials" ON public.student_credentials FOR DELETE TO authenticated USING (public.is_elevated());

-- ──────────────────────────────────────────────
-- 2. student_documents（护照/签证/保险/监护文件）→ 仅 admin/manager
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.student_documents;
DROP POLICY IF EXISTS "Allow insert for authenticated users"      ON public.student_documents;
DROP POLICY IF EXISTS "Allow update for authenticated users"      ON public.student_documents;

CREATE POLICY "elevated read documents"   ON public.student_documents FOR SELECT TO authenticated USING (public.is_elevated());
CREATE POLICY "elevated insert documents" ON public.student_documents FOR INSERT TO authenticated WITH CHECK (public.is_elevated());
CREATE POLICY "elevated update documents" ON public.student_documents FOR UPDATE TO authenticated USING (public.is_elevated());
CREATE POLICY "elevated delete documents" ON public.student_documents FOR DELETE TO authenticated USING (public.is_elevated());

-- ──────────────────────────────────────────────
-- 3. warning_letters：所有员工可发起(INSERT)，仅 admin/manager 可审批(UPDATE)/删除
--    （读取保留给全体员工，便于风险大盘展示）
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.warning_letters;

CREATE POLICY "elevated update warnings" ON public.warning_letters FOR UPDATE TO authenticated USING (public.is_elevated());
CREATE POLICY "elevated delete warnings" ON public.warning_letters FOR DELETE TO authenticated USING (public.is_elevated());

-- ──────────────────────────────────────────────
-- 4. 补齐教务相关删除策略（前端有删除功能：调课/选课/课表/里程碑/科目）
--    这些是常规教务操作，放给全体登录员工
-- ──────────────────────────────────────────────
CREATE POLICY "staff delete schedules"                  ON public.schedules                  FOR DELETE TO authenticated USING (true);
CREATE POLICY "staff delete subject_selections"         ON public.student_subject_selections FOR DELETE TO authenticated USING (true);
CREATE POLICY "staff delete school_timetable"           ON public.school_timetable           FOR DELETE TO authenticated USING (true);
CREATE POLICY "staff delete academic_milestones"        ON public.academic_milestones        FOR DELETE TO authenticated USING (true);
CREATE POLICY "staff delete program_subjects"           ON public.program_subjects           FOR DELETE TO authenticated USING (true);
