-- 学术报告 / 出勤报告内容扩充（2026-10-11）
-- 对应家长报告清单：成绩说明（考察重点/试卷特点/改进指导/学生反思）、升学对标、辅导课授课内容与提醒、出勤率采集日期。
-- 同批整体数据（中位数/最高/最低）不落库：由 NFE 同批学生成绩实时计算，报告里注明样本量。
-- 全部为加列 / 新表，幂等可重跑。

-- ① 成绩：辅导老师改进指导 + 学生本人反思（面向家长，区别于内部备注 note）
alter table public.grade_records add column if not exists improvement_advice text;
alter table public.grade_records add column if not exists student_reflection text;
comment on column public.grade_records.improvement_advice is '改进指导（辅导老师/学管填写，进家长报告）';
comment on column public.grade_records.student_reflection is '学生自我反馈与反思（进家长报告）';

-- ② 考核说明：考察重点、试卷特点 —— 同一节点不同批次试卷不同，按 (节点, 批次) 存，录一次全批共用
create table if not exists public.milestone_exam_notes (
  id serial primary key,
  milestone_id integer not null references public.academic_milestones(id) on delete cascade,
  intake_start date not null,          -- 批次 = 学生该科选课所属报名的 start_date（同 milestone_intake_dates）
  exam_focus text,                     -- 本次考察重点
  paper_features text,                 -- 试卷特点
  updated_by uuid references public.profiles(id),
  updated_at timestamptz default now(),
  unique (milestone_id, intake_start)
);
comment on table public.milestone_exam_notes is '考核说明（考察重点/试卷特点），按节点×批次';

alter table public.milestone_exam_notes enable row level security;
drop policy if exists "exam_notes select" on public.milestone_exam_notes;
create policy "exam_notes select" on public.milestone_exam_notes for select to authenticated using (true);
drop policy if exists "exam_notes write" on public.milestone_exam_notes;
create policy "exam_notes write" on public.milestone_exam_notes for all to authenticated using (true) with check (true);

-- ③ 升学对标：专业要求补充说明（结构化要求见 20261012 的 uoa_programmes / target_programme_id）
-- 曾加过 target_entry_score（按百分比的目标均分），奥大要求是 GPA 9 分制，概念不符，已删除
alter table public.students_info drop column if exists target_entry_score;
alter table public.students_info add column if not exists target_requirement_note text;
comment on column public.students_info.target_requirement_note is '专业培养/录取要求说明（如单科要求、英语要求）';

-- ④ 辅导课：授课内容与重难点、重要提醒（销课时由辅导老师填写）
alter table public.schedules add column if not exists lesson_content text;
alter table public.schedules add column if not exists reminders text;
comment on column public.schedules.lesson_content is '授课内容记录：上了什么、讲了哪些重难点';
comment on column public.schedules.reminders is '重要提醒事项（考试节点、作业截止、需准备材料等）';

-- ⑤ 学校出勤率历史：采集日期（业务日期），与录入时间 created_at 区分
alter table public.attendance_persuasions add column if not exists recorded_on date;
update public.attendance_persuasions
   set recorded_on = (created_at at time zone 'Pacific/Auckland')::date
 where recorded_on is null and created_at is not null;
alter table public.attendance_persuasions
  alter column recorded_on set default ((now() at time zone 'Pacific/Auckland')::date);
comment on column public.attendance_persuasions.recorded_on is '出勤率采集日期（学校账户数据日期）';
