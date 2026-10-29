-- ============================================================
-- RLS 学生维度隔离 · 第一步：判定函数 + 两张表试点
--
-- 背景：云端 191 条策略里 174 条条件是无脑 true，学生维度的隔离此前**只存在于前端**
-- （lib/guardedStudents.ts）。任何已登录员工拿自己的 token 直连 REST 即可读到全部学生数据。
--
-- 本次只收窄 grade_records / violation_logs 两张表，验证口径与页面不受影响后再铺开。
-- ============================================================

-- ---------- 判定函数：与前端 getVisibleStudentIds 同口径 ----------
--   admin / patrol → 全体（巡查的点名、违规登记面向全体学生）
--   manager        → students_info.nz_advisor_id = 自己
--   其余(life 等)   → apartment_guardians → dorms → dorm_assignments 公寓链路
--
-- SECURITY DEFINER 是必需的：函数内部要查 students_info，而 students_info 将来也会挂
-- 调用本函数的策略，不绕过 RLS 会无限递归。
-- 固定 search_path 防止调用方改 search_path 劫持函数解析。
create or replace function public.can_see_student(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select case
    when auth.uid() is null or target is null then false
    when (select role::text from public.profiles where id = auth.uid()) in ('admin','patrol') then true
    when (select role::text from public.profiles where id = auth.uid()) = 'manager' then
      exists (select 1 from public.students_info si
               where si.student_id = target and si.nz_advisor_id = auth.uid())
    else
      exists (select 1
                from public.apartment_guardians ag
                join public.dorms d             on d.building_name = ag.building_name
                join public.dorm_assignments da on da.dorm_id = d.id and da.is_active
               where ag.guardian_staff_id = auth.uid() and da.student_id = target)
  end;
$fn$;

comment on function public.can_see_student(uuid) is
  '当前登录员工能否看到该学生。与前端 lib/guardedStudents.ts getVisibleStudentIds 同口径，改一处要同步另一处。';

revoke all on function public.can_see_student(uuid) from public;
grant execute on function public.can_see_student(uuid) to authenticated;

-- ---------- 试点 1：grade_records ----------
drop policy if exists "Allow read access for authenticated users" on public.grade_records;
drop policy if exists "Allow insert for authenticated users"      on public.grade_records;
drop policy if exists "Allow update for authenticated users"      on public.grade_records;
drop policy if exists "Allow delete for authenticated users"      on public.grade_records;

create policy "scoped select grade_records" on public.grade_records
  for select to authenticated using (public.can_see_student(student_id));
create policy "scoped insert grade_records" on public.grade_records
  for insert to authenticated with check (public.can_see_student(student_id));
create policy "scoped update grade_records" on public.grade_records
  for update to authenticated using (public.can_see_student(student_id))
                                with check (public.can_see_student(student_id));
create policy "scoped delete grade_records" on public.grade_records
  for delete to authenticated using (public.can_see_student(student_id));

-- ---------- 试点 2：violation_logs ----------
drop policy if exists "Allow read access for authenticated users" on public.violation_logs;
drop policy if exists "Allow insert for authenticated users"      on public.violation_logs;
drop policy if exists "Allow update for authenticated users"      on public.violation_logs;
drop policy if exists "Allow delete for authenticated users"      on public.violation_logs;

create policy "scoped select violation_logs" on public.violation_logs
  for select to authenticated using (public.can_see_student(student_id));
create policy "scoped insert violation_logs" on public.violation_logs
  for insert to authenticated with check (public.can_see_student(student_id));
create policy "scoped update violation_logs" on public.violation_logs
  for update to authenticated using (public.can_see_student(student_id))
                                with check (public.can_see_student(student_id));
create policy "scoped delete violation_logs" on public.violation_logs
  for delete to authenticated using (public.can_see_student(student_id));
