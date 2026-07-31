-- 老生数据导入（2026-07-31）：students_info 基本信息
-- 策略：date_of_birth / gender / source_school 只补空（coalesce 保留库中已有值，
--       如葛书妍的「镇海中学蛟川书院」比表格的「镇海中学」更具体）；
--       city / market_source / advisor 是本次新增列，直接覆盖。
-- 不写 school_name（就读学校＝UP/奥大，属 enrollment 域）；不写开学/结束时间（本轮不碰 enrollment）。

with src(student_id, dob, gender, source_school, city, market_source, advisor) as (values
  ('0139ac21-d900-478e-8092-f7707a486155'::uuid, null::date,          'male',   '杭州学军中学',                                  '杭州', '名校转住宿',   'Tracy'),
  ('504e3ffe-984a-4b8e-a9c5-e25db2cce9e6'::uuid, '2004-11-19'::date,  'male',   'Clarkson secondary school',                     '杭州', '名校',         'Tracy'),
  ('19c3b3a3-7a1f-44fc-9351-ce6b56a313df'::uuid, '2008-01-16'::date,  'male',   '浙江省奉化中学',                                '宁波', '名校',         'Tracy'),
  ('942f8a10-3b4a-4e2d-a13c-d53eff03d514'::uuid, '2008-06-19'::date,  'male',   '杭州市源清中学',                                '杭州', '名校',         'Tracy'),
  ('edd8c78a-d0ed-46a3-91ac-94ac41b335ae'::uuid, '2008-01-29'::date,  'male',   '苏十中',                                        '苏州', '名校',         'Tracy'),
  ('1ac89c2a-9966-4851-a1ea-cfb5dc05c2b2'::uuid, '2008-05-01'::date,  'male',   '中山市三鑫学校',                                '杭州', '二代转名校',   '二代'),
  ('a0000000-0000-0000-0000-000000000025'::uuid, '2009-11-21'::date,  'female', '杭二中',                                        '杭州', '绿通转名校',   '陈希越'),
  ('a0000000-0000-0000-0000-000000000035'::uuid, '2008-05-28'::date,  'female', '镇海中学',                                      '宁波', '名校',         'Tracy'),
  ('3f2dafb4-0764-4358-8779-919bed1f426d'::uuid, '2006-08-31'::date,  'female', '杭州学军中学',                                  '杭州', '名校转住宿',   'Tracy'),
  ('56ab3886-94aa-41ac-85af-ae9486566ed6'::uuid, '2005-01-21'::date,  'male',   '杭州学军中学',                                  '杭州', '高端+住宿',    'Tracy'),
  ('b9e902c2-9515-4795-9cd8-cd8d914ceeda'::uuid, '2004-07-13'::date,  'male',   '宁波外国语/Meadowvale Secondary School高三',    '宁波', '高端+住宿',    'Tracy'),
  ('839e001c-b1df-4b69-a2eb-c8df114c6132'::uuid, '2007-06-28'::date,  'female', '宁波二中',                                      '宁波', '名校',         'Tracy'),
  ('106fb434-4cfd-46b9-9bc9-98547bb65ce3'::uuid, '2007-04-23'::date,  'female', '上海市市南中学',                                '上海', '二代转名校',   '二代')
)
insert into public.students_info as si (student_id, date_of_birth, gender, source_school, city, market_source, advisor)
select student_id, dob, gender, source_school, city, market_source, advisor from src
on conflict (student_id) do update set
  date_of_birth = coalesce(si.date_of_birth, excluded.date_of_birth),
  gender        = coalesce(si.gender,        excluded.gender),
  source_school = coalesce(si.source_school, excluded.source_school),
  city          = excluded.city,
  market_source = excluded.market_source,
  advisor       = excluded.advisor;
