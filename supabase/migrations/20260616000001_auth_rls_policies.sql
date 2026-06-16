-- 撤销之前放开的匿名访问策略
DROP POLICY IF EXISTS "public select profiles anon" ON public.profiles;
DROP POLICY IF EXISTS "public select students_info anon" ON public.students_info;
DROP POLICY IF EXISTS "public select student_enrollments anon" ON public.student_enrollments;
DROP POLICY IF EXISTS "public select programs anon" ON public.programs;

-- 允许登录用户 (authenticated) 访问所有学生相关信息
CREATE POLICY "authenticated select profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated select students_info" ON public.students_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated select student_enrollments" ON public.student_enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated select programs" ON public.programs FOR SELECT TO authenticated USING (true);

-- 对于 profiles，允许用户自己更新自己的记录
CREATE POLICY "authenticated update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
