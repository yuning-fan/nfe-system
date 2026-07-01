-- 考核节点 + 加权总评：把 academic_milestones 升级为"带权重/学期周/父子的考核节点模板"
-- 1. academic_milestones 扩字段
alter table public.academic_milestones add column if not exists weight_percent numeric;                 -- 顶层=占该科总评% / 子项=占父节点%
alter table public.academic_milestones add column if not exists parent_id int references public.academic_milestones(id) on delete cascade;
alter table public.academic_milestones add column if not exists term_no smallint;
alter table public.academic_milestones add column if not exists week_no smallint;
alter table public.academic_milestones add column if not exists mode text;                                -- secure / non_secure / hybrid
alter table public.academic_milestones add column if not exists is_major boolean not null default false;

-- 2. program_subjects 过线分数线（EAP=65）
alter table public.program_subjects add column if not exists pass_mark numeric not null default 50;

-- 3. grade_records：状态标记 + 备注 + 补 DELETE 策略（原缺，删成绩静默失败）
alter table public.grade_records add column if not exists status text not null default 'graded';          -- graded / missed / makeup
alter table public.grade_records add column if not exists note text;

drop policy if exists "Allow delete for authenticated users" on public.grade_records;
create policy "Allow delete for authenticated users" on public.grade_records for delete to authenticated using (true);
