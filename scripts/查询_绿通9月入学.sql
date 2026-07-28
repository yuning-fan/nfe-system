-- ============================================================
-- 查询：绿通项目 + 2026年9月入学 学生名单（只读）
-- 口径：报名 source='green_channel'；入学月份 = 2026-09。
-- 注意：入学日期字段名按你库里的实际列改（下面用 e.start_date，
--       若叫 enrolled_at / enrollment_date / start_at，替换即可）。
-- ============================================================
select
  p.full_name                                   as "学生",
  s.gender                                      as "性别",   -- 若在 profiles 改成 p.gender
  s.date_of_birth                               as "生日",
  extract(year from age(date '2026-09-01', s.date_of_birth))::int as "9/1满岁",
  case when s.date_of_birth + interval '18 years' > date '2026-09-01'
       then '未成年' else '已成年' end           as "9/1状态",
  string_agg(distinct pr.name, ' / ' order by pr.name) as "绿通阶段",
  min(e.start_date)                             as "入学日期"
from public.student_enrollments e
join public.students_info s on s.student_id = e.student_id
join public.profiles p      on p.id = e.student_id
left join public.programs pr on pr.id = e.program_id
where e.source = 'green_channel'
  and e.start_date >= date '2026-09-01'
  and e.start_date <  date '2026-10-01'
group by p.full_name, s.gender, s.date_of_birth
order by s.gender, s.date_of_birth;   -- 先按性别，再年龄大到小
