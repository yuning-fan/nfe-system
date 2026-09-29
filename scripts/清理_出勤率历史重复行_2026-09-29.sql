-- ============================================================
-- 清理 attendance_persuasions 同日同值的重复行（2026-09-29）
--
-- 现状：王新然 94.1（id 10 无备注 / id 39 带劝说备注）、陈亦凡 89.2（id 2 无备注 / id 3 带备注）。
-- 都是「先录数值，之后回来补劝说备注」留下的两条。
-- 做法：保留带备注那条，删掉同日同值里没有备注的那条。
--   删前效果：风险引擎把它算成「出勤率反复跌破 95%：2 次（屡教不改）」
--   删后效果：「出勤率曾跌破 95%：1 次」；「已劝说 1 次」不变。
-- 不影响风险分与等级——跌破次数是信息性提示，不参与扣分。
--
-- 幂等：条件里带「自己无备注」且「同日同值另有带备注的记录」，重复运行不会多删。
-- 去重规则本身已由 migration 20260929140000 的触发器接管，本脚本只清历史。
-- ============================================================
begin;

delete from public.attendance_persuasions a
 where nullif(btrim(a.note), '') is null                 -- 只删没有备注的那条
   and exists (
     select 1 from public.attendance_persuasions k
      where k.student_id = a.student_id
        and k.rate is not distinct from a.rate
        and (k.created_at at time zone 'Pacific/Auckland')::date
            = (a.created_at at time zone 'Pacific/Auckland')::date
        and k.id <> a.id
        and nullif(btrim(k.note), '') is not null        -- 同日同值另有一条带备注的
   );

commit;

-- ===== 自查：应无同日同值重复组 =====
select p.full_name as "学生", ap.rate as "出勤率",
       (ap.created_at at time zone 'Pacific/Auckland')::date as "日期",
       count(*) as "条数"
from public.attendance_persuasions ap
join public.profiles p on p.id = ap.student_id
group by 1, 2, 3
having count(*) > 1;
