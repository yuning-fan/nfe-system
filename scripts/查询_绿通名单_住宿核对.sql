select distinct
  p.full_name    as name,
  s.gender       as gender,
  s.date_of_birth as dob,
  s.campus       as campus
from public.students_info s
join public.profiles p            on p.id = s.student_id
join public.student_enrollments e on e.student_id = s.student_id
                                 and e.source = 'green_channel'
order by gender, name;
