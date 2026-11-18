-- ============================================================
-- 晚自习安排导入：2026-11-09 ~ 11-12（11/13 周五不安排）
-- 数据源：《11.9-11.12 晚自习各老师工作安排.docx》+ 用户口头调整
--
-- ⚠️ 用户的口头调整**覆盖**文档原排，整体是「周二取消、Shikai 的内容往后挪一天」：
--   · 周二（11/10）不上晚自习 —— 文档原排 18:00 会计 FRT 考前课、19:10 录入成绩和出勤，取消
--   · 周四（11/12）EAP 课取消 —— 文档原排 18:00 EAP · Ryan
--   · 周三（11/11）= 会计 Financial Reporting Test 考前课（由周二挪来）+ 物理 Infographic 看作品
--   · 周四（11/12）= 会计 Group Presentation 讲解，含要求、评分和范例（由周三挪来，顶替取消的 EAP）
--   · 周一（11/9）化学小课用户未提及，按文档保留
--
-- 口径沿用既有脚本：18:00–19:00 / 19:10–20:10；teacher_id 只给有账号的；
-- student_ids 为空=该科全部选课学生；重跑先删本周再插，会覆盖之后的手工修改。
--
-- ⚠️ 文档没写、需补的两处（本脚本留空并在 notes 标明）：
--   · 11/9 化学小课：没写老师、没写针对哪个考核、没给小课名单。
--     库里化学待考的是 Group Presentation Video（ms 290，原定 11/2，上周文档标「延迟」）
--     和 Practical Test（ms 285，11/30）—— 不确定是哪个，milestone_id 留空。
--   · 11/12 会计 Group Presentation 讲解的授课老师用户没说，按科目归属推定为 Shikai。
-- ============================================================
BEGIN;

INSERT INTO night_study_weeks (week_start, week_end, title, exam_notes, general_tasks,
                               teacher_tasks, room_plan, source_file)
VALUES (
  DATE '2026-11-09', DATE '2026-11-15',
  '11.9 – 11.12 晚自习各老师工作安排',
  '本周（11.9 – 11.13）：艺术史 Group Presentation（11/9，10%）、生物 Group Presentation Video（11/9，5%）、'
  || '地理 Video Presentation（11/11，10%）、传媒 CT2（11/11，2.5%）' || chr(10)
  || '下周（11.16 – 11.20）：会计 Financial Reporting Test（11/16，10%）、物理 Group Project Infographic（11/16，7.5%）' || chr(10)
  || '提前准备：11/23 会计 Group Presentation 10%、统计 CT4 7.5%、生物 Research Essay 10%；'
  || '11/26 传媒 Essay 15%；11/30 EAP Academic Interview 30%（35 人）。',
  '确认本周和下周所有作业和考试的准确日期，尤其是物理 Infographic 和统计 CT4。' || chr(10)
  || '在群里发本周晚自习通知，提醒物理同学周三带 Infographic 来看作品。' || chr(10)
  || '把本周课上的 PPT 和资料整理好，发到各自科目的辅导群。',
  '[
    {"teacher":"hanrui","time":"本周","task":"下周线下讲统计 CT4 和 Group Project（12/7，12.5%）"},
    {"teacher":"Clara","time":"本周","task":"周三前在群里答疑传媒 CT2；可以开始批改传媒 Essay 提纲（11/26 交）"},
    {"teacher":"Shelley","time":"本周","task":"艺术史展示收尾；批改经济 Research Essay 提纲（11/30 交）"},
    {"teacher":"Gris","time":"本周","task":"配合 Ryan 在群里答疑 EAP Interview"},
    {"teacher":"Ryan","time":"本周","task":"周四 EAP 线下课已取消；EAP Academic Interview（11/30，30%，35 人）的讲解改为线上答疑/另行安排"}
  ]'::jsonb,
  '[
    {"date":"2026-11-09","r106":"18:00 化学小课，19:00 起转讨论","r109":"19:00 起转静音","r110":"全程静音"},
    {"date":"2026-11-10","note":"周二不安排晚自习（文档原排 18:00 会计 · Shikai、19:10 录入成绩和出勤，已取消）"},
    {"date":"2026-11-11","r106":"18:00 会计 FRT 考前课、19:10 物理看作品","r109":"20:10 起转静音","r110":"全程静音"},
    {"date":"2026-11-12","r106":"18:00 会计 Group Presentation 讲解，19:00 起转讨论","r109":"19:00 起转静音","r110":"全程静音"},
    {"date":"2026-11-13","note":"周五不安排晚自习"}
  ]'::jsonb,
  '11.9-11.12 晚自习各老师工作安排.docx（+ 用户口头调整：周二取消、周四 EAP 取消、会计两节顺延）'
)
ON CONFLICT (week_start) DO UPDATE SET
  week_end = EXCLUDED.week_end, title = EXCLUDED.title, exam_notes = EXCLUDED.exam_notes,
  general_tasks = EXCLUDED.general_tasks, teacher_tasks = EXCLUDED.teacher_tasks,
  room_plan = EXCLUDED.room_plan, source_file = EXCLUDED.source_file;

DELETE FROM night_study_sessions
 WHERE week_id = (SELECT id FROM night_study_weeks WHERE week_start = DATE '2026-11-09');

WITH w AS (SELECT id FROM night_study_weeks WHERE week_start = DATE '2026-11-09'),
src(d, st, et, room, kind, subject, ps_id, ms_id, teacher, topic, notes) AS (VALUES
  ('2026-11-09','18:00','19:00','106','workshop','Chemistry',  56, NULL::int, NULL::text,
   '化学小课',
   '⚠️ 文档课表只写「18:00 化学小课」：未写授课老师、未写针对哪个考核、未给小课名单。'
   || '库里化学待考的是 Group Presentation Video（ms 290，原定 11/2 已延迟）与 Practical Test（ms 285，11/30），待确认。'
   || '19:00 起 106 转讨论、109 转静音'),

  ('2026-11-11','18:00','19:00','106','exam_prep','Accounting', 52, 185, 'Shikai',
   '会计 Financial Reporting Test（11/16 考，10%，14 人）考前大课：讲重难点、强调考什么',
   '文档原排在周二 18:00；周二晚自习取消后移到周三'),

  ('2026-11-11','19:10','20:10','106','workshop','Physics',     61, 298, 'Shikai',
   '物理 Infographic（11/16，7.5%）看作品、给修改建议',
   '请选物理的同学带好作品来'),

  ('2026-11-12','18:00','19:00','106','review','Accounting',    52, 188, 'Shikai',
   '会计 Group Presentation（11/23 交，10%）讲解：要求、评分标准、范例',
   '文档原排在周三 18:00；周四 EAP 课取消后移到周四。授课老师文档未写，按科目归属推定为 Shikai')
)
INSERT INTO night_study_sessions (week_id, session_date, start_time, end_time, room, kind,
                                  subject, program_subject_id, milestone_id,
                                  teacher_name, teacher_id, student_ids, topic, notes)
SELECT w.id, s.d::date, s.st::time, s.et::time, s.room, s.kind,
       s.subject, s.ps_id, s.ms_id,
       s.teacher,
       (SELECT p.id FROM profiles p WHERE p.full_name ILIKE s.teacher AND p.role <> 'student' LIMIT 1),
       NULL::uuid[], s.topic, s.notes
FROM src s CROSS JOIN w;

COMMIT;
