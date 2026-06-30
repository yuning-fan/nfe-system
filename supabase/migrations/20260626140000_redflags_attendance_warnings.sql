-- 预警体系"亮红灯"所需字段
-- 官方出勤率（巡查周一录入）
alter table public.students_info add column if not exists school_attendance_rate numeric;
alter table public.students_info add column if not exists attendance_rate_updated_at timestamptz;

-- 警告信：区分来源/类别 + 附件（学校信/学术不端上传扫描件）
alter table public.warning_letters add column if not exists source text not null default 'internal';   -- internal(内部三步走) / school(学校信)
alter table public.warning_letters add column if not exists category text;                              -- attendance(出勤) / academic(学术不端) / discipline(纪律)
alter table public.warning_letters add column if not exists attachment_url text;
alter table public.warning_letters add column if not exists occurred_on date;                           -- 信件日期（学校信登记用）

-- 违规登记：学术不端等需要上传证明
alter table public.violation_logs add column if not exists attachment_url text;
