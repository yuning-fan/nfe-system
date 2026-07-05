-- 学习跟进统一表：作业核查 / 晚自习跟进 / 带背考察 / 个辅记录 / 重难点梳理
-- 覆盖巡查&小老师 Follow-up 四部分中缺数据模型的部分（个辅不进排课体系、不扣课时）
create table if not exists public.study_follow_ups (
  id serial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  recorder_id uuid references public.profiles(id),
  category text not null,      -- homework_check(作业核查) / night_study(晚自习跟进) / recitation(带背考察) / mini_tutoring(个辅记录) / key_points(重难点梳理)
  subject text,                -- 科目（可空，自由文本）
  content text not null,       -- 内容：作业情况 / 学习表现 / 带背范围 / 备课与讲授内容 / 重难点
  result text,                 -- 结果：完成度 / 考察通过与否 / 存在问题 / 薄弱环节
  needs_followup boolean not null default false,   -- 待跟进（差生记录、未通过考察等）
  attachment_url text,
  created_at timestamptz default now()
);

create index if not exists idx_study_follow_ups_student on public.study_follow_ups(student_id, created_at desc);

comment on table public.study_follow_ups is '学习跟进记录（作业核查/晚自习跟进/带背考察/个辅记录/重难点梳理）';
comment on column public.study_follow_ups.category is 'homework_check / night_study / recitation / mini_tutoring / key_points';

alter table public.study_follow_ups enable row level security;
drop policy if exists "follow_ups select" on public.study_follow_ups;
create policy "follow_ups select" on public.study_follow_ups for select to authenticated using (true);
drop policy if exists "follow_ups all" on public.study_follow_ups;
create policy "follow_ups all" on public.study_follow_ups for all to authenticated using (true) with check (true);
