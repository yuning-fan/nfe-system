-- 晚自习小课：指定上课学生（2026-10-29）
-- 为空 = 面向选了该科的所有学生（原有大课/答疑）；非空 = 只有名单内学生的这节课（小课），
-- 学术报告「晚自习课程」只给名单内学生列这节课。
alter table public.night_study_sessions add column if not exists student_ids uuid[];
comment on column public.night_study_sessions.student_ids is '小课指定学生（profiles.id）；为空表示面向该科全部选课学生';
create index if not exists night_study_sessions_student_ids_idx on public.night_study_sessions using gin (student_ids);
