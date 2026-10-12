-- 补录 陈几何（NFE-000063）周五 4 节课 —— 其余 19 节不动（非整表替换）
-- 依据：艺术史/EAP/传媒 取「周一~周四时段与他完全一致」的同班同学周五时段（10/10、6/6、11/11 一致）
--       会计 全校无同时段同学，按时段块推断：占「一10:10/一16:00/二14:50/三13:40」四格的物理、统计、经济
--       第五节均在周五 10:10；该格他空闲、不与其他课冲突。教室待确认，先留空。
begin;

with src(dow, st, et, subj, room) as (values
  (5, '09:00'::time, '10:10'::time, 'Art History',                        '413'),
  (5, '10:10'::time, '11:20'::time, 'Accounting',                         null),
  (5, '11:20'::time, '12:30'::time, 'EAP (English for Academic Purposes)', '304'),
  (5, '12:30'::time, '13:40'::time, 'Media Studies',                      '304')
),
r as (
  select si.student_id, e.id eid, ps.id psid, s.dow, s.st, s.et, s.room,
         e.start_date, coalesce(e.end_date, e.start_date + interval '1 year')::date ed
  from src s
  join students_info si on si.nfe_no = 63
  join student_enrollments e on e.student_id = si.student_id and e.program_id = 2 and e.status = 'active'
  join program_subjects ps on ps.program_id = 2 and ps.subject_name = s.subj
)
insert into school_timetable (student_id, enrollment_id, program_subject_id, day_of_week, start_time, end_time,
                              room, effective_from, effective_until, is_confirmed, confirmed_at)
select r.student_id, r.eid, r.psid, r.dow, r.st, r.et, r.room::varchar, r.start_date, r.ed, true, now()
from r
where not exists (
  select 1 from school_timetable t
  where t.student_id = r.student_id and t.enrollment_id = r.eid
    and t.program_subject_id = r.psid and t.day_of_week = r.dow and t.start_time = r.st
);

commit;
