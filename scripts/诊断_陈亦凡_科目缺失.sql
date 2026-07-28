-- ============================================================
-- 诊断：为什么陈亦凡查不到科目（只读，单结果集）
-- ============================================================
with me as (select 'edd8c78a-d0ed-46a3-91ac-94ac41b335ae'::uuid as sid),
a as (  -- 他有没有报名记录
  select '① 他的报名记录' as "区块", e.id::text as "A",
         coalesce(pr.name,'(项目已删/为空)') as "B",
         e.program_id::text as "C", e.status::text as "D",
         (e.start_date::text||' → '||e.end_date::text) as "E"
  from public.student_enrollments e
  cross join me
  left join public.programs pr on pr.id = e.program_id
  where e.student_id = me.sid
),
b as (  -- 全库各项目配了多少科目
  select '② 各项目科目数' as "区块", pr.id::text as "A", pr.name as "B",
         count(ps.id)::text as "C", pr.is_active::text as "D",
         case when count(ps.id)=0 then '⚠️ 未配科目' else '✅' end as "E"
  from public.programs pr
  left join public.program_subjects ps on ps.program_id = pr.id
  group by pr.id, pr.name, pr.is_active
),
c as (  -- program_subjects 全表样本
  select '③ 科目表样本' as "区块", ps.id::text as "A", ps.subject_name as "B",
         ps.program_id::text as "C", ps.pass_mark::text as "D", '' as "E"
  from public.program_subjects ps order by ps.id limit 40
),
d as (  -- 汇总
  select '④ 汇总' as "区块",
         '他的报名数='||(select count(*)::text from a) as "A",
         '项目总数='||(select count(*)::text from public.programs) as "B",
         '科目总数='||(select count(*)::text from public.program_subjects) as "C",
         '节点总数='||(select count(*)::text from public.academic_milestones) as "D",
         '他已录成绩='||(select count(*)::text from public.grade_records g, me where g.student_id=me.sid) as "E"
)
select * from a union all select * from b union all select * from c union all select * from d
order by "区块","A";
