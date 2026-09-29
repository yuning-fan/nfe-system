-- ============================================================
-- warning_letters 补 created_at（下发/录入时间）
--
-- 背景：这张表原本没有任何「什么时候开的这封信」的字段——occurred_on 是事件发生日（学校信才填）、
--   signed_at 是学生签字时间（未签就是空）。结果：
--     · 学生档案页 StudentDetail 渲染 `new Date(wl.created_at)` → 一直是 Invalid Date（存量 bug）；
--     · 新的「时间线」tab 没法给内部警告信排序。
--
-- 注意：不能写成 `add column created_at timestamptz default now()`——PG 11+ 会把默认值一并
--   填进存量行，等于给两封老信伪造出「今天」的下发日期。所以先加空列、回填、再设默认值。
--
-- 回填来源：audit_logs 里该行的 INSERT 时间（触发器 trg_audit_warning_letters 记的）。
--   审计模块 2026-08-26 才上线，更早的信（id=2）无从还原，保持 NULL——宁可显示「日期未记录」，
--   也不编一个日期出来。
-- ============================================================

alter table public.warning_letters add column if not exists created_at timestamptz;

update public.warning_letters w
   set created_at = a.created_at
  from public.audit_logs a
 where a.table_name = 'warning_letters'
   and a.action = 'INSERT'
   and a.record_id = w.id::text
   and w.created_at is null;

alter table public.warning_letters alter column created_at set default now();

comment on column public.warning_letters.created_at is
  '警告信录入系统的时间。与 occurred_on（事件发生日，学校信填）、signed_at（学生签字时间）区分开。2026-08-26 之前的历史行可能为 NULL。';
