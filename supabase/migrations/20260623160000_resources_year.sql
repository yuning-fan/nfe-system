-- 资料库：新增年份字段（细化到年）
alter table public.resources
  add column if not exists resource_year int;

comment on column public.resources.resource_year is '资料适用/归属年份（细化到年）';
