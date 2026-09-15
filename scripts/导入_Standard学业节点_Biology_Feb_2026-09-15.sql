-- Standard（program_id=1）Biology 学业节点 · 来源：UoA CFS Feb Standard Biology Course Outline 2026（陈祺，2026-02 批）
-- 口径：
--   · 旧节点挂有陈祺成绩（grade_records ON DELETE CASCADE）→ 只原地 UPDATE，不删不重建、不改标题
--   · 总览与课表周次冲突时以 Course Schedule 为准，原文写入备注
--   · outline 未写 Secure/Non-secure（只写 Written/Infographic/Video），mode 参照同课程 July Standard Biology outline
--   · 权重：Progress Quiz「1%*」与 Classwork「*10%」同一脚注 → 按含在 Classwork 内，Progress Quiz 计 0；Essay Draft「[10%]†」不单独计分 → 0
--   · 本脚本只含已确定项；「0 Progress Report Data」「Assignment 1 Submission」的对应关系、Progress Quiz / Draft / Group Project 待用户确认后补
begin;

update academic_milestones set due_date='2026-04-06', term_no=1, week_no=10, mode='non_secure',
  note='outline: Practical Investigation & Report 5%；总览写 Term 1 Week 9，课表写 Week 10（6/4，Easter 周），以课表为准' where id=43;
update academic_milestones set due_date='2026-06-22', term_no=2, week_no=9, mode='secure',
  note='outline: Common Test 1 7.5%，Term 2 Week 9' where id=44;

insert into academic_milestones (program_subject_id, title, milestone_type, due_date, weight_percent, term_no, week_no, mode, is_major, note)
select 9, v.title, v.t::milestone_type, v.due::date, v.w, v.term::smallint, v.wk::smallint, v.md, v.major, v.note
from (values
  ('Group Presentation (Video)',       'assignment', '2026-08-17', 5,   '3', '5', 'non_secure', false, '总览写 Term 3 Week 6，课表写 Week 5（17/8），以课表为准'),
  ('Critical Research Essay – Final',  'report_due', '2026-09-14', 10,  '3', '9', 'non_secure', false, '总览写 Term 3 Week 10，课表写 Week 9（14/9，第3学期仅9周），以课表为准'),
  ('Common Test 2',                    'exam',       '2026-10-26', 7.5, '4', '4', 'secure',     false, 'Term 4 Week 4（26/10 为 Labour Day，按课表周）'),
  ('Classwork / Homework / FLA',       'assignment', '2026-02-02', 10,  null, null, 'non_secure', false, 'Weekly；日期占位；总览中 Progress Quiz「1%*」与本项「*10%」同一脚注，按含在本项内处理'),
  ('Final Exams',                      'exam',       '2026-11-24', 50,  '4', '8', 'secure',     true,  'Final Examinations Tue 24 Nov – Wed 2 Dec，日期取首日')
) as v(title, t, due, w, term, wk, md, major, note)
where not exists (select 1 from academic_milestones m where m.program_subject_id=9 and m.title=v.title);

update program_subjects set node_dates_intake='2026-02-02' where id=9 and node_dates_intake is null;

commit;

-- ── 第二段：用户确认对应关系后补齐（2026-09-15）──
--   「0 Progress Report Data」= Progress Quiz；「Assignment 1 Submission」= Critical Research Essay – Draft
begin;

update academic_milestones set milestone_type='exam', due_date='2026-02-16', term_no=1, week_no=3, mode='secure', weight_percent=0,
  note='= outline Progress Quiz「1%*」，与 Classwork「*10%」同一脚注，按含在 Classwork 内计 0；Term 1 Week 3（经用户确认对应）' where id=41;
update academic_milestones set milestone_type='report_due', due_date='2026-05-18', term_no=2, week_no=4, mode='non_secure', weight_percent=0,
  note='= outline [Critical Research Essay – Draft]†「[10%]†」，草稿不单独计分；Term 2 Week 4（经用户确认对应）' where id=42;

insert into academic_milestones (program_subject_id, title, milestone_type, due_date, weight_percent, term_no, week_no, mode, is_major, note)
select 9, 'Group Project (Infographic)', 'assignment'::milestone_type, '2026-06-08'::date, 5, 2::smallint, 7::smallint, 'non_secure', false,
       'outline: Group Project 5%，Infographic，Term 2 Week 7'
where not exists (select 1 from academic_milestones m where m.program_subject_id=9 and m.title='Group Project (Infographic)');

commit;
