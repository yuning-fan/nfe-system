-- 学业节点导入（academic_milestones）· program_id=2 预科-Accelerated
-- 科目：Accounting, Biology, Economics, Media Studies
-- 顶层 32 条 + 子项 2 条；幂等：按 (program_subject_id, title) 去重
begin;

-- ① 顶层节点
with src(subj, title, mtype, due, due_t, w, wk, md, major, note) as (values
  ('Media Studies', 'Flexible Learning Activities', 'assignment', '2026-09-07'::date, null, 5, null, 'non_secure', false, '原文 Non-secure，每周布置；周次原文「Throughout」'),
  ('Media Studies', 'Common Tests 1 & 2', 'exam', '2026-09-23'::date, null, 5, null, 'secure', false, '父节点，原文权重 5%（2.5% × 2）；子项见 2.1、2.2；周次原文「Week 3 & Week 10」'),
  ('Media Studies', 'Short Written Response', 'assignment', '2026-10-15'::date, '23:59'::time, 5, 6, 'secure', false, '原文 Secure；schedule 写 Short Writing Response'),
  ('Media Studies', 'Visual Text', 'assignment', '2026-11-05'::date, '23:59'::time, 15, 9, 'hybrid', false, '原文 Secure and non-secure，混合模式'),
  ('Media Studies', 'Group Presentation', 'assignment', '2026-12-07'::date, null, 15, 14, 'secure', false, '原文 Secure；Class A Mon P6，Class B Tues P2；时间原文「14:50 / 10:10」'),
  ('Media Studies', 'Essay', 'report_due', '2026-11-26'::date, null, 15, 12, 'secure', false, '原文 Secure；Class A Thurs P3，Class B Thurs P7，另有 Fri 安排；时间原文「11:20 / 16:00」'),
  ('Media Studies', 'Examination', 'exam', '2027-01-04'::date, null, 40, null, 'secure', true, '原文 Secure；Final Examinations，outline 写 04 Jan / 11 Jan，跨年应为 2027；周次原文「Week 16-17」'),
  ('Accounting', 'Flexible Learning Activities', 'assignment', '2026-09-07'::date, null, 5, null, 'non_secure', false, '原文 Non-secure；每周；周次原文「Throughout」'),
  ('Accounting', 'Online Tests', 'exam', '2026-09-07'::date, null, 5, null, 'non_secure', false, '原文 Non-secure；教师提前通知；周次原文「Throughout」'),
  ('Accounting', 'Reading Review', 'assignment', '2026-09-21'::date, null, 10, 3, 'secure', false, '原文 Secure；Supervised Writing Task'),
  ('Accounting', 'Processing Transactions Test', 'exam', '2026-10-05'::date, null, 25, 5, 'secure', true, '原文 Secure；占比 ≥25%'),
  ('Accounting', 'Financial Reporting Test', 'exam', '2026-11-16'::date, null, 10, 11, 'secure', false, '原文 Secure'),
  ('Accounting', 'Group Presentation - Decision Making & Cost-Volume-Profit Analysis', 'assignment', '2026-11-23'::date, null, 10, 12, 'non_secure', false, '原文 Non-secure'),
  ('Accounting', 'Cash Flow Statement Test', 'exam', '2026-12-07'::date, null, 5, 14, 'secure', false, '原文 Secure'),
  ('Accounting', 'External Examination', 'exam', '2027-01-06'::date, null, 30, 17, 'secure', true, 'outline 原表未显示权重；按顶层合计=100推算为 30，需确认'),
  ('Economics', 'Common Test 1', 'exam', '2026-09-21'::date, null, 5, 3, 'secure', false, '原文 Secure；评估表写 Week 3'),
  ('Economics', 'Common Test 2', 'exam', '2026-10-19'::date, null, 10, 7, 'secure', false, '原文 Secure'),
  ('Economics', 'Common Test 3', 'exam', '2026-12-07'::date, null, 5, 14, 'secure', false, '原文 Secure'),
  ('Economics', 'Group Presentation based on research', 'assignment', '2026-11-02'::date, null, 15, 9, 'non_secure', false, '原文 Non-secure；Due Week 9'),
  ('Economics', 'Research Essay', 'report_due', '2026-11-30'::date, null, 10, 13, 'non_secure', false, '原文 Non-secure；Due Week 13'),
  ('Economics', 'Flexible Learning Activities', 'assignment', '2027-01-04'::date, null, 5, 16, 'non_secure', false, '原文 Non-secure；评估表写 Week 16'),
  ('Economics', 'Final Examination', 'exam', '2027-01-07'::date, null, 50, null, 'secure', true, '原文 TBC；重要日期考试 7-14 Jan；周次原文「TBC」'),
  ('Biology', 'Progress Quiz', 'exam', '2026-09-21'::date, null, 0, 3, 'non_secure', false, '原文 1%*；疑为额外/不计总评，暂填 0，需确认'),
  ('Biology', 'Critical Research Essay – Draft', 'report_due', '2026-09-28'::date, null, 0, 4, 'non_secure', false, '原文 [10%]†；疑为草稿不单独计分，暂填 0，需确认'),
  ('Biology', 'Practical Investigation & Report', 'report_due', '2026-10-05'::date, null, 5, 5, 'non_secure', false, 'Online / Written'),
  ('Biology', 'Group Project Infographic', 'assignment', '2026-10-19'::date, null, 5, 7, 'non_secure', false, 'Variable'),
  ('Biology', 'Common Test 1', 'exam', '2026-10-26'::date, null, 7.5, 8, 'secure', false, 'Online；Week 8 含 Labour Day'),
  ('Biology', 'Group Presentation Video', 'assignment', '2026-11-09'::date, null, 5, 10, 'non_secure', false, 'Variable'),
  ('Biology', 'Critical Research Essay – Final', 'report_due', '2026-11-23'::date, null, 10, 12, 'non_secure', false, '原文 OCR 为 1%，按 10% 处理，需确认'),
  ('Biology', 'Common Test 2', 'exam', '2026-12-14'::date, null, 7.5, 15, 'secure', false, 'Online'),
  ('Biology', 'Classwork / Homework / FLA', 'assignment', '2026-09-07'::date, null, 10, null, 'non_secure', false, '原文 OCR 为 1%，按 10% 处理，需确认；周次原文「Weekly」'),
  ('Biology', 'Final Exams', 'exam', '2027-01-06'::date, null, 50, null, 'secure', true, 'Written；6-13 Jan；周次原文「6-13 Jan」')
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

-- ② 子项节点（parent_id 由父节点标题反查）
with src(subj, parent_title, title, mtype, due, due_t, w, wk, md, major, note) as (values
  ('Media Studies', 'Common Tests 1 & 2', 'Common Test 1', 'exam', '2026-09-23'::date, null, 50, 3, 'secure', false, '占父节点 50%；Class A P4 12:30，Class B P3 11:20；时间原文「12:30 / 11:20」'),
  ('Media Studies', 'Common Tests 1 & 2', 'Common Test 2', 'exam', '2026-11-11'::date, null, 50, 10, 'secure', false, '占父节点 50%；schedule 原文 Week 10 仍写 Common Test 1，疑为 Common Test 2；时间原文「12:30 / 11:20」')
),
resolved as (
  select ps.id psid, pm.id parent_id, s.*
  from src s
  join program_subjects ps on ps.program_id = 2 and ps.subject_name = s.subj
  join academic_milestones pm on pm.program_subject_id = ps.id and pm.title = s.parent_title
)
insert into academic_milestones (program_subject_id, parent_id, title, milestone_type, due_date, due_time,
                                 weight_percent, week_no, mode, is_major, note)
select r.psid, r.parent_id, r.title, r.mtype::milestone_type, r.due, r.due_t::time, r.w, r.wk, r.md, r.major, r.note
from resolved r
where not exists (select 1 from academic_milestones m
                  where m.program_subject_id = r.psid and m.title = r.title);

commit;