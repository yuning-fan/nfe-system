-- ============================================================
-- 晚自习点名补录：给 daily_checks 加显式业务日期 check_date
--
-- 为什么不复用 created_at：created_at 的含义是「什么时候录进系统」。补录时若把它写成
--   过去时间，审计日志（audit_logs / SystemLogs）与操作时序就全错了。两个字段分开：
--     check_date  = 点的是哪天的名（业务日期）
--     created_at  = 何时录入（不动）
--
-- 时区：业务日期按新西兰（Pacific/Auckland）。现有 84 行的 UTC 日期与新西兰日期完全一致
--   （都在 NZ 下午/傍晚录入），所以回填无歧义。前端同口径，见 lib/nzDate.ts。
-- ============================================================

alter table public.daily_checks add column if not exists check_date date;

update public.daily_checks
   set check_date = (created_at at time zone 'Pacific/Auckland')::date
 where check_date is null;

alter table public.daily_checks
  alter column check_date set default (now() at time zone 'Pacific/Auckland')::date;
alter table public.daily_checks
  alter column check_date set not null;

comment on column public.daily_checks.check_date is
  '点名对应的业务日期（新西兰时区）。与 created_at（录入时间）分开，使补录既能落在正确日期、又不伪造录入时间。';

-- 防重复：只对晚自习加唯一约束。
--   ① 目前只有晚自习开放补录，重复提交的风险集中在这条路径；
--   ② tutoring 历史上存在同日同学生两条记录（陈亦凡 2026-06-25 的 absent + leave），
--      全表唯一约束会直接建不上，那条历史数据本轮不动。
-- 前端仍是「先删当天再插入」，这个索引是兜底：并发重复提交会明确报错，而不是静默产生双份。
create unique index if not exists uq_daily_checks_night_study_day_student
  on public.daily_checks(check_date, student_id)
  where check_type = 'night_study';

-- 按类型+业务日期查询是所有读取方的共同形态（风险引擎、报告、工作台、历史列表）
create index if not exists idx_daily_checks_type_date
  on public.daily_checks(check_type, check_date);
