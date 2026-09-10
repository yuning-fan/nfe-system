-- 学业节点导入（academic_milestones）· program_id=2 预科-Accelerated
-- 科目：Geography
-- 顶层 7 条 + 子项 0 条；幂等：按 (program_subject_id, title) 去重
begin;

-- ① 顶层节点
with src(subj, title, mtype, due, due_t, w, wk, md, major, note) as (values
  ('Geography', 'Skills Test', 'exam', '2026-09-29'::date, '11:20'::time, 5, 4, 'secure', false, 'Assessment Overview 写 Test / Skills，日期 28/09；Course Schedule 写 Skills Test - Tues, Sept 29th P3 (11:20)，以 schedule 为准'),
  ('Geography', 'Tourism Test', 'exam', '2026-10-20'::date, '11:20'::time, 10, 7, 'secure', false, 'Assessment Overview 写 Test / Tourism Development，日期 19/10；Course Schedule 写 Tourism Test - Tues, Oct 20th P3 (11:20)，以 schedule 为准'),
  ('Geography', 'CGI Essay', 'report_due', '2026-10-28'::date, null, 10, 8, 'secure', false, '原文 Secure；Assessment Overview 日期 26/10；Course Schedule 写 CGI Essay - Wed, Oct 28th P1 (09:00) P5 (13:40)，以 schedule 为准；时间原文「09:00 / 13:40」'),
  ('Geography', 'Video Presentation', 'assignment', '2026-11-11'::date, '23:59'::time, 10, 10, 'non_secure', false, '原文 Non-secure；Assessment Overview 日期 09/11；Course Schedule 写 Tectonic Processes Presentation - Wed, Nov 11th 23:59，以 schedule 为准'),
  ('Geography', 'Group Presentation', 'assignment', '2026-12-08'::date, '16:00'::time, 10, 14, 'non_secure', false, '原文 Non-secure；Assessment Overview 日期 07/12；Course Schedule 写 Global Development Group Presentations - Tues, Dec 8th P7 (16:00)，以 schedule 为准'),
  ('Geography', 'FLAs (video lessons)', 'assignment', '2026-09-07'::date, null, 5, null, 'non_secure', false, '原文 Non-secure；All topics；日期占位，原文只写 Sept-Dec；周次原文「Sept-Dec」'),
  ('Geography', 'Exam', 'exam', '2027-01-04'::date, null, 50, null, 'secure', true, '原文 Secure；All topics；Course Schedule 写 FINAL EXAMINATIONS，Week 16 04/01、Week 17 11/01；04/01 为 New Year Holiday，日期占位；周次原文「Week 16-17」')
),
resolved as (
  select ps.id psid, s.* from src s
  join program_subjects ps on ps.program_id = 2 and ps.subject_name = s.subj
)
insert into academic_milestones (program_subject_id, title, milestone_type, due_date, due_time,
                                 weight_percent, week_no, mode, is_major, note)
select r.psid, r.title, r.mtype::milestone_type, r.due, r.due_t::time, r.w, r.wk, r.md, r.major, r.note
from resolved r
where not exists (select 1 from academic_milestones m
                  where m.program_subject_id = r.psid and m.title = r.title);

commit;