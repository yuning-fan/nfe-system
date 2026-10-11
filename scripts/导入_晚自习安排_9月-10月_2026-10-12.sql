-- 导入：开学以来晚自习安排（9.7 – 10.16 共 6 周），来源为 Gris 每周发的安排文档：
--   9.7-9.11晚自习规划(1).docx / 9.14—9.20 晚自习安排(1).docx / 9.21–9.25 晚自习安排.pdf /
--   9.28-10.1 晚自习各老师工作安排(1).docx（定稿版；同名无(1)的是 9/27 初稿，周二由 EAP 改为艺术史）/
--   10.5-10.9 晚自习各老师工作安排.docx / 10.12-10.16 晚自习各老师工作安排.docx
-- 幂等：周按 week_start upsert；该周的 sessions 先删后插（重跑会覆盖系统里对这几周的手工修改）。
-- 课程统一为 预科-Accelerated（2026-09 批）科目，program_subject_id 52–62；milestone_id 为该节针对的考核。

begin;

-- ───────── 周计划 ─────────
insert into public.night_study_weeks (week_start, week_end, title, exam_notes, general_tasks, teacher_tasks, room_plan, source_file) values
('2026-09-07', '2026-09-11', '9.7–9.11 晚自习规划（开学周）',
 null,
 '总体目标：学生账号、选课、课表、outline 全部核实并录入系统；学生清楚各科考核方式、及格线、AI 政策；EAP、微积分、物理、统计、会计五科完成第一次 intro。
学管本周：统计选课与课表并录入系统；收集账号密码并逐一登录确认；确认每人目标大学专业并整理各科 GPA 要求；统计英语水平，标出 EAP 目标 65 还是有专业额外要求；outline 讲义分发给对应老师；周一晚收集核对选课确认、课表、学业节点表。
学生本周：周一登录账号、查看各科 outline、按模板提交选课/课表/学业节点；周二至周四按安排听 intro 并记录考核方式、及格线、关键日期、各章内容与学习方法；周五无晚自习。
Intro 通用结构：课程介绍 5min → 考核全景 15min（几次考试、各占多少、哪些 secure 监考、AI 能否使用）→ 按单元过内容 25–30min → 易挂科失分点 10min → 学习方法 10min → Q&A 5–10min。',
 '[]'::jsonb,
 '[{"date":"2026-09-07","note":"账号登录确认、查看 outline、提交选课/课表/学业节点表"},
   {"date":"2026-09-08","note":"EAP intro（Ryan，1–1.5h），其余时间自习"},
   {"date":"2026-09-09","note":"微积分 intro（Hanrui）、物理 intro（Shikai），其余学生自习"},
   {"date":"2026-09-10","note":"统计 intro（Hanrui）、会计 intro（Shikai），其余学生自习"},
   {"date":"2026-09-11","note":"不上晚自习"}]'::jsonb,
 '9.7-9.11晚自习规划(1).docx'),

('2026-09-14', '2026-09-20', '9.14–9.20 晚自习安排',
 null,
 '教室：109 固定静音自习；106 有课/辅导时为上课教室，否则为讨论教室；110 在 106 有课时为讨论教室。静音教室禁止交谈、外放，手机静音；讨论教室控制音量。
出勤：助教与学管共同登记 9.14–9.17 出勤，重点核对这两周出勤率；9.18（周五）由各学管发出第一封出勤率报告（应到、实到、请假、缺勤、出勤率、异常说明）。
助教职责：到岗、登记出勤、维持纪律、协助课程，收集各自负责科目的资料。9.18–9.20 无晚自习。',
 '[]'::jsonb,
 '[{"date":"2026-09-14","r106":"讨论","r109":"静音","r110":"静音"},
   {"date":"2026-09-15","r106":"EAP 辅导，结束后转讨论","r109":"静音","r110":"静音"},
   {"date":"2026-09-16","r106":"艺术史 / 传媒","r109":"静音","r110":"讨论"},
   {"date":"2026-09-17","r106":null,"r109":"经济","r110":"静音（需要时作讨论）"}]'::jsonb,
 '9.14—9.20 晚自习安排(1).docx'),

('2026-09-21', '2026-09-25', '9.21–9.25 晚自习各老师工作安排',
 '本周考试：周三 统计、化学、传媒、EAP；周四 微积分、生物；周五 会计（艺术史、经济本周亦有测验）。
下下周任务：Biology Critical Research Essay – Draft｜Chemistry Group Project Infographic｜Geography Skills Test。',
 '周一至周四同步下下周（9.28–10.2）空闲时间给 Gris，周五/六统一发排课表。对表现较差的学生做好学习记录并及时反馈。本周 PPT、自制资料、Blackboard 资料整理并标注用途，上传 NFE 内部资料库并发科目辅导群；私下答疑内容整理后发群。本周不录出勤率。时间 18:00–20:30，每节 1 小时，奥大国际学院 1 楼；周五无晚自习。',
 '[{"teacher":"Tiffany","time":"周三","task":"化学考后收集学生反馈；晚上群内发生物考前要点并答疑"},
   {"teacher":"Tiffany","time":"下周五前","task":"提前跟进 Bio Essay Draft 和 Chem Infographic：在 Blackboard 整理题目要求、评分标准和截止时间并发群"},
   {"teacher":"Hanrui","time":"周二晚至周三","task":"群内统计考前答疑"},
   {"teacher":"Hanrui","time":"周三晚","task":"群内微积分考前答疑"},
   {"teacher":"Shelley","time":"本周内","task":"艺术史本周已上过课，整理资料上传学习系统，群内答疑"},
   {"teacher":"Shikai","time":"周四晚","task":"群内会计考前答疑和提醒"},
   {"teacher":"Clara","time":"周一至周二","task":"传媒周三考试，已做过考前辅导，以群内复习答疑为主，考前发要点提醒"},
   {"teacher":"Ryan","time":"周一至周二","task":"EAP 周三考试，已做过考前辅导，以群内复习答疑为主，考前发要点提醒"},
   {"teacher":"Ryan","time":"本周内","task":"语言基础较弱的学生由晚自习老师带背和考察"}]'::jsonb,
 '[{"date":"2026-09-21","r106":"18:00 统计 · Hanrui；19:15 生物 · Tiffany；20:00 起讨论","r109":"18:00–20:00 讨论","r110":"静音"},
   {"date":"2026-09-22","r106":"18:00 化学 · Tiffany；19:15 微积分 · Hanrui；20:00 起讨论","r109":"18:00–20:00 讨论","r110":"静音"},
   {"date":"2026-09-23","r106":"18:00 经济 · Shelley","r109":"18:00–19:00 讨论；Shikai 答疑（物理、会计、微积分）","r110":"静音"},
   {"date":"2026-09-24","r106":"18:00 会计 · Shikai；19:15 地理 · Clara；20:00 起讨论","r109":"18:00–20:00 讨论","r110":"静音"}]'::jsonb,
 '9.21–9.25 晚自习安排.pdf'),

('2026-09-28', '2026-10-02', '9.28–10.1 晚自习各老师工作安排',
 '下下周（10.5 那周）考试：会计 Processing Transactions Test（25%）｜EAP Source Evaluation and Comparison（20%）｜微积分 Common Test 2（9%）｜物理 Common Test 1｜生物 Practical Report。',
 '周一至周四同步 10.5–10.9 空闲时间给 Gris，周五统一发排课表。成绩回收：把上周各科 CT1 成绩和错题情况交学管，用于各科风险名单。对表现较差的学生做好学习记录并及时反馈。资料整理上传 NFE 内部资料库并发科目辅导群。出勤率本周四由 Hanrui 统一录入。时间 18:00–20:30，每节 1 小时，奥大国际学院 1 楼；10.2（周五）起无晚自习。',
 '[{"teacher":"Hanrui","time":"本周内","task":"把 CT1 讲评要点整理后发统计、微积分辅导群"},
   {"teacher":"Shelley","time":"本周内","task":"以群内跟进为主"},
   {"teacher":"Ryan","time":"本周","task":"本周晚自习不安排课"},
   {"teacher":"Ryan","time":"下周一 EAP 晚自习 1h","task":"EAP Source Evaluation and Comparison（20%，35 人全员）考前大课：讲重难点、考什么、评分标准和答题规范；若 EAP 排在下周一或周二考，改到本周四 19:15 上"},
   {"teacher":"Tiffany","time":"本周","task":"以群内跟进为主，群内发 report 通知，需要帮忙看的私发"},
   {"teacher":"Clara","time":"本周","task":"以群内跟进为主"}]'::jsonb,
 '[{"date":"2026-09-28","r106":"全程讨论","r109":"全程静音","r110":"全程静音"},
   {"date":"2026-09-29","r106":"19:10 艺术史 · Shelley","r109":"19:00 起转讨论","r110":"全程静音"},
   {"date":"2026-09-30","r106":"18:00 会计 · Shikai；19:00 起讨论","r109":"19:00 起转静音","r110":"全程静音"},
   {"date":"2026-10-01","r106":"18:00 微积分 · Hanrui；19:00 起答疑、录入出勤率","r109":"19:00 起转静音","r110":"全程静音"}]'::jsonb,
 '9.28-10.1 晚自习各老师工作安排(1).docx'),

('2026-10-05', '2026-10-09', '10.5–10.9 晚自习各老师工作安排',
 '本周（10.5–10.10）考试：会计 Processing Transactions Test（25%）、EAP Source Evaluation and Comparison（20%）、微积分 Common Test 2（9%）——上周已排；物理 Common Test 1（5.5%）——本周一排课；生物 Practical Report（5%）——本周二答疑。
下周（10.12 那周）考试：艺术史 Common Test W1（10%）——本周三排课；化学 Common Test 1（7.5%）——本周二排课；统计 Common Test 2（7.5%）——本周四排课；物理 Practical Investigation（10%）。',
 '学管本周：统计每位同学 9 月各科考试成绩和晚自习出勤率，整理成学术报告在家长群发送；周三前收齐 9 月考试成绩（CT1、Quiz、Skills Test 等），出勤率按晚自习记录核对；报告内容为各科考试成绩、晚自习出勤率、需重点关注的科目。
所有老师：周一至周四同步 10.12–10.16 空闲时间给 Gris，周末统一发排课表；把负责科目 9 月考试成绩和错题情况交学管；资料整理上传 NFE 内部资料库并发科目辅导群。时间 18:00–20:30，每节 1 小时；10.9（周五）无晚自习。',
 '[{"teacher":"Hanrui","time":"本周内","task":"微积分、统计 CT1 考后反馈和针对性辅导策略同步给 Gris"},
   {"teacher":"Shelley","time":"本周内","task":"以群内跟进为主"},
   {"teacher":"Ryan","time":"本周","task":"EAP Source Evaluation and Comparison（本周考，20%，35 人全员）以群内答疑为主，考前发要点提醒"},
   {"teacher":"Clara","time":"本周","task":"以群内跟进为主"}]'::jsonb,
 '[{"date":"2026-10-05","r106":"18:00 物理 · Shikai；19:00 起讨论（答疑）","r109":"19:00 起转静音","r110":"全程静音"},
   {"date":"2026-10-06","r106":"18:00 化学 · Tiffany；19:00 起讨论（答疑）","r109":"19:00 起转静音","r110":"全程静音"},
   {"date":"2026-10-07","r106":"19:10 艺术史 · Shelley；20:10 起讨论","r109":"19:10–20:10 讨论，其余静音","r110":"全程静音"},
   {"date":"2026-10-08","r106":"18:00 统计 · Hanrui；19:00 起讨论（答疑）","r109":"19:00 起转静音","r110":"全程静音"}]'::jsonb,
 '10.5-10.9 晚自习各老师工作安排.docx'),

('2026-10-12', '2026-10-16', '10.12–10.16 晚自习各老师工作安排',
 '本周考试：微积分 Common Test 2（原文写 10%）、艺术史 Common Test W1（10%）、化学 Common Test 1（7.5%）、统计 Common Test 2（7.5%）、物理 Practical Investigation（10%）——上周已排；传媒 Short Writing Test（周四课上）——本周二。
下周（10.19）考试：经济 Common Test 2（10%）——考试推迟；地理 Tourism Test（10%）——已排；生物 Group Project Infographic——下周。',
 '所有老师：周一至周四同步 10.19–10.23 空闲时间给 Gris，周五统一发排课表；对表现较差的学生做好学习记录并及时反馈；资料整理上传 NFE 内部资料库并发科目辅导群。
小组作业：化学视频、经济展示（11/2 交）的讲座顺延到下周，相关老师本周内整理好题目要求和评分标准。时间 18:00–20:30，每节 1–1.5 小时；10.16（周五）无晚自习。',
 '[{"teacher":"Shelley","time":"本周内","task":"本周不到场；群内做艺术史 Common Test W1 考前答疑"},
   {"teacher":"Hanrui","time":"本周","task":"本周不到场；群内做统计 Common Test 2（7.5%，28 人）考前答疑，考前发要点提醒"},
   {"teacher":"Shikai","time":"本周","task":"本周不到场；群内做物理 Practical Investigation（10%，15 人）报告答疑"},
   {"teacher":"Tiffany","time":"本周","task":"本周不到场；群内做化学 Common Test 1 考前答疑；提醒生物 Infographic（10/19 周一交，4 人），需要帮忙看的私发"}]'::jsonb,
 '[{"date":"2026-10-12","r106":"全程讨论","r109":"全程静音","r110":"全程静音"},
   {"date":"2026-10-13","r106":"18:00 传媒 · Clara；19:00 起逐个批改（Clara、Gris）","r109":"19:00 起转静音","r110":"全程静音"},
   {"date":"2026-10-14","r106":"18:00 地理 · Clara；19:00 起讨论","r109":"19:00 起转静音","r110":"全程静音"},
   {"date":"2026-10-15","r106":"18:00 EAP · Ryan；19:00 起讨论","r109":"19:00 起转静音","r110":"全程静音"}]'::jsonb,
 '10.12-10.16 晚自习各老师工作安排.docx')
on conflict (week_start) do update set
  week_end = excluded.week_end, title = excluded.title, exam_notes = excluded.exam_notes,
  general_tasks = excluded.general_tasks, teacher_tasks = excluded.teacher_tasks,
  room_plan = excluded.room_plan, source_file = excluded.source_file;

-- ───────── 每节课明细 ─────────
delete from public.night_study_sessions
 where week_id in (select id from public.night_study_weeks where week_start between '2026-09-07' and '2026-10-12');

with s(session_date, start_time, end_time, room, kind, subject, program_subject_id, milestone_id, teacher_name, assistants, topic, notes) as (values
  -- 9.7 周（原文无具体时间与教室）
  ('2026-09-07'::date, null::time, null::time, null, 'admin', null, null::int, null::int, '学管', null,
     '账号登录确认、查看各科 outline、提交选课确认 / 课表 / 学业节点表', '登不上账号当场报学管'),
  ('2026-09-08', null, null, null, 'intro', 'EAP (English for Academic Purposes)', 57, null, 'Ryan', null, 'EAP 课程导论（intro）', '1–1.5 小时；其余时间自习'),
  ('2026-09-09', null, null, null, 'intro', 'Calculus', 55, null, 'Hanrui', null, '微积分课程导论（intro）', null),
  ('2026-09-09', null, null, null, 'intro', 'Physics', 61, null, 'Shikai', null, '物理课程导论（intro）', null),
  ('2026-09-10', null, null, null, 'intro', 'Statistics', 62, null, 'Hanrui', null, '统计课程导论（intro）', null),
  ('2026-09-10', null, null, null, 'intro', 'Accounting', 52, null, 'Shikai', null, '会计课程导论（intro）', null),
  -- 9.14 周
  ('2026-09-15', null, null, '106', 'exam_prep', 'EAP (English for Academic Purposes)', 57, 279, 'Ryan', 'Shikai',
     'Assessment 1: Source Evaluation（下周考试内容）', '1–1.5 小时；结束后 106 转讨论'),
  ('2026-09-16', null, null, '106', 'intro', 'Art History', 53, 266, 'Shelley', 'Shelley、Hanrui', '艺术史 intro + 下周考试内容', null),
  ('2026-09-16', null, null, '106', 'intro', 'Media Studies', 60, null, 'Gris', 'Shelley、Hanrui', '传媒 intro', null),
  ('2026-09-17', null, null, '109', 'intro', 'Economics', 58, 208, 'Shelley', 'Shikai', '经济 intro + Common Test 1 内容', '学管和助教登记这两周出勤率'),
  -- 9.21 周
  ('2026-09-21', '18:00', '19:00', '106', 'exam_prep', 'Statistics', 62, 262, 'Hanrui', null, '统计考前复习：梳理公式和题型，讲模考题', '周三考'),
  ('2026-09-21', '19:15', '20:15', '106', 'review', 'Biology', 54, 206, 'Tiffany', null, '生物第一轮系统复习：梳理考点和重难点，布置/解答练习题', '周四考'),
  ('2026-09-22', '18:00', '19:00', '106', 'exam_prep', 'Chemistry', 56, 292, 'Tiffany', null, '化学考前冲刺：高频考点、易错点和答题规范，过一遍模考题', '周三考'),
  ('2026-09-22', '19:15', '20:15', '106', 'review', 'Calculus', 55, 302, 'Hanrui', null, '微积分综合复习：重点题型，集中讲评薄弱环节', '周四考'),
  ('2026-09-23', '18:00', '19:00', '106', 'review', 'Economics', 58, 208, 'Shelley', null, '经济前三周内容复习', null),
  ('2026-09-23', '18:00', '19:00', '109', 'qa', null, null, null, 'Shikai', null, '答疑：物理、会计、微积分（重点为周四、周五要考的科目）', '答疑内容整理后发群'),
  ('2026-09-24', '18:00', '19:00', '106', 'exam_prep', 'Accounting', 52, 198, 'Shikai', null, '会计考前冲刺：讲核心题型', '周五考'),
  ('2026-09-24', '19:15', '20:15', '106', 'exam_prep', 'Geography', 59, 317, 'Clara', null, 'Geography Skills Test 准备：梳理考察的技能点（读图、数据分析等），针对性练习', '下下周考'),
  -- 9.28 周（定稿版）
  ('2026-09-29', '19:10', '20:10', '106', 'exam_prep', 'Art History', 53, 266, 'Shelley', null, 'Art History · Renaissance Quiz 1 (EP)：复习要点、评分标准、题型', null),
  ('2026-09-30', '18:00', '19:00', '106', 'exam_prep', 'Accounting', 52, 193, 'Shikai', null,
     '会计 Processing Transactions Test（25%）考前大课：重难点、考什么、核心题型', '期末前单项权重最大的考核'),
  ('2026-09-30', '19:00', '20:30', '106', 'qa', 'Physics', 61, 299, 'Shikai', null, '物理 Common Test 1 答疑', null),
  ('2026-10-01', '18:00', '19:00', '106', 'exam_prep', 'Calculus', 55, 293, 'Hanrui', null, '微积分 CT2（9%）考前上课', null),
  ('2026-10-01', '19:00', '20:30', '106', 'qa', 'Calculus', 55, 293, 'Hanrui', null, '答疑', '同时录入出勤率'),
  -- 10.5 周
  ('2026-10-05', '18:00', '19:00', '106', 'exam_prep', 'Physics', 61, 299, 'Shikai', null,
     '物理 Common Test 1（5.5%，15 人）考前重难点', '有时间则讲 Practical Investigation（10/12 那周，10%）报告要求'),
  ('2026-10-05', '19:00', '20:30', '106', 'qa', 'Accounting', 52, 193, 'Shikai', null, '答疑，重点为本周要考的会计、物理', null),
  ('2026-10-06', '18:00', '19:00', '106', 'exam_prep', 'Chemistry', 56, 283, 'Tiffany', null, '化学 CT1（7.5%，8 人）考前课', null),
  ('2026-10-06', '19:00', '20:30', '106', 'qa', 'Biology', 54, 210, 'Tiffany', null, '生物 Practical Report（本周交，5%，4 人）答疑', null),
  ('2026-10-07', '19:10', '20:10', '106', 'exam_prep', 'Art History', 53, 294, 'Shelley', null, '艺术史 Common Test W1（10%，11 人）考前课', '其余时间值班答疑'),
  ('2026-10-08', '18:00', '19:00', '106', 'exam_prep', 'Statistics', 62, 267, 'Hanrui', null, '统计 CT2（7.5%，28 人）考前大课：重难点、考什么', null),
  ('2026-10-08', '19:00', '20:30', '106', 'qa', 'Statistics', 62, 267, 'Hanrui', null, '值班答疑', null),
  -- 10.12 周
  ('2026-10-13', '18:00', '19:00', '106', 'workshop', 'Media Studies', 60, 214, 'Clara', null,
     'Visual Text（Poster）Short Response 怎么写：开头句、五个问题、结尾句，用样例讲常见问题', '短写作测试在周四课上'),
  ('2026-10-13', '19:00', '20:30', '106', 'workshop', 'Media Studies', 60, 214, 'Clara', 'Gris',
     '逐个批改同学写好的 Outline，当场反馈；改完的同学回去修改背诵', 'Clara、Gris 分头批改'),
  ('2026-10-14', '18:00', '19:00', '106', 'exam_prep', 'Geography', 59, 312, 'Clara', null, '地理 Tourism Test（下周二考，10%，6 人）考前课：重难点、考什么', '其余时间值班答疑'),
  ('2026-10-15', '18:00', '19:00', '106', 'workshop', 'EAP (English for Academic Purposes)', 57, 274, 'Ryan', null,
     'EAP Group Academic Poster Presentation（30%，35 人全员）：怎么做、评分标准', '其余时间值班答疑')
)
insert into public.night_study_sessions (week_id, session_date, start_time, end_time, room, kind, subject, program_subject_id, milestone_id, teacher_name, teacher_id, assistants, topic, notes)
select w.id, s.session_date, s.start_time, s.end_time, s.room, s.kind, s.subject, s.program_subject_id, s.milestone_id, s.teacher_name,
       (select p.id from public.profiles p where lower(p.full_name) = lower(s.teacher_name) and p.role <> 'student' limit 1),
       s.assistants, s.topic, s.notes
from s
join public.night_study_weeks w on s.session_date between w.week_start and w.week_end;

commit;
