-- 违规登记：补类型与状态字段（reason/deduction_points 已存在）
alter table public.violation_logs
  add column if not exists violation_type text,                       -- 缺席自习/手机使用/晚归/睡觉/闲聊/其他
  add column if not exists status text not null default 'pending';    -- pending(待存档) / archived(已存档)

comment on column public.violation_logs.violation_type is '违规类型';
comment on column public.violation_logs.status is '状态：pending 待存档 / archived 已存档';
