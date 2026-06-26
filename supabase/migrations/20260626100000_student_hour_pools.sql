-- 课时改为"按课型两个池"：每个学生一个 1对1 池 + 一个 班科 池
-- 充值按课型；销课从对应课型的池扣；页面显示剩余总课时。
create table if not exists public.student_hour_pools (
  id serial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_type public.course_type not null,        -- one_on_one(1对1) / group_class(班科)
  total_hours numeric not null default 0,          -- 剩余可用课时
  updated_at timestamptz default now(),
  unique (student_id, course_type)
);

alter table public.student_hour_pools enable row level security;

create policy "hour_pools select" on public.student_hour_pools for select to authenticated using (true);
create policy "hour_pools insert" on public.student_hour_pools for insert to authenticated with check (true);
create policy "hour_pools update" on public.student_hour_pools for update to authenticated using (true);
create policy "hour_pools delete" on public.student_hour_pools for delete to authenticated using (true);

-- 把现有 course_assets（按课程）课时汇总迁入新池（按课型），避免清零
insert into public.student_hour_pools (student_id, course_type, total_hours)
select ca.student_id, c.type, sum(ca.total_hours)
from public.course_assets ca
join public.courses c on c.id = ca.course_id
where ca.student_id is not null
group by ca.student_id, c.type
on conflict (student_id, course_type) do update set total_hours = excluded.total_hours;
