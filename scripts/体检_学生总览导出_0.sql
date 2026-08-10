-- ============================================================
-- 阶段0 · 数据体检（只读，单结果集）
-- 目的：搞清「在读学生总览」导出还差多少数据，据此估阶段1/2的工作量。
-- 直接在 Supabase SQL Editor 跑，一次出全部结论。
-- ============================================================
with stu as (            -- 所有学生
  select p.id, p.full_name, p.status
  from public.profiles p where p.role = 'student'
),
enr as (                 -- 每人的报名记录数 + 最新一条
  select s.id,
         count(e.id)                                   as cnt,
         max(e.start_date)                             as latest_start,
         (array_agg(e.status order by e.start_date desc nulls last))[1]::text as latest_status
  from stu s left join public.student_enrollments e on e.student_id = s.id
  group by s.id
),
-- ① 报名记录情况（卡点⑤⑥的答案）
a as (
  select '① 报名记录' as "区块",
         case when cnt = 0 then 'A. 无报名记录（导出会漏掉！）'
              when cnt = 1 then 'B. 恰好1条（正常）'
              else 'C. 多条（需取最新）' end as "情况",
         count(*)::text as "人数",
         string_agg(s.full_name, '、' order by s.full_name) as "名单", '' as "备注"
  from stu s join enr on enr.id = s.id
  group by 2
),
-- ② 关键字段填充率
b as (
  select '② 字段填充率' as "区块", x.col as "情况",
         x.filled::text || ' / ' || x.total::text as "人数",
         round(100.0 * x.filled / nullif(x.total,0)) || '%' as "名单",
         case when x.filled = 0 then '❌ 全空，需补录'
              when x.filled < x.total then '⚠️ 部分缺失' else '✅ 齐全' end as "备注"
  from (
    select '姓名' col, count(*) filled, (select count(*) from stu) total from stu where full_name is not null
    union all select '性别',        count(*), (select count(*) from stu) from public.students_info where gender is not null
    union all select '英文名(拼音)', count(*), (select count(*) from stu) from public.students_info where english_name is not null
    union all select '出生日期',    count(*), (select count(*) from stu) from public.students_info where date_of_birth is not null
    union all select '城市',        count(*), (select count(*) from stu) from public.students_info where city is not null
    union all select '高中学校',    count(*), (select count(*) from stu) from public.students_info where school_name is not null
    union all select '生源学校',    count(*), (select count(*) from stu) from public.students_info where source_school is not null
    union all select '顾问(国内)',  count(*), (select count(*) from stu) from public.students_info where advisor is not null
    union all select '市场来源',    count(*), (select count(*) from stu) from public.students_info where market_source is not null
  ) x
),
-- ③ 市场来源实际有哪些值（决定怎么规范成 名校/绿通）
c as (
  select '③ 市场来源取值' as "区块",
         coalesce(market_source, '(空)') as "情况",
         count(*)::text as "人数", '' as "名单", '' as "备注"
  from public.students_info group by 1,2
),
-- ④ enrollment.source 取值（枚举，与 market_source 并存）
d as (
  select '④ 报名来源取值' as "区块",
         coalesce(source::text, '(空)') as "情况",
         count(*)::text as "人数", '' as "名单", '' as "备注"
  from public.student_enrollments group by 1,2
),
-- ⑤ 员工账号（学管/生活老师要挂 FK，先看有没有人）
e2 as (
  select '⑤ 员工账号' as "区块", p.role::text as "情况",
         count(*)::text as "人数",
         string_agg(p.full_name, '、' order by p.full_name) as "名单", '' as "备注"
  from public.profiles p where p.role <> 'student' group by 2
),
-- ⑥ 总数
f as (
  select '⑥ 汇总' as "区块", '学生总数' as "情况",
         (select count(*)::text from stu) as "人数",
         '在读(status=1): ' || (select count(*)::text from stu where status = 1) as "名单",
         '有报名记录: ' || (select count(*)::text from enr where cnt > 0) as "备注"
)
select * from a union all select * from b union all select * from c
union all select * from d union all select * from e2 union all select * from f
order by "区块", "情况";
