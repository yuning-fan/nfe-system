-- 资料库标签重构：贴合 NFE 实际项目（预科/奥大/Foundation Connect）
-- subject 字段已存在（varchar 100），继续复用存科目名
alter table public.resources
  add column if not exists program_stage  text,            -- 所属阶段：预科 / 大学阶段（奥大）/ Foundation Connect / 通用
  add column if not exists resource_type  text,            -- 资料类型：课件讲义/练习题/范文样本/参考资料/模板表格
  add column if not exists knowledge_points text[] default '{}'::text[];  -- 知识点（自由 Tag）

comment on column public.resources.program_stage is '所属阶段标签';
comment on column public.resources.resource_type is '资料类型（一级分类）';
comment on column public.resources.knowledge_points is '知识点自由标签数组';
