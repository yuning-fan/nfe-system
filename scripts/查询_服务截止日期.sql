-- ============================================================
-- 查询：服务截止日期在 2027-07-01 及以后的学生（只读）
-- 口径与学生列表页一致：取该生所有阶段中【最晚的结束日】。
-- 改时间：把下面 date '2027-07-01' 换成你要的界限即可。
--   · 想「不含 7 月、只看 8 月起」→ 改成 date '2027-08-01'
-- ============================================================
select
  p.full_name                       as "学生",
  max(e.end_date)                   as "服务截止日期",
  count(*)                          as "阶段数",
  string_agg(distinct pr.name, ' / ' order by pr.name) as "涉及阶段"
from public.students_info s
join public.profiles p            on p.id = s.student_id
join public.student_enrollments e on e.student_id = s.student_id
left join public.programs pr      on pr.id = e.program_id
where e.end_date is not null
group by p.full_name
having max(e.end_date) >= date '2027-07-01'
order by max(e.end_date) desc, p.full_name;
