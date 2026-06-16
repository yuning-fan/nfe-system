-- 20260609000002_public_select_policies.sql
-- 为匿名用户开启读取权限 (仅用于开发阶段尚未接入登录时)

-- 1. profiles 表
create policy "public select profiles anon" on public.profiles
  for select to anon using (true);

-- 2. students_info 表
create policy "public select students_info anon" on public.students_info
  for select to anon using (true);

-- 3. student_enrollments 表
create policy "public select student_enrollments anon" on public.student_enrollments
  for select to anon using (true);

-- 4. programs 表
create policy "public select programs anon" on public.programs
  for select to anon using (true);
