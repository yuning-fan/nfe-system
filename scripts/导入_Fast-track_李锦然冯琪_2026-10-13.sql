-- ============================================================
-- Fast-track 2026-10 批次：李锦然(NFE-000069) / 冯琪(NFE-000033) 的课表·选课·账号·信息
--
-- 数据源：
--   冯琪   —— 《冯琪(2)(2)(1).xlsx》「我的课表」18 行 + 「我的信息」，学生自填，完整
--   李锦然 —— 「我的课表」那页**学生没填**，课表取自用户提供的 UoA 门户时刻表截图
--             （2026-10-05~10-09 周视图，# 271086267，与「我的信息」里的登录邮箱对得上）
--             截图中 Statistics(5001FON) 三节呈淡色半透明，用户确认**算正式选课**，照导。
--
-- 口径沿用 导入_Accelerated开学数据_2026-09-10.sql：
--   · 选课 selection_type 跟随 program_subjects.subject_category（EAP=core，其余 elective）
--   · 课表整表替换语义：先删这两人的 Fast-track 课表再插
--   · effective_from/until 取其报名起止（2026-10-05 ~ 2027-06-05）
--   · 账号同一学生同一平台已存在则跳过
--
-- ⚠ 两处要留意（已与用户确认 / 已告知）：
--   1. 李锦然目标专业按 Excel **覆盖**库里原有的「工程和设计学院」，
--      目标大学一并规范成 University of Auckland（库里原为中文「奥克兰大学」，
--      其余学生都是英文，统一口径）。冯琪为空，照常填入。
--   2. 李锦然邮箱域名是 upsttudent.org（两个 t），冯琪是 upstudent.org。
--      疑似学生笔误，但**照原样导入**，不替他改账号。
--
-- 幂等：选课/账号按存在性跳过；课表先删后插；信息字段 1 覆盖、其余只填空。
-- ============================================================
BEGIN;

-- ① 选课（李锦然 5 门 / 冯琪 5 门）
--    李锦然的 EAP 已由页面「补齐必修」建过一条，WHERE NOT EXISTS 会跳过，不会重复。
WITH src(nfe_no, subj) AS (VALUES
  (69, 'EAP (English for Academic Purposes)'),
  (69, 'Calculus'),
  (69, 'Physics'),
  (69, 'Accounting'),
  (69, 'Statistics'),
  (33, 'EAP (English for Academic Purposes)'),
  (33, 'Calculus'),
  (33, 'Accounting'),
  (33, 'Statistics'),
  (33, 'Economics')
),
resolved AS (
  SELECT e.id AS enrollment_id, ps.id AS program_subject_id,
         (CASE WHEN ps.subject_category = 'core' THEN 'core' ELSE 'elective' END) AS sel_type
  FROM src s
  JOIN students_info si ON si.nfe_no = s.nfe_no
  JOIN student_enrollments e ON e.student_id = si.student_id AND e.program_id = 3 AND e.status = 'active'
  JOIN program_subjects ps ON ps.program_id = 3 AND ps.subject_name = s.subj
)
INSERT INTO student_subject_selections (enrollment_id, program_subject_id, selection_type, status, confirmed_at)
SELECT r.enrollment_id, r.program_subject_id, r.sel_type::subject_category, 'confirmed'::selection_status, now()
FROM resolved r
WHERE NOT EXISTS (
  SELECT 1 FROM student_subject_selections x
   WHERE x.enrollment_id = r.enrollment_id AND x.program_subject_id = r.program_subject_id
);

-- ② 课表（李锦然 18 节 / 冯琪 18 节）。整表替换：先删这两人的 Fast-track 课表。
DELETE FROM school_timetable t
USING students_info si, student_enrollments e
WHERE t.student_id = si.student_id
  AND e.student_id = si.student_id AND e.program_id = 3 AND e.status = 'active'
  AND t.enrollment_id = e.id
  AND si.nfe_no IN (33, 69);

WITH src(nfe_no, dow, st, et, subj) AS (VALUES
  -- ——— 李锦然 (69)：取自 UoA 门户截图 ———
  (69, 1, '11:20'::time, '12:30'::time, 'Physics'),
  (69, 1, '12:30'::time, '13:40'::time, 'Calculus'),
  (69, 1, '13:40'::time, '14:50'::time, 'Accounting'),
  (69, 2, '09:00'::time, '10:09'::time, 'EAP (English for Academic Purposes)'),
  (69, 2, '10:10'::time, '11:20'::time, 'EAP (English for Academic Purposes)'),
  (69, 2, '11:20'::time, '12:30'::time, 'Statistics'),
  (69, 2, '16:00'::time, '17:10'::time, 'Physics'),
  (69, 3, '10:10'::time, '11:20'::time, 'Calculus'),
  (69, 3, '11:20'::time, '12:30'::time, 'Accounting'),
  (69, 3, '14:50'::time, '15:59'::time, 'EAP (English for Academic Purposes)'),
  (69, 3, '16:00'::time, '17:10'::time, 'EAP (English for Academic Purposes)'),
  (69, 4, '09:00'::time, '10:10'::time, 'Statistics'),
  (69, 4, '13:40'::time, '14:50'::time, 'Physics'),
  (69, 4, '14:50'::time, '16:00'::time, 'Calculus'),
  (69, 4, '16:00'::time, '17:10'::time, 'Accounting'),
  (69, 5, '11:20'::time, '12:29'::time, 'EAP (English for Academic Purposes)'),
  (69, 5, '12:30'::time, '13:40'::time, 'EAP (English for Academic Purposes)'),
  (69, 5, '13:40'::time, '14:50'::time, 'Statistics'),

  -- ——— 冯琪 (33)：学生自填的「我的课表」 ———
  (33, 1, '10:10'::time, '11:20'::time, 'Accounting'),
  (33, 1, '11:20'::time, '12:30'::time, 'Statistics'),
  (33, 1, '13:40'::time, '14:50'::time, 'Economics'),
  (33, 1, '14:50'::time, '16:00'::time, 'Calculus'),
  (33, 2, '09:00'::time, '10:09'::time, 'EAP (English for Academic Purposes)'),
  (33, 2, '10:10'::time, '11:20'::time, 'EAP (English for Academic Purposes)'),
  (33, 2, '14:50'::time, '16:00'::time, 'Accounting'),
  (33, 2, '16:00'::time, '17:10'::time, 'Statistics'),
  (33, 3, '11:20'::time, '12:30'::time, 'Economics'),
  (33, 3, '12:30'::time, '13:40'::time, 'Calculus'),
  (33, 3, '14:50'::time, '15:59'::time, 'EAP (English for Academic Purposes)'),
  (33, 3, '16:00'::time, '17:10'::time, 'EAP (English for Academic Purposes)'),
  (33, 4, '12:30'::time, '13:40'::time, 'Accounting'),
  (33, 4, '13:40'::time, '14:50'::time, 'Statistics'),
  (33, 4, '16:00'::time, '17:10'::time, 'Economics'),
  (33, 5, '09:00'::time, '10:10'::time, 'Calculus'),
  (33, 5, '11:20'::time, '12:29'::time, 'EAP (English for Academic Purposes)'),
  (33, 5, '12:30'::time, '13:40'::time, 'EAP (English for Academic Purposes)')
),
resolved AS (
  SELECT si.student_id, e.id AS enrollment_id, ps.id AS program_subject_id,
         s.dow, s.st, s.et,
         e.start_date, COALESCE(e.end_date, e.start_date + INTERVAL '1 year')::date AS end_date
  FROM src s
  JOIN students_info si ON si.nfe_no = s.nfe_no
  JOIN student_enrollments e ON e.student_id = si.student_id AND e.program_id = 3 AND e.status = 'active'
  JOIN program_subjects ps ON ps.program_id = 3 AND ps.subject_name = s.subj
)
INSERT INTO school_timetable (student_id, enrollment_id, program_subject_id, day_of_week,
                              start_time, end_time, room, effective_from, effective_until,
                              is_confirmed, confirmed_at)
SELECT student_id, enrollment_id, program_subject_id, dow, st, et, NULL,
       start_date, end_date, true, now()
FROM resolved;

-- ③ 学校平台账号（每人 SELMA + Blackboard，同一组账号密码）
WITH src(nfe_no, platform, account, pwd) AS (VALUES
  (69, 'SELMA',      '271086267@upsttudent.org', 'Auckland17326166799'),
  (69, 'Blackboard', '271086267@upsttudent.org', 'Auckland17326166799'),
  (33, 'SELMA',      '271025908@upstudent.org',  '@Lzh1988053120080923'),
  (33, 'Blackboard', '271025908@upstudent.org',  '@Lzh1988053120080923')
),
resolved AS (
  SELECT si.student_id, s.platform, s.account, s.pwd
  FROM src s JOIN students_info si ON si.nfe_no = s.nfe_no
)
INSERT INTO student_credentials (student_id, platform_name, account, encrypted_password)
SELECT r.student_id, r.platform, r.account, r.pwd
FROM resolved r
WHERE NOT EXISTS (
  SELECT 1 FROM student_credentials x
   WHERE x.student_id = r.student_id AND x.platform_name = r.platform
);

-- ④ UP 学号 / 目标大学 / 目标专业 / 英语水平
--    李锦然的 UP 学号「我的信息」那格是空的，取自登录邮箱前缀 271086267（与截图 # 号一致）。
--    目标专业按用户决定用 Excel 覆盖；其余字段只填空不覆盖。
WITH src(nfe_no, up_id, uni, degree, eng) AS (VALUES
  (69, '271086267', 'University of Auckland', 'BE(Hons) Computer Systems Engineering',
       '雅思 5.5（听5.5 说5.0 读6.0 写5.0）'),
  (33, '271025908', 'University of Auckland', 'Business Analytics',
       '内测（未出分）')
),
resolved AS (
  SELECT si.student_id, s.up_id, s.uni, s.degree, s.eng
  FROM src s JOIN students_info si ON si.nfe_no = s.nfe_no
)
UPDATE students_info si
   SET up_student_id   = COALESCE(NULLIF(si.up_student_id, ''), r.up_id),
       target_university = r.uni,          -- 规范成英文名，与其余学生一致
       target_degree     = r.degree,       -- 用户决定：用 Excel 的覆盖
       english_level     = COALESCE(NULLIF(si.english_level, ''), r.eng)
FROM resolved r
WHERE si.student_id = r.student_id;

COMMIT;
