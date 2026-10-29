-- 导入：10.27 – 10.29 晚自习各老师工作安排（来源：Gris 发的「10.27-10.29 晚自习各老师工作安排(1).docx」）
-- 另加 10.29 两节小课（用户口述）：18:00–19:30 微积分、19:30–20:30 统计，只列指定学生（student_ids）。
-- 原文「传媒」统一写 Communication。
-- 原文矛盾：老师分工写「周三 Tiffany 线上看化学视频（学生在 109）」，课表 109 周三却写「线上看作品（经济）」；
--   按老师分工录：周三 109 = 化学，周四 109 = 经济（Shelley）。
-- 幂等：周按 week_start upsert；该周 sessions 先删后插（会覆盖系统里对这周的手工修改）。

begin;

insert into public.night_study_weeks (week_start, week_end, title, exam_notes, general_tasks, teacher_tasks, room_plan, source_file) values
('2026-10-26', '2026-11-01', '10.27 – 10.29 晚自习各老师工作安排',
 '本周（10.26 – 10.30）：生物 CT1（7.5%）、EAP Poster（30%）、艺术史 CT2 W2 Essay（10/27，10%）、地理 CGI Essay（10/28，10%）
下周（11.2 – 11.6）：微积分 CT3（11/2，15%）、统计 CT3（11/2，7.5%）、物理 CT2（11/2，4%）、化学 Group Presentation Video（11/2，7.5%）、经济 Group Presentation（11/2，15%）、Communication Visual Text（11/5，15%）
说明：10/26 周一劳动节不安排晚自习；周二、周三老师到场，周四无老师到场，其余老师的工作线上完成。',
 '在 Blackboard 上确认本周和下周所有作业和考试的准确日期。
在群里发本周晚自习通知，提醒同学 11/2 多科考试和作业集中，提前复习、提前完成小组作业，并请老师修改。',
 '[{"teacher":"Shikai","time":"本周","task":"在群里答疑物理 CT2 和会计"},
   {"teacher":"hanrui","time":"本周","task":"考前在群里发微积分、统计 CT3 的范围和练习资料"},
   {"teacher":"Tiffany","time":"本周","task":"在群里答疑生物 CT1"},
   {"teacher":"Shelley","time":"本周","task":"在群里答疑艺术史 Essay"},
   {"teacher":"Clara","time":"本周","task":"在群里答疑地理 CGI Essay"},
   {"teacher":"Ryan","time":"本周","task":"EAP Poster 草稿线上批注，在群里反馈"},
   {"teacher":"Gris","time":"本周","task":"在群里答疑 EAP 和 Communication"}]'::jsonb,
 '[{"date":"2026-10-26","note":"劳动节，不安排晚自习"},
   {"date":"2026-10-27","r106":null,"r109":"20:10 起转静音","r110":"全程静音"},
   {"date":"2026-10-28","r106":null,"r109":null,"r110":"全程静音"},
   {"date":"2026-10-29","r106":"全程讨论","r109":null,"r110":"全程静音"}]'::jsonb,
 '10.27-10.29 晚自习各老师工作安排(1).docx')
on conflict (week_start) do update set
  week_end = excluded.week_end, title = excluded.title, exam_notes = excluded.exam_notes,
  general_tasks = excluded.general_tasks, teacher_tasks = excluded.teacher_tasks,
  room_plan = excluded.room_plan, source_file = excluded.source_file;

delete from public.night_study_sessions
 where week_id = (select id from public.night_study_weeks where week_start = '2026-10-26');

with s(session_date, start_time, end_time, room, kind, subject, program_subject_id, milestone_id, teacher_name, assistants, topic, notes, student_ids) as (values
  ('2026-10-27'::date, '18:00'::time, '19:00'::time, '106', 'exam_prep', 'Physics', 61, 304, 'Shikai', null,
     '物理 CT2（11/2，4%，15 人）考前课：讲考前重点、强调考什么', '课后值班答疑物理和会计到 20:30', null::uuid[]),
  ('2026-10-27', '18:00', '19:10', null, 'qa', null, null::int, null::int, 'hanrui', null,
     '答疑统计和微积分', null, null),
  ('2026-10-27', '19:10', '20:10', '106', 'exam_prep', 'Calculus', 55, 281, 'hanrui', null,
     '微积分 CT3（11/2，15%）大课', null, null),
  ('2026-10-28', '18:00', '19:00', '106', 'exam_prep', 'Statistics', 62, 275, 'hanrui', null,
     '统计 CT3（11/2，7.5%，28 人）考前课：讲重点、强调考什么', '课后值班答疑统计和微积分到 20:30', null),
  ('2026-10-28', '18:30', null, '109', 'workshop', 'Chemistry', 56, 290, 'Tiffany', null,
     '化学小组视频线上看作品（8 人），每人 10–15 分钟；学生在 109 视频，也可以直接在文件里批注', '线上', null),
  ('2026-10-29', '18:30', null, '109', 'workshop', 'Economics', 58, 207, 'Shelley', null,
     '经济小组展示线上看作品（10 人），每人 10–15 分钟；学生在 109 视频，也可以直接在文件里批注', '线上', null),
  ('2026-10-29', '18:30', null, null, 'qa', 'Communication', 60, 213, 'Clara', null,
     'Communication Visual Text 线上答疑，有需要的同学再约线上小课', '线上', null),
  -- 小课（用户口述）：只对名单内学生
  ('2026-10-29', '18:00', '19:30', null, 'exam_prep', 'Calculus', 55, 281, null, null,
     '微积分小课（CT3 备考）', '小课 4 人',
     array['a0000000-0000-0000-0000-000000000009',   -- 陶政言
           'a0000000-0000-0000-0000-000000000013',   -- 叶羽萱
           'a0000000-0000-0000-0000-000000000018',   -- 周和璇
           'a0000000-0000-0000-0000-000000000012']::uuid[]),  -- 谢来格
  ('2026-10-29', '19:30', '20:30', null, 'exam_prep', 'Statistics', 62, 275, null, null,
     '统计小课（CT3 备考）', '小课 4 人',
     array['a0000000-0000-0000-0000-000000000008',   -- 汤佳琦
           'a0000000-0000-0000-0000-000000000016',   -- 赵紫萱
           'a0000000-0000-0000-0000-000000000015',   -- 张希珃
           'a0000000-0000-0000-0000-000000000019']::uuid[])   -- 朱锶语
)
insert into public.night_study_sessions (week_id, session_date, start_time, end_time, room, kind, subject, program_subject_id, milestone_id, teacher_name, teacher_id, assistants, topic, notes, student_ids)
select w.id, s.session_date, s.start_time, s.end_time, s.room, s.kind, s.subject, s.program_subject_id, s.milestone_id, s.teacher_name,
       (select p.id from public.profiles p where lower(p.full_name) = lower(s.teacher_name) and p.role <> 'student' limit 1),
       s.assistants, s.topic, s.notes, s.student_ids
from s
join public.night_study_weeks w on s.session_date between w.week_start and w.week_end;

commit;
