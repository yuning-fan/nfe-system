-- ============================================================
-- 晚自习安排导入：2026-11-02 ~ 11-06（11/6 周五不安排）
-- 数据源：《11.2-11.6 晚自习各老师工作安排.docx》
--
-- 7 节课。口径沿用 导入_晚自习安排_9月-10月_2026-10-12.sql：
--   · 一晚「上课 + 答疑」拆两行；18:00–19:00 / 19:10–20:10
--   · teacher_id 只给有系统账号的（hanrui 有；Clara、Shelley 没有，只存 teacher_name）
--   · student_ids 为空 = 该科全部选课学生；非空 = 小课仅名单内学生
--   · 重跑会先删本周再插，会覆盖之后的手工修改
--
-- 用户已确认的两处：
--   1. 11/2 周一两节以**下方课表安排**为准（18:00 微积分小课、19:10 答疑）。
--      文档上半部 hanrui 任务栏写反了（18:00 答疑、19:10 小课），不采用。
--   2. 微积分小课原文「谢来格、陶政言等 6 人」只给了 2 个名字，
--      student_ids 先只写这 2 人，notes 标明。
--
-- ⚠️ 文档与库不一致，**本脚本未改动节点**，仅记录在此：
--   · 微积分 CT3：库里 milestone 281 的日期是 2026-11-02，文档写 11/4 周三
--     （通用任务里也写「提醒同学周三考微积分」）。考试似已推迟，节点日期待更新。
--   （传媒 CT2 核过了，不是不一致：milestone 217 是子项，50% 指占父节点
--     「Common Tests 1 & 2」（占总评 5%）的 50%，即占总评 2.5%，与文档一致。）
-- ============================================================
BEGIN;

INSERT INTO night_study_weeks (week_start, week_end, title, exam_notes, general_tasks,
                               teacher_tasks, room_plan, source_file)
VALUES (
  DATE '2026-11-02', DATE '2026-11-08',
  '11.2 – 11.6 晚自习各老师工作安排',
  '本周（11.2 – 11.6）：统计 CT3（11/2，7.5%，已排）、物理 CT2（11/2，4%，已排）、'
  || '化学 Group Presentation Video（11/2，7.5%，延迟）、经济 Group Presentation（11/2，15%，已排）、'
  || '微积分 CT3（11/4 周三，15%，已排）、传媒 Visual Text（11/5 周四，15%，已排）' || chr(10)
  || '下周（11.9 – 11.13）：艺术史 Group Presentation（11/9，10%，已排）、生物视频（11/9，5%，下周排课）、'
  || '地理 Video Presentation（11/11，10%，已排）、传媒 CT2（11/11，2.5%，已排）' || chr(10)
  || '说明：本周后若 Clara、Shelley 不再上线下课，需要后面考试和作业的要求本周尽量讲完。',
  '在 Blackboard 上确认本周和下周所有作业和考试的准确日期。' || chr(10)
  || '在群里发本周晚自习通知，提醒同学周三考微积分、周四交传媒 Visual Text。' || chr(10)
  || '把本周课上的 PPT 和资料整理好，发到各自科目的辅导群，方便之后线上复习。',
  '[
    {"teacher":"hanrui","time":"本周","task":"周三考前在群里答疑微积分"},
    {"teacher":"Clara","time":"本周之后","task":"线上看地理视频作品，批改传媒 Essay 提纲，跟进两科 Group Presentation"},
    {"teacher":"Shelley","time":"本周之后","task":"线上批注艺术史展示稿（11/9 前）和经济 Research Essay 提纲；经济 CT2 日期出来后告诉学管"},
    {"teacher":"Shikai","time":"本周","task":"本周不到场。会计 Financial Reporting Test 和物理 Infographic 都在 11/16，本周先在群里发要求学生们做的内容"},
    {"teacher":"Ryan / Gris / Leia","time":"本周","task":"在群里答疑 EAP，准备 EAP presentation"}
  ]'::jsonb,
  '[
    {"date":"2026-11-02","r106":"18:00 微积分小课、19:10 讨论（答疑）","r109":"19:10–20:10 讨论，其余静音","r110":"全程静音"},
    {"date":"2026-11-03","r106":"18:00 / 19:10 传媒","r109":"20:10 起转静音","r110":"全程静音"},
    {"date":"2026-11-04","r106":"18:00 地理，19:00 起转讨论","r109":"19:00 起转静音","r110":"全程静音"},
    {"date":"2026-11-05","r106":"18:00 艺术史、19:10 经济","r109":"20:10 起转静音","r110":"全程静音"},
    {"date":"2026-11-06","note":"周五不安排晚自习"}
  ]'::jsonb,
  '11.2-11.6 晚自习各老师工作安排.docx'
)
ON CONFLICT (week_start) DO UPDATE SET
  week_end = EXCLUDED.week_end, title = EXCLUDED.title, exam_notes = EXCLUDED.exam_notes,
  general_tasks = EXCLUDED.general_tasks, teacher_tasks = EXCLUDED.teacher_tasks,
  room_plan = EXCLUDED.room_plan, source_file = EXCLUDED.source_file;

-- 整周替换：先删本周的课，再插
DELETE FROM night_study_sessions
 WHERE week_id = (SELECT id FROM night_study_weeks WHERE week_start = DATE '2026-11-02');

WITH w AS (SELECT id FROM night_study_weeks WHERE week_start = DATE '2026-11-02'),
src(d, st, et, room, kind, subject, ps_id, ms_id, teacher, sids, topic, notes) AS (VALUES
  ('2026-11-02','18:00','19:00','106','exam_prep','Calculus',      55, 281, 'hanrui',
   ARRAY['a0000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000009']::uuid[],
   '微积分 CT3（11/4，15%）考前小课：针对薄弱点讲解和练习',
   '小课。原文「谢来格、陶政言等 6 人」，只给出 2 人名单，其余 4 人待补'),

  ('2026-11-02','19:10','20:10','106','qa','Calculus',             55, 281, 'hanrui', NULL::uuid[],
   '答疑：微积分 CT3（周三考），统计考完的问题也可以问',
   '109 室同步 19:10–20:10 转讨论，其余静音'),

  ('2026-11-03','18:00','19:00','106','exam_prep','Communication', 60, 213, 'Clara', NULL::uuid[],
   '传媒 Visual Text（11/5 交，15%）考前大课：最后的重点和常见问题', NULL),

  ('2026-11-03','19:10','20:10','106','review','Communication',    60, 212, 'Clara', NULL::uuid[],
   '传媒 Essay（11/26，15%）怎么写、评分标准；CT2（11/11）范围和讲解',
   '一节覆盖两个考核，节点挂 Essay；CT2 见 milestone 217'),

  ('2026-11-04','18:00','19:00','106','review','Geography',        59, 315, 'Clara', NULL::uuid[],
   '地理 Video Presentation（11/11，10%）要求和评分；时间够则讲 Group Presentation（12/8）要求和评分',
   '19:00 起 106 转讨论、109 转静音'),

  ('2026-11-05','18:00','19:00','106','review','Art History',      53, 295, 'Shelley', NULL::uuid[],
   '艺术史 Group Presentation（11/9，10%）；Curation Assessment W3（12/7）怎么做', NULL),

  ('2026-11-05','19:10','20:10','106','review','Economics',        58, 190, 'Shelley', NULL::uuid[],
   '经济 Research Essay（11/30，10%）怎么写；CT2 考前要点；CT3（12/7）考试要点',
   '经济 CT2 日期未定，Shelley 拿到后告知学管')
)
INSERT INTO night_study_sessions (week_id, session_date, start_time, end_time, room, kind,
                                  subject, program_subject_id, milestone_id,
                                  teacher_name, teacher_id, student_ids, topic, notes)
SELECT w.id, s.d::date, s.st::time, s.et::time, s.room, s.kind,
       s.subject, s.ps_id, s.ms_id,
       s.teacher, (SELECT p.id FROM profiles p WHERE p.full_name = s.teacher AND p.role <> 'student' LIMIT 1),
       s.sids, s.topic, s.notes
FROM src s CROSS JOIN w;

COMMIT;
