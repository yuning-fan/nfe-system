-- 范文嘉 NFE-000042 选课 + 课表（截图转录，已与各科既有教学班时段交叉验证 23/23 吻合）
-- 选课 5 门 / 课表 23 节；教室截图未显示，留空
begin;

-- ① 选课
with src(subj) as (values
  ('Accounting'),
  ('Art History'),
  ('Calculus'),
  ('EAP (English for Academic Purposes)'),
  ('Statistics')
),
r as (select e.id eid, ps.id psid, ps.subject_category cat
      from src s
      join students_info si on si.nfe_no = 42
      join student_enrollments e on e.student_id=si.student_id and e.program_id=2 and e.status='active'
      join program_subjects ps on ps.program_id=2 and ps.subject_name=s.subj)
insert into student_subject_selections (enrollment_id, program_subject_id, selection_type, status, confirmed_at)
select r.eid, r.psid, r.cat, 'confirmed'::selection_status, now() from r
where not exists (select 1 from student_subject_selections x where x.enrollment_id=r.eid and x.program_subject_id=r.psid);

-- ② 课表（整表替换语义）
delete from school_timetable t using students_info si, student_enrollments e
where t.student_id=si.student_id and e.student_id=si.student_id and e.program_id=2 and e.status='active'
  and t.enrollment_id=e.id and si.nfe_no=42;

with src(dow, st, et, subj) as (values
  (1, '09:00'::time, '10:10'::time, 'Art History'),
  (1, '10:10'::time, '11:20'::time, 'Statistics'),
  (1, '11:20'::time, '12:30'::time, 'Calculus'),
  (1, '14:50'::time, '16:00'::time, 'Art History'),
  (1, '16:00'::time, '17:10'::time, 'Statistics'),
  (2, '09:00'::time, '10:10'::time, 'Accounting'),
  (2, '10:10'::time, '11:20'::time, 'EAP (English for Academic Purposes)'),
  (2, '13:40'::time, '14:50'::time, 'Art History'),
  (2, '14:50'::time, '16:00'::time, 'Statistics'),
  (2, '16:00'::time, '17:10'::time, 'Calculus'),
  (3, '13:40'::time, '14:50'::time, 'Statistics'),
  (3, '14:50'::time, '16:00'::time, 'Accounting'),
  (3, '16:00'::time, '17:10'::time, 'EAP (English for Academic Purposes)'),
  (4, '09:00'::time, '10:10'::time, 'Calculus'),
  (4, '10:10'::time, '11:20'::time, 'Accounting'),
  (4, '11:20'::time, '12:30'::time, 'Art History'),
  (4, '13:40'::time, '14:50'::time, 'Calculus'),
  (5, '09:00'::time, '10:10'::time, 'Art History'),
  (5, '10:10'::time, '11:20'::time, 'Statistics'),
  (5, '11:20'::time, '12:30'::time, 'Accounting'),
  (5, '12:30'::time, '13:40'::time, 'EAP (English for Academic Purposes)'),
  (5, '13:40'::time, '14:50'::time, 'Calculus'),
  (5, '14:50'::time, '16:00'::time, 'Accounting')
),
r as (select si.student_id, e.id eid, ps.id psid, s.dow, s.st, s.et,
             e.start_date, coalesce(e.end_date, e.start_date + interval '1 year')::date ed
      from src s
      join students_info si on si.nfe_no = 42
      join student_enrollments e on e.student_id=si.student_id and e.program_id=2 and e.status='active'
      join program_subjects ps on ps.program_id=2 and ps.subject_name=s.subj)
insert into school_timetable (student_id, enrollment_id, program_subject_id, day_of_week, start_time, end_time,
                              room, effective_from, effective_until, is_confirmed, confirmed_at)
select student_id, eid, psid, dow, st, et, null, start_date, ed, true, now() from r;

commit;