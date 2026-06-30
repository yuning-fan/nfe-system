-- 出勤劝说/历史记录：每次录入官方出勤率存一条；据此统计"反复跌破合约线次数"与"劝说次数"（屡教不改）
create table if not exists public.attendance_persuasions (
  id serial primary key,
  student_id uuid references public.profiles(id) on delete cascade,
  rate numeric,              -- 录入时的官方出勤率
  note text,                 -- 劝说备注（可空）
  created_by uuid,
  created_at timestamptz default now()
);

alter table public.attendance_persuasions enable row level security;
drop policy if exists "persuasions select" on public.attendance_persuasions;
create policy "persuasions select" on public.attendance_persuasions for select to authenticated using (true);
drop policy if exists "persuasions all" on public.attendance_persuasions;
create policy "persuasions all" on public.attendance_persuasions for all to authenticated using (true) with check (true);
