-- 考核节点分批次日期：结构/权重按科目共用，日期可按入学批次（student_enrollments.start_date）单独设置
-- 背景：同一科目有多个入学批次在读（如 Standard Design：陈祺 2026-02 批 / 占小诺 2026-07 批），
--       节点只有一个 due_date，非默认批次学生的 DDL 提醒日期会错。
-- 口径：取值顺序 = 该批次单独日期 > 节点默认日期；
--       program_subjects.node_dates_intake 标注「节点默认日期对应哪个批次」，
--       学生批次与之不同且未单独设置时，前端标「日期待核」而不是静默显示错日期。
-- 不影响：grade_records 仍按 milestone_id 关联，权重与加权总评不变。

create table if not exists public.milestone_intake_dates (
  id serial primary key,
  milestone_id int not null references public.academic_milestones(id) on delete cascade,
  intake_start date not null,
  due_date date not null,
  due_time time,
  note text,
  created_at timestamptz not null default now(),
  constraint milestone_intake_dates_uniq unique (milestone_id, intake_start)
);
create index if not exists idx_milestone_intake_dates_due on public.milestone_intake_dates(due_date);

comment on table public.milestone_intake_dates is '考核节点按入学批次的单独日期；未设置的批次沿用 academic_milestones.due_date';
comment on column public.milestone_intake_dates.intake_start is '入学批次 = student_enrollments.start_date';

alter table public.milestone_intake_dates enable row level security;
drop policy if exists "staff read milestone_intake_dates" on public.milestone_intake_dates;
create policy "staff read milestone_intake_dates" on public.milestone_intake_dates for select to authenticated using (true);
drop policy if exists "staff insert milestone_intake_dates" on public.milestone_intake_dates;
create policy "staff insert milestone_intake_dates" on public.milestone_intake_dates for insert to authenticated with check (true);
drop policy if exists "staff update milestone_intake_dates" on public.milestone_intake_dates;
create policy "staff update milestone_intake_dates" on public.milestone_intake_dates for update to authenticated using (true) with check (true);
drop policy if exists "staff delete milestone_intake_dates" on public.milestone_intake_dates;
create policy "staff delete milestone_intake_dates" on public.milestone_intake_dates for delete to authenticated using (true);

alter table public.program_subjects add column if not exists node_dates_intake date;
comment on column public.program_subjects.node_dates_intake is '该科考核节点默认日期所对应的入学批次（student_enrollments.start_date）；为空 = 不区分批次';

-- 回填：2026-09 按 outline 导入的节点日期所属批次
update public.program_subjects set node_dates_intake = '2026-09-07'
 where program_id = 2 and node_dates_intake is null
   and exists (select 1 from public.academic_milestones m where m.program_subject_id = program_subjects.id);
update public.program_subjects set node_dates_intake = '2026-02-02'
 where program_id = 1 and subject_name in ('Design', 'Chemistry', 'Mathematics') and node_dates_intake is null;

notify pgrst, 'reload schema';
