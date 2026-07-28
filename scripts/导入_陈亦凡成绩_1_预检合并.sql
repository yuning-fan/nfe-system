-- ============================================================
-- 陈亦凡 成绩导入 · 预检（合并版，只读）
-- 一条查询返回全部诊断信息，解决 SQL Editor 只显示最后一个结果集的问题。
-- 学生 id 已确认：edd8c78a-d0ed-46a3-91ac-94ac41b335ae
-- ============================================================
with me as (select 'edd8c78a-d0ed-46a3-91ac-94ac41b335ae'::uuid as sid),
my_programs as (
  select distinct se.program_id from public.student_enrollments se, me
  where se.student_id = me.sid
),
b_subjects as (
  select '① 项目与科目' as "区块",
         pr.name as "A", ps.id::text as "B", ps.subject_name as "C",
         ps.pass_mark::text as "D", se.start_date::text as "E"
  from public.student_enrollments se
  cross join me
  join public.programs pr on pr.id = se.program_id
  join public.program_subjects ps on ps.program_id = se.program_id
  where se.student_id = me.sid
),
c_nodes as (
  select '② 已有考核节点' as "区块",
         ps.subject_name as "A", am.id::text as "B", am.title as "C",
         coalesce(am.weight_percent::text,'—') as "D",
         coalesce('父:'||am.parent_id::text, am.milestone_type::text) as "E"
  from public.academic_milestones am
  join public.program_subjects ps on ps.id = am.program_subject_id
  where ps.program_id in (select program_id from my_programs)
),
d_weights as (
  select '③ 顶层权重合计' as "区块",
         ps.subject_name as "A", '' as "B",
         coalesce(sum(am.weight_percent) filter (where am.parent_id is null),0)::text as "C",
         count(*) filter (where am.parent_id is null)::text as "D",
         case when coalesce(sum(am.weight_percent) filter (where am.parent_id is null),0) = 100
              then '✅ 满100' else '⚠️ 不足100' end as "E"
  from public.academic_milestones am
  join public.program_subjects ps on ps.id = am.program_subject_id
  where ps.program_id in (select program_id from my_programs)
  group by ps.subject_name
),
e_grades as (
  select '④ 已录成绩' as "区块",
         coalesce(ps.subject_name,'?') as "A", g.id::text as "B",
         coalesce(am.title,'(无节点)') as "C",
         g.score::text as "D", g.status as "E"
  from public.grade_records g
  cross join me
  left join public.program_subjects ps on ps.id = g.program_subject_id
  left join public.academic_milestones am on am.id = g.milestone_id
  where g.student_id = me.sid
),
f_summary as (
  select '⑤ 汇总' as "区块",
         '科目数' as "A", (select count(*)::text from b_subjects) as "B",
         '节点数' as "C", (select count(*)::text from c_nodes) as "D",
         '已录成绩数: '||(select count(*)::text from e_grades) as "E"
)
select * from b_subjects
union all select * from c_nodes
union all select * from d_weights
union all select * from e_grades
union all select * from f_summary
order by "区块", "A", "B";
