-- ============================================================
-- 导入陈祺两份报告里系统尚缺的数据（2026-09-30）
--   来源：《成绩记录表--陈祺(1).docx》《陈祺学习进展汇报（8-9月）.docx》
--   学生：陈祺 106fb434-4cfd-46b9-9bc9-98547bb65ce3（nfe_no 16，预科-Standard）
--
-- 不导入的部分及原因：
--   · 成绩分数 —— 23 条已全部在库且逐项对得上（这份成绩表本身就是从系统导出的），不重录。
--   · 辅导投入 24 节 35 小时 —— 用户决定本轮不做（需先把科目对到课程目录并定课时池口径）。
--   · 《目标差距分析》表 —— 该表漏掉了 8、9 月出的分（EAP 只算了前三项 = 10.6%，
--     实算应为 22.45%），是过期数据。系统 computeSubject 按权重自动算，以系统为准，不导入。
--
-- 幂等：每段都有存在性判断；出勤率历史还额外受 trg_dedup_attendance_persuasion 保护。
-- ============================================================
begin;

-- 1) UP 学号（文档第二行 270758484）
update public.students_info
   set up_student_id = '270758484'
 where student_id = '106fb434-4cfd-46b9-9bc9-98547bb65ce3'
   and up_student_id is null;

-- 2) 当前官方出勤率 = 文档最后一条（2026-08-08 的 90.9%）
--    ⚠️ 用户已确认要写当前值。90.9 < 95 合约红线 → riskEngine 硬触发，风险等级会变红。
--    attendance_rate_updated_at 写 2026-08-08（该数据的采集日），而不是今天——
--    否则看档案的人会以为这是最新出勤率。
update public.students_info
   set school_attendance_rate = 90.9,
       attendance_rate_updated_at = '2026-08-08 18:00:00+12'
 where student_id = '106fb434-4cfd-46b9-9bc9-98547bb65ce3'
   and school_attendance_rate is null;

-- 3) 出勤率历史 5 条（rate + 措施 + 采集日）
--    created_by 留空：文档没写是谁记录的，不编造。
insert into public.attendance_persuasions (student_id, rate, note, created_at)
select '106fb434-4cfd-46b9-9bc9-98547bb65ce3', v.rate, v.note, v.ts
from (values
  (90.6, '由于 workshop 没参加，导致出勤率低，已经和学生说明问题严重性', timestamptz '2026-03-06 18:00:00+13'),
  (92.5, '学校已出具正式警告信，已在家长群说明情况',                       timestamptz '2026-03-16 18:00:00+13'),
  (93.5, '出勤率在提升中',                                                 timestamptz '2026-03-23 18:00:00+13'),
  (94.9, '稳步提升',                                                       timestamptz '2026-04-08 18:00:00+12'),
  (90.9, '较为稳定，已提醒学生提交医疗报告',                               timestamptz '2026-08-08 18:00:00+12')
) as v(rate, note, ts);

-- 4) 各评估项目的「措施」→ grade_records.note
--    只补空的；已有备注的（权重待确认 / 原始分）用「；」追加，不覆盖。
update public.grade_records g set note = v.note
from (values
  (36, '实验报告出现学术诚信问题，已严肃强调；本学期全程跟进微生物实验报告，协助完成提交（记录于 2026/5/11）'),
  (37, '主要障碍为英语读题，已加强词汇和题目理解训练（记录于 2026/8）'),
  (38, '询问原因，学生读不懂题，安排辅导课（记录于 2026/3/1）'),
  (39, '长期安排辅导课（记录于 2026/4/8）'),
  (40, '持续辅导（记录于 2026/6/4）'),
  (41, '小组合作表现较好（记录于 2026/6/4）'),
  (49, '实验操作表现亮眼（记录于 2026/8）'),
  (48, 'term2 考试成绩下滑严重，已重点关注，并安排后续辅导（记录于 2026/8）'),
  (42, '稳定（记录于 2026/6/1）'),
  (29, '询问原因，安排辅导课（记录于 2026/5/4）'),
  (30, '加长辅导时长，专项写作训练（记录于 2026/5/4）'),
  (31, '持续跟进（记录于 2026/5/15）'),
  (32, '较 CT1 有所提升（记录于 2026/8）'),
  (33, '写作结构意识改善，较 Explanation Writing 有进步（记录于 2026/9）'),
  (45, '表现良好，已安排辅导课（记录于 2026/3/10）'),
  (46, '题目难度偏高，有所下滑，加强独立做题训练（记录于 2026/6）'),
  (47, '平时作业表现优秀（记录于 2026/8）'),
  (53, '满分（记录于 2026/8）'),
  (50, '与平时作业落差明显，需强化独立应试能力（记录于 2026/8）')
) as v(gid, note)
where g.id = v.gid and (g.note is null or btrim(g.note) = '');

update public.grade_records g set note = g.note || '；' || v.note
from (values
  (43, '表现优秀（记录于 2026/5/1）'),
  (44, '持续稳定（记录于 2026/9）')
) as v(gid, note)
where g.id = v.gid and g.note is not null and position(v.note in g.note) = 0;

-- 5) 学校警告信 1 封（2026-03-16 出勤类，文档「学校已出具正式警告信」）
--    issuer_id 留空：文档没写录入人。occurred_on = 事件日；created_at = 本次录入时间（默认 now）。
insert into public.warning_letters (student_id, source, category, warning_level, evidence_content, status, occurred_on)
select '106fb434-4cfd-46b9-9bc9-98547bb65ce3', 'school', 'attendance', 1,
       '学校就出勤问题出具正式警告信（当时出勤率 92.5%）。已在家长群说明情况。来源：《成绩记录表--陈祺》出勤率记录 2026/3/16。',
       'issued', date '2026-03-16'
where not exists (
  select 1 from public.warning_letters
   where student_id = '106fb434-4cfd-46b9-9bc9-98547bb65ce3'
     and source = 'school' and occurred_on = date '2026-03-16');

-- 6) 学术诚信事件（Biology 实验报告 0 分）
--    status='archived' + deduction_points=0：这是历史补录，当时并未真的扣分，
--    而 riskEngine 只统计未存档的违规，所以不会影响今天的风险分。
insert into public.violation_logs (student_id, violation_type, reason, deduction_points, status, created_at)
select '106fb434-4cfd-46b9-9bc9-98547bb65ce3', '学术不端',
       'Biology 实验报告（Practical Investigation & Report）出现学术诚信问题，该项得 0 分，已严肃强调。'
       || '本学期全程跟进微生物实验报告并协助完成提交。历史补录，未追溯扣分。',
       0, 'archived', timestamptz '2026-05-11 18:00:00+12'
where not exists (
  select 1 from public.violation_logs
   where student_id = '106fb434-4cfd-46b9-9bc9-98547bb65ce3'
     and violation_type = '学术不端');

-- 7) 叙述性内容 → 学习跟进（study_follow_ups）
--    recorder_id = Gris（文档正文多处写明是 Gris 做的额外支持）。
--    这张表只有 created_at（录入时间），没有业务日期字段，所以不伪造时间：
--    created_at 用默认 now()，所属期间写在 content 里。
insert into public.study_follow_ups (student_id, recorder_id, category, subject, content, result, needs_followup)
select '106fb434-4cfd-46b9-9bc9-98547bb65ce3', '387eb85b-d3fb-4642-a783-955da649de89',
       v.category, v.subject, v.content, v.result, v.needs
from (values
  ('mini_tutoring', 'EAP',
   '【8–9月 额外个性化支持】EAP 写作专项辅导：EAP 最薄弱环节是写作，Explanation Writing 仅 47%，核心问题是文章结构混乱、paraphrase 能力不足。Gris 定制写作模板与范文，逐段批改 draft，每次课前提前发放材料让她预习。',
   'Summary Writing 进步到 58%，写作结构意识明显改善', false),
  ('mini_tutoring', 'EAP',
   '【8–9月 额外个性化支持】EAP 考试专项备考：针对「背了不敢用、自己写又没把握」的问题，Gris 提前研究其课程的考试材料与题型，制定针对性备考策略。',
   '学生考后自述：准备了一整天，都答出来了，回答得挺流利', false),
  ('mini_tutoring', 'Biology',
   '【8–9月 额外个性化支持】生物口头面试模拟备考：口头面试占总评 10%，加本学期累计评估共 30%，是关键考核节点。Gris 整理完整模拟面试题库，做一对一面试模拟训练，帮助梳理答题思路与表达逻辑。',
   '考后学生反馈发挥良好', false),
  ('mini_tutoring', 'Biology',
   '【8–9月 额外个性化支持】生物实验报告结构指导：实验报告是历史性难点（上学期实验报告 0 分）。本学期 Gris 与生物辅导老师全程跟进微生物实验报告，逐项解读英文报告模板、厘清十个章节的写作要求，初稿完成后跟进修改与格式处理。',
   '协助在截止日期前完成提交', false),
  ('mini_tutoring', '综合',
   '【8–9月 额外个性化支持】日常答疑与学习状态跟踪：每周主动询问学习进度与考试节点，提醒背单词、完成练习题；情绪低落或考前焦虑时给予疏导。例：8 月数学考试前夜出现明显焦虑，及时安抚并帮助稳定状态，顺利参加次日考试。',
   null, false),
  ('key_points', '综合',
   '【8–9月 阶段小结 · 进步】① 学习主动性提升，开始主动规划考试节点、主动要求配套练习题；② EAP 写作结构意识加强，Summary Writing 较 Explanation Writing 有进步；③ 设计持续稳定，Logo 78%、Typography 89%；④ 数学平时作业 FLA 91%、Flexible Learning 100%，在有辅导支持时完全能掌握知识点。',
   null, false),
  ('key_points', '综合',
   '【8–9月 阶段小结 · 仍需关注】① 考试与平时作业落差明显：数学 FLA 91% 但 CT3 仅 33%，化学 Practical 84% 但 CT3 仅 6%，说明知识点在独立应试时尚未真正内化，这是目前最核心的问题；② 化学 CT3 仅 6%，期末占 50%，按目前趋势过线压力极大；③ 生物 CT1 36%，叠加上学期实验报告 0 分，需重点追分；④ 出勤 8 月偏低，补上医疗报告后有所改善；⑤ 仍倾向先找模板或范例而非自己先尝试，对期末独立考试影响较大。',
   '后续安排：课堂重心从讲新知识转向独立做题训练、模拟真实考试环境；各科期末前安排针对性模拟考；每周向家长同步背诵打卡、练习题完成率与上课表现；请家长在家关注自学情况，我们定期提供任务清单。',
   true)
) as v(category, subject, content, result, needs)
where not exists (
  select 1 from public.study_follow_ups f
   where f.student_id = '106fb434-4cfd-46b9-9bc9-98547bb65ce3'
     and f.category = v.category
     and left(f.content, 30) = left(v.content, 30));

commit;
