-- 报告模块重做：结构化内容（双周学术报告）
-- 清空旧测试数据（52 条空报告）
delete from public.reports;

alter table public.reports
  add column if not exists title         text,
  add column if not exists period_start  date,
  add column if not exists period_end    date,
  add column if not exists content       jsonb not null default '{}'::jsonb;

comment on column public.reports.content is '报告结构化内容：attendance/grades/tutoring/violations/comment';
comment on column public.reports.period_start is '报告周期开始';
comment on column public.reports.period_end is '报告周期结束';
