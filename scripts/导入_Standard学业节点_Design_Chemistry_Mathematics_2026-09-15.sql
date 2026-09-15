-- Standard（program_id=1）学业节点：Design / Chemistry / Mathematics，涉及陈祺、陈亦凡（Feb 2026 批次）
-- 来源：UoA CFS Feb Standard Design / Feb Standard Chemistry / Jan Standard Calculus outline 2026
-- 口径：
--   · 现有节点全部挂有成绩，grade_records.milestone_id 为 ON DELETE CASCADE → 只原地 UPDATE，不删不重建，不改标题
--   · Calculus outline = Mathematics 后半段（CT3 6/CT4 9/Group Project 10/FLA 5/Final 50 与库中完全一致），补到 Mathematics 现有节点
--   · Mathematics 沿用库中已有的 Calculus 自身学期编号；Design/Chemistry 用各自 outline 的 Term 1–4 编号
--   · Biology 为 July 批次 outline，与陈祺批次不符，本次不导
--   · 新增节点按 (program_subject_id, title) 去重，可重跑
begin;

-- ══ Design（psid=5）══
update academic_milestones set due_date='2026-02-23', term_no=1, week_no=4, mode='non_secure',
  note='outline: 4 Week Introduction 5%（Term 1 Week 1–4），日期取第4周周一' where id=49;
update academic_milestones set weight_percent=5, due_date='2026-03-23', term_no=1, week_no=8, mode='non_secure',
  note='outline: Typography 5%；schedule T1W8 Typography Assignment 1 Due；原权重 0 按 outline 改为 5' where id=50;
update academic_milestones set weight_percent=10, due_date='2026-05-11', term_no=2, week_no=3, mode='non_secure',
  note='outline: Logo 10%；schedule T2W3 Logo Assignment 2 Due；原权重 0 按 outline 改为 10' where id=51;

insert into academic_milestones (program_subject_id, title, milestone_type, due_date, weight_percent, term_no, week_no, mode, is_major, note)
select 5, v.title, v.t::milestone_type, v.due::date, v.w, v.term, v.wk, v.md, v.major, v.note
from (values
  ('Image Making (Zine Design)', 'assignment', '2026-06-22', 10, 2, 9, 'non_secure', false, 'schedule T2W9 Image Making Assignment Due'),
  ('UI-UX Design (App)',         'assignment', '2026-08-10', 10, 3, 4, 'non_secure', false, 'schedule T3W4 UI-UX Assignment 4 Due'),
  ('Group Research (Design Research)', 'assignment', '2026-09-07', 10, 3, 8, 'non_secure', false, 'schedule T3W8 Group Research Assignment 5 Due'),
  ('Individual Project',         'assignment', '2026-11-23', 50, 4, 8, 'non_secure', true,  'External；Individual Project Due Monday 23 November')
) as v(title, t, due, w, term, wk, md, major, note)
where not exists (select 1 from academic_milestones m where m.program_subject_id=5 and m.title=v.title);

-- ══ Chemistry（psid=10）══
update academic_milestones set due_date='2026-02-16', term_no=1, week_no=3, mode='secure',
  note='schedule T1W3 Common Test 1 (part I)；outline 只给 Common Tests(1-4) 合计 20%，子项权重沿用库中拆分' where id=45;
update academic_milestones set due_date='2026-03-09', term_no=1, week_no=6, mode='secure',
  note='schedule T1W6 Common Test 1 (part II)' where id=46;
update academic_milestones set due_date='2026-05-04', term_no=2, week_no=2, mode='secure',
  note='schedule T2W2 Common Test 2' where id=47;
update academic_milestones set due_date='2026-03-23', term_no=1, week_no=8, mode='non_secure',
  note='outline: Group Project 5%，Term 1 Week 8' where id=48;
update academic_milestones set due_date='2026-06-22', term_no=2, week_no=9, mode='secure',
  note='schedule T2W9 Common Test 3；原库日期 2026-08-03，2026-09-15 按 outline 改' where id=57;
update academic_milestones set due_date='2026-06-01', term_no=2, week_no=6, mode='non_secure',
  note='outline: Practical Tests (1,2) 合计 10%、Non-secure；Practical Test I 在 Term 2 Week 6–7；原 mode=secure 按 outline 改' where id=59;

insert into academic_milestones (program_subject_id, title, milestone_type, due_date, weight_percent, term_no, week_no, mode, is_major, note)
select 10, v.title, v.t::milestone_type, v.due::date, v.w, v.term::smallint, v.wk::smallint, v.md, v.major, v.note
from (values
  ('Practical Test 2',          'exam',       '2026-08-17', 5,  '3', '5', 'non_secure', false, 'Term 3 Week 5–6'),
  ('Group Oral Presentation',   'assignment', '2026-09-07', 5,  '3', '8', 'non_secure', false, 'Term 3 Week 8–9'),
  ('Common Test 4',             'exam',       '2026-10-12', 5,  '4', '2', 'secure',     false, 'schedule T4W2；outline 只给 Common Tests(1-4) 合计 20%，按库中 CT1(2+3)/CT2 5/CT3 5 推为 5，需确认'),
  ('Independent Learning',      'assignment', '2026-02-02', 10, null, null, 'non_secure', false, 'All four terms；Education Perfect：Term 1&2 5% + Term 3&4 5%；日期占位'),
  ('2 Hour Final Examination',  'exam',       '2026-11-24', 50, '4', '8', 'secure',     true,  'Final Examinations Tue 24 Nov – Wed 2 Dec，日期取首日')
) as v(title, t, due, w, term, wk, md, major, note)
where not exists (select 1 from academic_milestones m where m.program_subject_id=10 and m.title=v.title);

-- ══ Mathematics（psid=7）后半段，来源 Jan Standard Calculus outline ══
update academic_milestones set due_date='2026-08-10', term_no=1,
  note='来源 Calculus outline：CT3 Topic 6 Applications of Differentiation，Calculus 第1学期第4周' where id=52;
update academic_milestones set due_date='2026-09-14', term_no=1,
  note='来源 Calculus outline：CT4 Topics 7 & 8，Calculus 第1学期第9周' where id=53;
update academic_milestones set due_date='2026-10-26',
  note='来源 Calculus outline：原文 Term 2 Week 2–4（每周 3 节），日期取第4周周一占位' where id=54;
update academic_milestones set due_date='2026-07-20',
  note='来源 Calculus outline：Throughout the course（EP & PlayPosit 每周），日期占位' where id=55;
update academic_milestones set due_date='2026-11-24',
  note='来源 Calculus outline：Week 8–9；Final Examinations Tue 24 Nov – Wed 2 Dec，日期取首日' where id=56;

commit;
