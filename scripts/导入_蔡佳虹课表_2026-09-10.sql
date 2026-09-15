-- 蔡佳虹 NFE-000068 选课 + 课表
-- 来源：手机翻拍课表（仅显示时段，无科目名）+ tooltip（周二09:00 = Statistics / Hee Jin C. / 109）
-- 方法：用已入库 34 人反推各科班次，求「哪 5 个班次的时段并集 = 观测到的 23 节」
--       6 组候选解 → tooltip 排除 4 组 → 剩 Art History / Calculus 二选一
--       判为 Calculus：①Physics 14 人中 13 人兼选 Calculus（Art History 仅 3 人）
--                      ②照片无 Art History 的灰紫色块，该块为绿色（= Calculus 配色）
-- ⚠ 第五门为推断结果，建议向学生本人确认一次
-- 选课 5 门 / 课表 23 节
begin;

-- ① 选课
with src(subj) as (values
  ('Calculus'),
  ('EAP (English for Academic Purposes)'),
  ('Media Studies'),
  ('Physics'),
  ('Statistics')
),
r as (select e.id eid, ps.id psid, ps.subject_category cat
      from src s
      join students_info si on si.nfe_no = 68
      join student_enrollments e on e.student_id=si.student_id and e.program_id=2 and e.status='active'
      join program_subjects ps on ps.program_id=2 and ps.subject_name=s.subj)
insert into student_subject_selections (enrollment_id, program_subject_id, selection_type, status, confirmed_at)
select r.eid, r.psid, r.cat, 'confirmed'::selection_status, now() from r
where not exists (select 1 from student_subject_selections x where x.enrollment_id=r.eid and x.program_subject_id=r.psid);

-- ② 课表（整表替换语义）
delete from school_timetable t using students_info si, student_enrollments e
where t.student_id=si.student_id and e.student_id=si.student_id and e.program_id=2 and e.status='active'
  and t.enrollment_id=e.id and si.nfe_no=68;

with src(dow, st, et, subj, room) as (values
  (2, '09:00'::time, '10:10'::time, 'Statistics', '109'),
  (3, '14:50'::time, '16:00'::time, 'Statistics', '109'),
  (4, '10:10'::time, '11:20'::time, 'Statistics', '109'),
  (5, '11:20'::time, '12:30'::time, 'Statistics', '109'),
  (5, '14:50'::time, '16:00'::time, 'Statistics', '109'),
  (1, '10:10'::time, '11:20'::time, 'Physics', null),
  (1, '16:00'::time, '17:10'::time, 'Physics', null),
  (2, '14:50'::time, '16:00'::time, 'Physics', null),
  (3, '13:40'::time, '14:50'::time, 'Physics', null),
  (5, '10:10'::time, '11:20'::time, 'Physics', null),
  (1, '13:40'::time, '14:50'::time, 'Media Studies', '304'),
  (2, '10:10'::time, '11:20'::time, 'Media Studies', '304'),
  (3, '11:20'::time, '12:30'::time, 'Media Studies', '304'),
  (4, '16:00'::time, '17:10'::time, 'Media Studies', '304'),
  (5, '12:30'::time, '13:40'::time, 'Media Studies', '304'),
  (1, '09:00'::time, '10:10'::time, 'Calculus', null),
  (1, '14:50'::time, '16:00'::time, 'Calculus', null),
  (2, '13:40'::time, '14:50'::time, 'Calculus', null),
  (4, '11:20'::time, '12:30'::time, 'Calculus', null),
  (5, '09:00'::time, '10:10'::time, 'Calculus', null),
  (1, '11:20'::time, '12:30'::time, 'EAP (English for Academic Purposes)', '303'),
  (2, '16:00'::time, '17:10'::time, 'EAP (English for Academic Purposes)', '303'),
  (4, '13:40'::time, '14:50'::time, 'EAP (English for Academic Purposes)', '303')
),
r as (select si.student_id, e.id eid, ps.id psid, s.dow, s.st, s.et, s.room,
             e.start_date, coalesce(e.end_date, e.start_date + interval '1 year')::date ed
      from src s
      join students_info si on si.nfe_no = 68
      join student_enrollments e on e.student_id=si.student_id and e.program_id=2 and e.status='active'
      join program_subjects ps on ps.program_id=2 and ps.subject_name=s.subj)
insert into school_timetable (student_id, enrollment_id, program_subject_id, day_of_week, start_time, end_time,
                              room, effective_from, effective_until, is_confirmed, confirmed_at)
select student_id, eid, psid, dow, st, et, room::varchar, start_date, ed, true, now() from r;

commit;