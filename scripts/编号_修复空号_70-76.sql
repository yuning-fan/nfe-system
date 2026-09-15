-- ============================================================
-- 修复 NFE 学号空号（2026-09-14）
-- 背景：70/71/72/74/75/76 被 upsert 烧掉，根因与根治见
--       supabase/migrations/20260914120000_nfe_no_gapless.sql（须先跑该迁移）
-- 做法：只挪空号之后的两人，保持建档先后：朱铠熠 73→70，郑哲元 77→71
-- 前提：两人编号均未对外流出（用户 2026-09-14 确认；库内 126 个文本列无 NFE-000073/77 引用）
-- 幂等：条件带旧号，重复运行不会二次改动
-- ============================================================
begin;
set local nfe.allow_renumber = 'on';   -- 放开 trg_guard_nfe_no 改号保护，仅本事务有效

update public.students_info set nfe_no = 70
 where student_id = '58e83b0c-936b-4ecf-b049-f303488aac34' and nfe_no = 73;  -- 朱铠熠
update public.students_info set nfe_no = 71
 where student_id = 'f0e55828-5cfc-4b88-9022-cd4256e95f55' and nfe_no = 77;  -- 郑哲元

commit;

-- ===== 自查：空号（应为 0 行）=====
with used as (select nfe_no n from public.students_info where nfe_no is not null)
select g.n as "空号"
from generate_series(1, (select max(n) from used)) g(n)
left join used u on u.n = g.n
where u.n is null;
