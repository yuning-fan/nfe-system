-- 家校沟通：补 channel（沟通方式）字段，原表只有 contact_type（对象）
alter table public.communication_logs
  add column if not exists channel text;  -- phone / email / wechat / meeting / note

comment on column public.communication_logs.channel is '沟通方式：phone/email/wechat/meeting/note';
