-- ============================================================
-- Fast-track（program_id=3）科目底表
--
-- 背景：Fast-track 在系统里一直是空的 —— program_subjects 0 门，
--       且 2024-10 以来 11 名 Fast-track 学生从无任何选课记录。本次从零建底表。
--       本届：2026-10-05 ~ 2027-06-05（8 个月），4 人
--       冯琪(NFE-000033) / 李锦然(69) / 朱铠熠(70) / 郑哲元(71)。
--
-- 科目清单（用户决定）：Accelerated 现有 11 门 + Standard 独有的 Design、Mathematics = 13 门。
--
-- 字段口径完全照 Standard(1) / Accelerated(2)：
--   · EAP 是 core / english / 过线 65，其余 elective / 过线 50
--   · difficulty_level 一律 standard；hours_per_week 4.00、sessions_per_week 2
--   · max_students 留空（两个项目里也大多为空，要限人数再单独改）
--   · year / semester 留空 —— 那两列是给大学阶段 paper 分学期用的，预科不分
--   · 科目名用「Communication」而非旧名「Media Studies」（见 改名_MediaStudies为Communication_2026-10-13.sql）
--
-- 本次只建底表，不碰选课 / 课表 / 考核节点。
-- 幂等：按 (program_id, subject_name) 查重，已存在则跳过。
-- ============================================================
INSERT INTO public.program_subjects
  (program_id, subject_name, subject_category, subject_area, difficulty_level,
   pass_mark, hours_per_week, sessions_per_week)
SELECT * FROM (VALUES
  (3, 'Accounting',                          'elective'::subject_category, 'commerce'::subject_area, 'standard'::difficulty_level, 50, 4.00, 2),
  (3, 'Art History',                         'elective'::subject_category, 'arts'::subject_area,     'standard'::difficulty_level, 50, 4.00, 2),
  (3, 'Biology',                             'elective'::subject_category, 'science'::subject_area,  'standard'::difficulty_level, 50, 4.00, 2),
  (3, 'Calculus',                            'elective'::subject_category, 'science'::subject_area,  'standard'::difficulty_level, 50, 4.00, 2),
  (3, 'Chemistry',                           'elective'::subject_category, 'science'::subject_area,  'standard'::difficulty_level, 50, 4.00, 2),
  (3, 'Communication',                       'elective'::subject_category, 'arts'::subject_area,     'standard'::difficulty_level, 50, 4.00, 2),
  (3, 'Design',                              'elective'::subject_category, 'arts'::subject_area,     'standard'::difficulty_level, 50, 4.00, 2),
  (3, 'EAP (English for Academic Purposes)', 'core'::subject_category,     'english'::subject_area,  'standard'::difficulty_level, 65, 4.00, 2),
  (3, 'Economics',                           'elective'::subject_category, 'other'::subject_area,    'standard'::difficulty_level, 50, 4.00, 2),
  (3, 'Geography',                           'elective'::subject_category, 'arts'::subject_area,     'standard'::difficulty_level, 50, 4.00, 2),
  (3, 'Mathematics',                         'elective'::subject_category, 'other'::subject_area,    'standard'::difficulty_level, 50, 4.00, 2),
  (3, 'Physics',                             'elective'::subject_category, 'science'::subject_area,  'standard'::difficulty_level, 50, 4.00, 2),
  (3, 'Statistics',                          'elective'::subject_category, 'science'::subject_area,  'standard'::difficulty_level, 50, 4.00, 2)
) AS v(pid, name, cat, area, diff, pm, hpw, spw)
WHERE NOT EXISTS (
  SELECT 1 FROM public.program_subjects ps
   WHERE ps.program_id = v.pid AND ps.subject_name = v.name
);
