-- 晚自习排课 + 奥大本科录取要求（2026-10-12）
-- ① night_study_weeks / night_study_sessions：Gris 每周发的《晚自习各老师工作安排》结构化落库
--    —— 与 daily_checks(check_type='night_study') 的点名互补：点名记「谁来了」，这里记「那晚讲了什么」。
-- ② uoa_programmes：UoA Certificate in Foundation Studies (UP Education) 升本录取要求，按入学年份存
-- ③ students_info.target_programme_id：学生目标专业挂到 ② 上，报告升学对标据此取 GPA/EAP/选科要求
-- 全部为新表 / 加列，幂等可重跑。

-- ───────── ① 晚自习 ─────────
create table if not exists public.night_study_weeks (
  id serial primary key,
  week_start date not null unique,       -- 周一
  week_end date not null,
  title text not null,
  exam_notes text,                       -- 本周 / 下周考试清单（原文）
  general_tasks text,                    -- 所有老师通用任务、学管任务（原文）
  teacher_tasks jsonb not null default '[]'::jsonb,  -- [{teacher, time, task}]，含群内答疑等不落到具体晚上的任务
  room_plan jsonb not null default '[]'::jsonb,      -- [{date, r106, r109, r110}] 教室安排
  source_file text,
  created_at timestamptz default now()
);
comment on table public.night_study_weeks is '晚自习周计划（每周《晚自习各老师工作安排》）';

create table if not exists public.night_study_sessions (
  id serial primary key,
  week_id integer references public.night_study_weeks(id) on delete cascade,
  session_date date not null,
  start_time time,                       -- 原文未写具体时间的为空（开学头两周）
  end_time time,
  room text,                             -- 106 / 109 / 110
  kind text not null,                    -- intro 课程导论 / exam_prep 考前课 / review 复习 / qa 答疑 / workshop 写作指导·批改 / admin 事务
  subject text,                          -- 显示用科目名（与 program_subjects.subject_name 一致）
  program_subject_id integer references public.program_subjects(id) on delete set null,
  milestone_id integer references public.academic_milestones(id) on delete set null,  -- 针对的考核
  teacher_name text,                     -- 授课老师（Shelley/Tiffany/Clara 等尚无系统账号，存名字）
  teacher_id uuid references public.profiles(id) on delete set null,
  assistants text,                       -- 助教 / 值班
  topic text not null,                   -- 讲什么
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_night_study_sessions_date on public.night_study_sessions(session_date);
create index if not exists idx_night_study_sessions_subject on public.night_study_sessions(program_subject_id);
comment on table public.night_study_sessions is '晚自习每节课 / 答疑明细';
comment on column public.night_study_sessions.kind is 'intro / exam_prep / review / qa / workshop / admin';

alter table public.night_study_weeks enable row level security;
alter table public.night_study_sessions enable row level security;
drop policy if exists "ns_weeks select" on public.night_study_weeks;
create policy "ns_weeks select" on public.night_study_weeks for select to authenticated using (true);
drop policy if exists "ns_weeks write" on public.night_study_weeks;
create policy "ns_weeks write" on public.night_study_weeks for all to authenticated using (true) with check (true);
drop policy if exists "ns_sessions select" on public.night_study_sessions;
create policy "ns_sessions select" on public.night_study_sessions for select to authenticated using (true);
drop policy if exists "ns_sessions write" on public.night_study_sessions;
create policy "ns_sessions write" on public.night_study_sessions for all to authenticated using (true) with check (true);

-- ───────── ② 奥大录取要求 ─────────
create table if not exists public.uoa_programmes (
  id serial primary key,
  entry_year integer not null,           -- 入读年份（2027）
  code text not null,                    -- 内部短码，如 BCom / BEHons / BSc
  faculty text not null,
  programme text not null,               -- 官方全称
  entry_type text not null default 'direct',  -- direct 直录 / no_direct 预科不可直录 / via_other_degree 须随另一学位
  gpa_min numeric(3,1),                  -- 预科 GPA 要求（9 分制，不含 EAP）；不可直录为空
  eap_min numeric(4,1),                  -- EAP 要求（%）：65 或 70；以 IELTS 代替的为空
  english_requirement text,              -- 英语要求原文
  english_alternative text,              -- EAP 未达标时的替代条件（50% EAP + IELTS）
  intakes text[] not null default '{}',  -- {Mar, Jul}
  intake_note text,
  selection_required boolean not null default false,  -- 需作品集 / 面试 / 试演等
  required_subjects text[] not null default '{}',     -- 必修预科科目（名称同 program_subjects.subject_name）
  required_subjects_mode text,           -- all 全部须通过 / any_one 任选其一通过
  additional_requirements text,          -- 附加要求原文
  duration_years text,
  notes text,
  source text,
  unique (entry_year, code)
);
comment on table public.uoa_programmes is
  'UoA 预科(CFS, UP Education)升本录取要求。通用规则：GPA 不含 EAP；须通过至少 4 门学术科目 + EAP 65%（或 50% + IELTS 6.0/单项5.5）方可获得证书；另须完成 UoA Academic Integrity Course。';

alter table public.uoa_programmes enable row level security;
drop policy if exists "uoa select" on public.uoa_programmes;
create policy "uoa select" on public.uoa_programmes for select to authenticated using (true);
drop policy if exists "uoa write" on public.uoa_programmes;
create policy "uoa write" on public.uoa_programmes for all to authenticated using (true) with check (true);

-- ───────── ③ 学生目标专业 ─────────
alter table public.students_info add column if not exists target_programme_id integer
  references public.uoa_programmes(id) on delete set null;
comment on column public.students_info.target_programme_id is '目标本科专业（uoa_programmes）；target_degree 保留学生原填写的具体方向';
