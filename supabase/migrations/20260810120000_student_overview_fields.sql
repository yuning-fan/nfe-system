-- ============================================================
-- 阶段1｜在读学生总览导出：新增字段 + 当前报名规则视图
-- 背景：管理层需要一张「现在在读学生状况」表（对齐 动态表格_nfe.xlsx）
-- ============================================================

-- ---------- 1. students_info 新增三列 ----------
-- english_name 现存的就是拼音英文名，语义不变；另加学生来了自取的英文名
alter table public.students_info add column if not exists preferred_english_name text;

-- 新西兰学管 / 生活老师：必须是 FK 而非文本，否则无法按登录账号做权限隔离
alter table public.students_info add column if not exists nz_advisor_id  uuid references public.profiles(id) on delete set null;
alter table public.students_info add column if not exists life_teacher_id uuid references public.profiles(id) on delete set null;

comment on column public.students_info.english_name           is '拼音英文名（如 Chen Yifan）';
comment on column public.students_info.preferred_english_name is '学生自取英文名（来新西兰后自己取的）';
comment on column public.students_info.nz_advisor_id          is '新西兰顾问/学管，指向 profiles；一名学管带多名学生';
comment on column public.students_info.life_teacher_id        is '新西兰生活老师，指向 profiles；一名生活老师带多名学生';
comment on column public.students_info.advisor                is '国内顾问姓名/代号（不登录系统，故保持文本）';

-- 权限过滤会按这两列筛，建索引
create index if not exists idx_students_info_nz_advisor  on public.students_info(nz_advisor_id);
create index if not exists idx_students_info_life_teacher on public.students_info(life_teacher_id);

-- ---------- 2. 「当前报名」规则视图 ----------
-- 一名学生可有多条报名（如已预缴奥大项目 → 预科 + 奥大 两条）。
-- 总览表每人一行，取「当前」那条，优先级：
--   ① status=active 优先（completed/withdrawn 不算当前）  ← 吴奕辉那种两条都缺日期的靠这条判对
--   ② 今天落在 [start_date, end_date] 内
--   ③ 都未开始 → 取最早开始（绿通9月那批 = 预科，非已预缴的奥大）
--   ④ 都已结束 → 取最晚结束
create or replace view public.v_student_current_enrollment as
with ranked as (
  select
    e.*,
    row_number() over (
      partition by e.student_id
      order by
        case when e.status = 'active' then 0 else 1 end,
        case when e.start_date <= current_date
              and (e.end_date is null or e.end_date >= current_date)
             then 0 else 1 end,
        case when e.start_date > current_date then e.start_date end asc nulls last,
        e.end_date   desc nulls last,
        e.start_date desc nulls last,
        e.id         desc
    ) as rn,
    count(*) over (partition by e.student_id) as enrollment_count
  from public.student_enrollments e
)
select
  r.student_id, r.id as enrollment_id, r.program_id,
  p.name  as program_name,
  -- 课程动态：奥大 = UOA，其余（预科/衔接课程）= UP
  case when p.name ilike '%奥大%' or p.name ilike '%大学阶段%' then 'UOA' else 'UP' end as program_stage,
  r.source, r.status, r.start_date, r.end_date, r.enrollment_count
from ranked r
left join public.programs p on p.id = r.program_id
where r.rn = 1;

alter view public.v_student_current_enrollment set (security_invoker = true);

-- ---------- 3. 总览导出视图 ----------
-- 对齐 动态表格_nfe.xlsx 的列；住宿三列（居住类型/学生公寓/公寓编号）本轮不做，待排房定稿。
-- 用 drop + create 而非 create or replace：后者不允许改列名/列序（ERROR 42P16），
-- 本视图的列集合仍在调整期，drop 重建才能保证脚本可重复执行。
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
  -- 归类成 名校/绿通 两类：「X转Y」取 Y 为当前归属（如 名校转绿通→绿通、绿通转名校→名校）；
  -- market_source 为空时按报名来源兜底推导。入库保留明细，此处只做展示归类，改规则不用重导数据。
  coalesce(
    case when split_part(s.market_source, '转', -1) like '%绿通%' then '绿通'
         when s.market_source like '%绿通%' and s.market_source not like '%转%' then '绿通'
         when s.market_source is not null then '名校' end,
    case ce.source when 'green_channel' then '绿通' when 'agent' then '名校' end
  )                                     as "市场来源",
  (s.market_source is null and ce.source is not null) as "市场来源为推导值",
  ce.start_date                         as "开始时间",
  ce.end_date                           as "结束时间",   -- 语义=缴费覆盖到的日期，非毕业日
  s.city                                as "城市",
  coalesce(s.source_school, s.school_name) as "高中学校",
  s.advisor                             as "顾问",
  adv.full_name                         as "新西兰顾问/学管",
  lt.full_name                          as "新西兰生活老师",
  s.risk_level                          as "风险等级",
  s.total_risk_score                    as "风险分",
  ce.status                             as "报名状态",
  ce.enrollment_count                   as "报名记录数",
  s.nz_advisor_id, s.life_teacher_id     -- 供权限过滤用
from public.profiles p
join public.students_info s on s.student_id = p.id
left join public.v_student_current_enrollment ce on ce.student_id = p.id
left join public.profiles adv on adv.id = s.nz_advisor_id
left join public.profiles lt  on lt.id  = s.life_teacher_id
where p.role = 'student' and p.status = 1;

alter view public.v_student_overview set (security_invoker = true);
