-- ============================================================
-- 成绩总表 RPC —— 学管看全员成绩（绕过 grade_records 的学生维度 RLS）
--
-- 背景：11-18 上线的「成绩总表」页要做全员横比——科均分、科中位、科内排名、
-- 每科最低 N 人的风险名单。10-26 给 grade_records 上了 can_see_student RLS 之后，
-- manager（学管）只读得到自己名下学生的成绩行，于是这些统计量全部按子集算，**算错**：
--
--   学管   名下学生  能看到的成绩/全部   Statistics 科均分（看到的 / 实际）
--   Gris      12       95 / 520            89.4 / 71.0      ← 差 18 分
--   Leia      18      188 / 520            74.2 / 71.0
--   Ryan      20      237 / 520               -  / 71.0
--
-- Gris 只看得到 39 名出分学生里的 5 个，多数科目还会掉到 MIN_COHORT=4 以下、
-- 被归进「人数不足」，风险名单几乎是空的。这跟 10-30 家长报告「同批对比人数缩水」
-- 是同一个根因的第二次发作。
--
-- 与 cohort_grades 的区别：那个只吐匿名分数（报告只需要分布），本函数**必须返回
-- student_id**——成绩总表的产出就是「点名谁该补课」。所以这是一次有意的、
-- 针对本页的授权放宽，按角色收口：仅 admin / manager / patrol 可执行。
-- 生活老师（公寓维度）等其余角色拿不到，grade_records 表本身的 RLS 也原样不动，
-- 学生档案、家长报告、违规记录等其它入口仍按 can_see_student 收窄。
-- ============================================================
create or replace function public.grade_overview_grades()
returns table (
  student_id  uuid,
  milestone_id int,
  score       numeric,
  status      text,
  recorded_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $fn$
  select g.student_id, g.milestone_id, g.score, g.status, g.recorded_at
    from public.grade_records g
   where g.score is not null
     -- 角色闸门写在函数体里：SECURITY DEFINER 已绕过 RLS，这里是唯一的把关处
     and exists (
       select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role::text in ('admin', 'manager', 'patrol')
     );
$fn$;

comment on function public.grade_overview_grades() is
  '成绩总表页用：全员成绩行（student_id/milestone_id/score/status/recorded_at）。SECURITY DEFINER 绕过 grade_records 的 can_see_student RLS，仅 admin/manager/patrol 可执行——全员横比的科均分/中位/排名必须基于全体，否则按子集算会得出错误结论。';

revoke all on function public.grade_overview_grades() from public;
grant execute on function public.grade_overview_grades() to authenticated;
