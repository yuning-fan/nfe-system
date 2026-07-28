-- ============================================================
-- 查询：绿通项目 + 到 2026-09-01 仍未满 18 岁的学生（只读）
-- 口径：报名 source='green_channel'（学生列表「来源=绿通」同源）；
--       年龄按 2026-09-01 计算（与升学表 "as of Sept 1, 2026" 一致）。
-- 改基准日：把两处 date '2026-09-01' 一起改即可。
-- ============================================================
select
  p.full_name                                   as "学生",
  s.date_of_birth                               as "生日",
  extract(year from age(date '2026-09-01', s.date_of_birth))::int  as "满岁数",
  s.date_of_birth + interval '18 years'         as "满18岁日期",
  string_agg(distinct pr.name, ' / ' order by pr.name) as "绿通阶段"
from public.students_info s
join public.profiles p            on p.id = s.student_id
join public.student_enrollments e on e.student_id = s.student_id and e.source = 'green_channel'
left join public.programs pr      on pr.id = e.program_id
where s.date_of_birth is not null
  and s.date_of_birth + interval '18 years' > date '2026-09-01'   -- 到 9/1 仍未满 18
group by p.full_name, s.date_of_birth
order by s.date_of_birth desc;   -- 越小越靠前
