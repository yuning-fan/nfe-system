-- ============================================================
-- 验证「取当前生效那条」规则（只读）
-- 规则优先级：
--   1) 今天落在 [start_date, end_date] 内 → 当前在读
--   2) 都还没开始 → 取最早开始的（如绿通9月那批 = 预科）
--   3) 都已结束   → 取最晚结束的
-- 对照你的 xlsx「课程动态」列核对是否一致。
-- 改基准日：把 date '2026-08-05' 全部替换。
-- ============================================================
with ranked as (
  select
    p.full_name,
    e.id, pr.name as program, e.source::text as src, e.status::text as st,
    e.start_date, e.end_date,
    count(*) over (partition by e.student_id) as cnt,
    row_number() over (
      partition by e.student_id
      order by
        -- 1) 当前生效优先
        case when e.start_date <= date '2026-08-05'
              and (e.end_date is null or e.end_date >= date '2026-08-05')
             then 0 else 1 end,
        -- 2) 未开始的按最早开始
        case when e.start_date > date '2026-08-05' then e.start_date end asc nulls last,
        -- 3) 已结束的按最晚结束
        e.end_date desc nulls last,
        e.start_date desc nulls last
    ) as rn
  from public.student_enrollments e
  join public.profiles p on p.id = e.student_id
  left join public.programs pr on pr.id = e.program_id
)
select
  full_name                        as "学生",
  cnt                              as "记录数",
  case when rn = 1 then '✅ 选中' else '' end as "规则选中",
  program                          as "项目",
  src                              as "来源",
  st                               as "状态",
  start_date                       as "开始",
  end_date                         as "结束",
  case
    when start_date is null or end_date is null then '⚠️ 日期缺失'
    when end_date < start_date then '❌ 结束早于开始'
    when start_date <= date '2026-08-05' and end_date >= date '2026-08-05' then '当前在读'
    when start_date > date '2026-08-05' then '未开始'
    else '已结束'
  end                              as "时间判定"
from ranked
where cnt > 1                      -- 只看有多条的那 26 人；想看全部就删掉这行
order by full_name, rn;
