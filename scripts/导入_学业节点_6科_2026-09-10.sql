-- 学业节点导入（academic_milestones）· program_id=2 预科-Accelerated
-- 科目：Art History, Calculus, Chemistry, EAP (English for Academic Purposes), Physics, Statistics
-- 顶层 43 条 + 子项 0 条；幂等：按 (program_subject_id, title) 去重
begin;

-- ① 顶层节点
with src(subj, title, mtype, due, due_t, w, wk, md, major, note) as (values
  ('Chemistry', 'Progress Quiz', 'exam', '2026-09-21'::date, null, 0, 3, 'non_secure', false, '原文 1%*，经确认不计入总评按 0；原文只给 Week 3；Online'),
  ('Chemistry', 'Group Project Infographic', 'assignment', '2026-09-28'::date, null, 7.5, 4, 'non_secure', false, '原文只给 Week 4；Variable'),
  ('Chemistry', 'Common Test 1', 'exam', '2026-10-12'::date, null, 7.5, 6, 'secure', false, '原文只给 Week 6；Online'),
  ('Chemistry', 'Group Presentation Video', 'assignment', '2026-11-02'::date, null, 7.5, 9, 'non_secure', false, '原文只给 Week 9；Variable'),
  ('Chemistry', 'Practical Test', 'exam', '2026-11-30'::date, null, 10, 13, 'secure', false, '原文只给 Week 13；Online'),
  ('Chemistry', 'Common Test 2', 'exam', '2026-12-14'::date, null, 7.5, 15, 'secure', false, '原文只给 Week 15；Online'),
  ('Chemistry', 'Classwork / Homework / FLA', 'assignment', '2026-09-07'::date, null, 10, null, 'non_secure', false, '每周；Online / Written；周次原文「Weekly」'),
  ('Chemistry', 'Final Exams', 'exam', '2027-01-06'::date, null, 50, null, 'secure', true, '原文 6-13 Jan；Written；周次原文「6-13 Jan」'),
  ('Statistics', 'Common Test 1', 'exam', '2026-09-21'::date, null, 5, 3, 'secure', false, '原文 Secure；日期占位，原文只给 Week 3'),
  ('Statistics', 'Common Test 2', 'exam', '2026-10-12'::date, null, 7.5, 6, 'secure', false, '原文 Secure；日期占位，原文只给 Week 6'),
  ('Statistics', 'Common Test 3', 'exam', '2026-11-02'::date, null, 7.5, 9, 'secure', false, '原文 Secure；日期占位，原文只给 Week 9'),
  ('Statistics', 'Common Test 4', 'exam', '2026-11-23'::date, null, 7.5, 12, 'secure', false, '原文 Secure；日期占位，原文只给 Week 12'),
  ('Statistics', 'Group Project', 'assignment', '2026-12-07'::date, null, 12.5, 14, 'non_secure', false, '原文 Non-secure；Topic 12 Bivariate Data'),
  ('Statistics', 'Flexible Learning Activities', 'assignment', '2026-09-07'::date, null, 10, null, 'non_secure', false, '原文 Non-secure；All topics；日期占位；周次原文「Throughout the course」'),
  ('Statistics', 'Final Examination', 'exam', '2027-01-06'::date, null, 50, null, 'secure', true, '原文 Secure；All topics；考试 6-13 Jan，日期占位；周次原文「Week 16, 17」'),
  ('Calculus', 'Common Test 1', 'exam', '2026-09-21'::date, null, 6, 3, 'secure', false, '原文 Secure；日期占位，原文只给 Week 3'),
  ('Calculus', 'Common Test 2', 'exam', '2026-10-05'::date, null, 9, 5, 'secure', false, '原文 Secure；日期占位，原文只给 Week 5'),
  ('Calculus', 'Common Test 3', 'exam', '2026-11-02'::date, null, 15, 9, 'secure', false, '原文 Secure；日期占位，原文只给 Week 9'),
  ('Calculus', 'Common Test 4', 'exam', '2026-12-14'::date, null, 15, 15, 'secure', false, '原文 Secure；日期占位，原文只给 Week 15'),
  ('Calculus', 'Flexible Learning Activities', 'assignment', '2026-09-07'::date, null, 5, null, 'non_secure', false, '原文 Non-secure；All topics；日期占位；周次原文「Throughout the course」'),
  ('Calculus', 'Final Examination', 'exam', '2027-01-06'::date, null, 50, null, 'secure', true, '原文 Secure；All topics；考试 6-13 Jan，日期占位；周次原文「Week 16, 17」'),
  ('Physics', 'Progress Quiz', 'exam', '2026-09-21'::date, null, 0, 3, null, false, '原文 1%*；若计入则合计 101，疑不计入总评，暂按 0，需确认；Online，未注明 Secure/Non-secure；日期占位'),
  ('Physics', 'Common Test 1', 'exam', '2026-10-05'::date, null, 5.5, 5, 'secure', false, '原文 Common Test；Online；日期占位，原文只给 Week 5'),
  ('Physics', 'Practical Investigation', 'report_due', '2026-10-12'::date, null, 10, 6, 'non_secure', false, '原文 Online / Written；Variable: Currently, Mechanics；日期占位'),
  ('Physics', 'Common Test 2', 'exam', '2026-11-02'::date, null, 4, 9, 'secure', false, '原文 Common Test；Online；日期占位，原文只给 Week 9'),
  ('Physics', 'Group Project Infographic', 'assignment', '2026-11-16'::date, null, 7.5, 11, 'non_secure', false, 'Variable: Currently, Fundamental Forces；日期占位'),
  ('Physics', 'Group Presentation Video', 'assignment', '2026-11-30'::date, null, 7.5, 13, 'non_secure', false, 'Variable: Currently, Electricity；日期占位'),
  ('Physics', 'Common Test 3', 'exam', '2026-12-14'::date, null, 5.5, 15, 'secure', false, '原文 Common Test；Online；日期占位，原文只给 Week 15'),
  ('Physics', 'Classwork / Homework / FLA', 'assignment', '2026-09-07'::date, null, 10, null, 'non_secure', false, '原文 Online / Written；All the above*；日期占位；周次原文「Weekly」'),
  ('Physics', 'Final Exams', 'exam', '2027-01-06'::date, null, 50, null, 'secure', true, '原文 Written；All the above；考试 6-13 Jan，日期占位；周次原文「6-13 Jan」'),
  ('Art History', 'Flexible Learning Activities (FLAs)', 'assignment', '2026-09-07'::date, null, 5, null, 'non_secure', false, '原文 Non-Secure；Topics 1-6；日期占位，原文 TBA；周次原文「TBA」'),
  ('Art History', 'Renaissance Quiz 1 (EP)', 'exam', '2026-09-21'::date, null, 3, 3, 'non_secure', false, '原文 Non-Secure；EP；原文日期 21/09'),
  ('Art History', 'Renaissance Quiz 2 (EP)', 'exam', '2026-09-28'::date, null, 2, 4, 'non_secure', false, '原文 Non-Secure；EP；原文日期 28/09'),
  ('Art History', 'Common Test W1 – Painting Analysis', 'exam', '2026-10-12'::date, null, 10, 6, 'secure', false, '原文 Secure；Linear and Atmospheric Perspective；原文日期 12/10'),
  ('Art History', 'Common Test 2 – W2 Essay', 'exam', '2026-10-27'::date, null, 10, 8, 'secure', false, '原文 Secure；High Renaissance – The Influence of the Classical Period；原文日期 27/10'),
  ('Art History', 'Presentation - Group', 'assignment', '2026-11-09'::date, null, 10, 10, 'non_secure', false, '原文 Non-Secure；Renaissance Portraiture Comparison；原文日期 9/11'),
  ('Art History', 'Curation Assessment W3', 'assignment', '2026-12-07'::date, null, 10, 14, 'secure', false, '原文 Secure；The Modern Period – Cubism to Abstraction；原文日期 7/12'),
  ('Art History', 'Examinations', 'exam', '2027-01-06'::date, null, 50, null, 'secure', true, 'outline 的 Assessment Overview 未列权重，经确认按 50%；考试 6-13 Jan，日期占位；周次原文「Week 16, 17」'),
  ('EAP (English for Academic Purposes)', 'Source Evaluation', 'report_due', '2026-09-21'::date, null, 10, 3, 'secure', false, '原文 Secure；One period；日期占位，原文只给 Week 3'),
  ('EAP (English for Academic Purposes)', 'Source Evaluation and Comparison', 'report_due', '2026-10-05'::date, null, 20, 5, 'secure', false, '原文 Secure；Two periods；日期占位，原文只给 Week 5'),
  ('EAP (English for Academic Purposes)', 'Group Academic Poster Presentation', 'assignment', '2026-10-26'::date, null, 30, null, 'non_secure', true, '原文 Non-secure；占比 ≥25%；日期占位为 Week 8 起始周；周次原文「Weeks 8 - 10」'),
  ('EAP (English for Academic Purposes)', 'Academic Interview', 'exam', '2026-11-30'::date, null, 30, null, 'secure', true, '原文 Secure；Interviews in class time；占比 ≥25%；日期占位为 Week 13 起始周；周次原文「Weeks 13 - 15」'),
  ('EAP (English for Academic Purposes)', 'Coursework', 'assignment', '2026-09-07'::date, null, 10, null, 'secure', false, '原文 Secure；Reflective Journals 等；日期占位；周次原文「Ongoing」')
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