-- 资料库：版本管理
-- version: 版本号；superseded_by_id: 指向更新版本的资料 id（非空=本条已被新版本取代，列表默认隐藏）
alter table public.resources
  add column if not exists version int not null default 1,
  add column if not exists superseded_by_id int references public.resources(id) on delete set null;

comment on column public.resources.version is '版本号';
comment on column public.resources.superseded_by_id is '被哪条新版本取代（非空即已归档）';
