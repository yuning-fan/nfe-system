-- 住宿房源结构调整：Unilodge / 55 Margan 两栋新公寓按「单元」组织
--
-- 1) dorms 加 unit / unit_info：
--    Unilodge 下有 13D/13E/13F/13H 四个单元，55 Margan 下有 6–10 号五个单元，
--    每个单元自带性别与卫浴数。Tiverton 三栋没有单元层，两列留空。
--    监护人仍按 building_name 挂在 apartment_guardians 上，DCG 流程不受影响。
--
-- 2) dorms 加 is_active：
--    51B Shoreham Street 已退租，但 3 条历史入住记录要留着，
--    所以停用而不是删除；页面只渲染 is_active 的房源。

alter table public.dorms add column if not exists unit text;
alter table public.dorms add column if not exists unit_info text;
alter table public.dorms add column if not exists is_active boolean not null default true;

comment on column public.dorms.unit is '单元号，如 13D / 6号；无单元层的公寓留空。与 building_name 一起构成分组键';
comment on column public.dorms.unit_info is '单元标注，如「男」「女 · 3.5 卫」；仅供展示';
comment on column public.dorms.is_active is 'false=该房源已退租/停用，页面不再渲染，但保留其历史入住记录';

create index if not exists idx_dorms_active_building on public.dorms(is_active, building_name, unit, room_number);
