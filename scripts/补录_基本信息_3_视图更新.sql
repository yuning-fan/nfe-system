-- 阶段2a 配套：更新 v_student_overview 的市场来源归类
-- （migration 文件已同步改，这里给出可直接单独执行的版本）
-- 归类规则：「X转Y」取 Y；纯「绿通」→绿通；其余→名校；为空则按 enrollment.source 兜底
--
-- 注意：本次新增了「市场来源明细」列且插在「市场来源」之前，改变了列序与列名，
-- 而 create or replace view 不允许改列名（ERROR 42P16），故必须先 drop 再建。
-- v_student_overview 没有被其他视图/函数引用，drop 是安全的。
drop view if exists public.v_student_overview;

create view public.v_student_overview as
select
  p.id                                  as student_id,
  p.full_name                           as "姓名",
  case s.gender when 'male' then '男' when 'female' then '女' else s.gender end as "性别",
  s.preferred_english_name              as "英文名",
  s.english_name                        as "拼音英文名",
  s.date_of_birth                       as "出生时间",
  ce.program_stage                      as "课程动态",
  s.market_source                       as "市场来源明细",
  coalesce(
    case when split_part(s.market_source, '转', -1) like '%绿通%' then '绿通'
         when s.market_source like '%绿通%' and s.market_source not like '%转%' then '绿通'
         when s.market_source is not null then '名校' end,
    case ce.source when 'green_channel' then '绿通' when 'agent' then '名校' end
  )                                     as "市场来源",
  (s.market_source is null and ce.source is not null) as "市场来源为推导值",
  ce.start_date                         as "开始时间",
  ce.end_date                           as "结束时间",
  s.city                                as "城市",
  coalesce(s.source_school, s.school_name) as "高中学校",
  s.advisor                             as "顾问",
  adv.full_name                         as "新西兰顾问/学管",
  lt.full_name                          as "新西兰生活老师",
  s.risk_level                          as "风险等级",
  s.total_risk_score                    as "风险分",
  ce.status                             as "报名状态",
  ce.enrollment_count                   as "报名记录数",
  s.nz_advisor_id, s.life_teacher_id
from public.profiles p
join public.students_info s on s.student_id = p.id
left join public.v_student_current_enrollment ce on ce.student_id = p.id
left join public.profiles adv on adv.id = s.nz_advisor_id
left join public.profiles lt  on lt.id  = s.life_teacher_id
where p.role = 'student' and p.status = 1;

alter view public.v_student_overview set (security_invoker = true);

-- 归类结果自查
select "市场来源明细", "市场来源", count(*) as "人数"
from public.v_student_overview group by 1,2 order by 2,1;
