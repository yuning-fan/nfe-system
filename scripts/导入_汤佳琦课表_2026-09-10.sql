-- 汤佳琦 NFE-000044 选课 + 课表（豆包表格转录）
-- 截图科目名 Communication → 系统科目 Media Studies（B 班：一09:00/一14:50/三12:30/四11:20/五09:00，教室304）
-- 选课 5 门 / 课表 23 节；含教室
begin;

-- ① 选课
with src(subj) as (values
  ('Accounting'),
  ('EAP (English for Academic Purposes)'),
  ('Economics'),
  ('Media Studies'),
  ('Statistics')
),
r as (select e.id eid, ps.id psid, ps.subject_category cat
      from src s
      join students_info si on si.nfe_no = 44
      join student_enrollments e on e.student_id=si.student_id and e.program_id=2 and e.status='active'
      join program_subjects ps on ps.program_id=2 and ps.subject_name=s.subj)
insert into student_subject_selections (enrollment_id, program_subject_id, selection_type, status, confirmed_at)
select r.eid, r.psid, r.cat, 'confirmed'::selection_status, now() from r
where not exists (select 1 from student_subject_selections x where x.enrollment_id=r.eid and x.program_subject_id=r.psid);

-- ② 课表（整表替换语义）
delete from school_timetable t using students_info si, student_enrollments e
where t.student_id=si.student_id and e.student_id=si.student_id and e.program_id=2 and e.status='active'
  and t.enrollment_id=e.id and si.nfe_no=44;

with src(dow, st, et, subj, room) as (values
  (1, '09:00'::time, '10:10'::time, 'Media Studies', '304'),
  (1, '10:10'::time, '11:20'::time, 'Statistics', '109'),
  (1, '11:20'::time, '12:30'::time, 'EAP (English for Academic Purposes)', '303'),
  (1, '13:40'::time, '14:50'::time, 'Economics', '503'),
  (1, '14:50'::time, '16:00'::time, 'Media Studies', '304'),
  (1, '16:00'::time, '17:10'::time, 'Statistics', '109'),
  (2, '09:00'::time, '10:10'::time, 'Accounting', '303'),
  (2, '10:10'::time, '11:20'::time, 'Economics', '503'),
  (2, '14:50'::time, '16:00'::time, 'Statistics', '109'),
  (2, '16:00'::time, '17:10'::time, 'EAP (English for Academic Purposes)', '303'),
  (3, '11:20'::time, '12:30'::time, 'Economics', '503'),
  (3, '12:30'::time, '13:40'::time, 'Media Studies', '304'),
  (3, '13:40'::time, '14:50'::time, 'Statistics', '109'),
  (3, '14:50'::time, '16:00'::time, 'Accounting', '303'),
  (3, '16:00'::time, '17:10'::time, 'Economics', '503'),
  (4, '10:10'::time, '11:20'::time, 'Accounting', '303'),
  (4, '11:20'::time, '12:30'::time, 'Media Studies', '304'),
  (4, '13:40'::time, '14:50'::time, 'EAP (English for Academic Purposes)', '303'),
  (5, '09:00'::time, '10:10'::time, 'Media Studies', '304'),
  (5, '10:10'::time, '11:20'::time, 'Statistics', '109'),
  (5, '11:20'::time, '12:30'::time, 'Accounting', '303'),
  (5, '12:30'::time, '13:40'::time, 'Economics', '503'),
  (5, '14:50'::time, '16:00'::time, 'Accounting', '303')
),
r as (select si.student_id, e.id eid, ps.id psid, s.dow, s.st, s.et, s.room,
             e.start_date, coalesce(e.end_date, e.start_date + interval '1 year')::date ed
      from src s
      join students_info si on si.nfe_no = 44
      join student_enrollments e on e.student_id=si.student_id and e.program_id=2 and e.status='active'
      join program_subjects ps on ps.program_id=2 and ps.subject_name=s.subj)
insert into school_timetable (student_id, enrollment_id, program_subject_id, day_of_week, start_time, end_time,
                              room, effective_from, effective_until, is_confirmed, confirmed_at)
select student_id, eid, psid, dow, st, et, room, start_date, ed, true, now() from r;

commit;