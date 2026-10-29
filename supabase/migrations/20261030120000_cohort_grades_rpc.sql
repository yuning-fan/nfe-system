-- ============================================================
-- 同批成绩对比 RPC —— 绕过 grade_records 的 RLS，但只返回「匿名分数」
--
-- 背景：10-26 给 grade_records 上了学生维度 RLS 后，学管导出的报告里「同批对比」
-- 只统计到自己名下学生（李菲的 Communication 显示同批 6 人，实际应为 16 人）。
-- 排名需要的是**分数分布**，不是别人的成绩行本身。
--
-- 因此不放开 RLS，改为：SECURITY DEFINER 函数只吐 (peer_key, milestone_id, score)，
-- 不含 student_id、不含姓名。peer_key 仅用于前端把同一个人的分数归组后跑 computeSubject
-- （父节点分数要由子项加权算出，所以不能只返回聚合值）。
-- ============================================================
create or replace function public.cohort_grades(p_subject_id int, p_intake date)
returns table (peer_key int, milestone_id int, score numeric)
language sql
stable
security definer
set search_path = public
as $fn$
  with peers as (
    select se.student_id,
           dense_rank() over (order by se.student_id)::int as k
      from public.student_subject_selections sss
      join public.student_enrollments se on se.id = sss.enrollment_id
     where sss.program_subject_id = p_subject_id
       and se.start_date = p_intake
       and sss.status is distinct from 'dropped'
     group by se.student_id
  )
  select p.k, g.milestone_id, g.score
    from peers p
    join public.grade_records g
      on g.student_id = p.student_id
     and g.program_subject_id = p_subject_id
   where g.score is not null;
$fn$;

comment on function public.cohort_grades(int, date) is
  '同批同科的匿名成绩（peer_key/milestone_id/score），供报告「同批对比」排名用。SECURITY DEFINER 绕过 grade_records RLS，但不返回任何可识别到人的字段。';

revoke all on function public.cohort_grades(int, date) from public;
grant execute on function public.cohort_grades(int, date) to authenticated;
