-- 导入：UoA 2027 Entry Requirements for the Certificate of Foundation Studies (UP Education)
-- 来源：2027+UoA+Cert+in+Foundation+Studies+(Up+Educ).md（文件注明 correct as of June 2026）
-- 幂等：按 (entry_year, code) upsert。
-- 附带：把 students_info.target_degree 能明确对应的学生挂到 target_programme_id（只补空，不覆盖人工指定）。

with src(code, faculty, programme, entry_type, gpa_min, eap_min, english_requirement, english_alternative,
         intakes, intake_note, selection_required, required_subjects, required_subjects_mode, additional_requirements, duration_years, notes) as (values
  -- Arts and Education
  ('BA', 'Arts and Education', 'Bachelor of Arts (BA)', 'direct', 2.4, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar,Jul}', null, false, '{}', null, null, '3', null),
  ('BC', 'Arts and Education', 'Bachelor of Communication (BC)', 'direct', 2.5, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar,Jul}', null, false, '{}', null, null, '3', null),
  ('BDanceSt', 'Arts and Education', 'Bachelor of Dance Studies (BDanceSt)', 'direct', 2.4, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar,Jul}', null, true, '{}', null,
     'By selection only. Subject to the qualitative evaluation of an audition/interview which may contain one or more recorded/live elements.', '3', null),
  ('BECSt', 'Arts and Education', 'Bachelor of Early Childhood Studies (BECSt)', 'direct', 2.4, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar,Jul}', null, false, '{}', null, null, '3', null),
  ('BEdTchg', 'Arts and Education', 'Bachelor of Education (Teaching) (BEd(Tchg))', 'direct', 2.4, null, 'IELTS 7.0 overall, no band below 7.0', null, '{Mar,Jul}', 'Jul intake subject to availability', true, '{}', null,
     'By selection only. Subject to a satisfactory interview, police check, safety checks and referees'' reports. Also required to sit literacy and numeracy assessment.', '3', '英语要求为 IELTS，不是 EAP 分数'),
  ('BEdTESOL', 'Arts and Education', 'Bachelor of Education (Teaching English to Speakers of Other Languages) (BEd TESOL)', 'direct', 2.4, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar,Jul}', null, true, '{}', null,
     'By selection only. Subject to a satisfactory interview, police checks, safety checks and referees'' reports.', '3', null),
  ('BFA', 'Arts and Education', 'Bachelor of Fine Arts (BFA)', 'direct', 2.4, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar,Jul}', null, false, '{}', null, null, '3', null),
  ('BGlobalSt', 'Arts and Education', 'Bachelor of Global Studies (BGlobalSt)', 'direct', 3.0, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar}', null, false, '{}', null, null, '3', null),
  ('BMusPerf', 'Arts and Education', 'Bachelor of Music (BMus) – Performance, Jazz', 'direct', 2.4, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar}', null, true, '{}', null,
     'By selection only. Subject to the qualitative evaluation of an audition/composition portfolio (details on the University website).', '3', null),
  ('BMus', 'Arts and Education', 'Bachelor of Music (BMus) – Music Education, Musicology, Composition, Songcraft and Music Production', 'direct', 2.4, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar,Jul}', null, false, '{}', null, null, '3', null),
  ('BSportHPE', 'Arts and Education', 'Bachelor of Sport, Health & Physical Education (BSportHPE)', 'direct', 2.4, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar,Jul}', null, false, '{}', null, null, '3', null),
  -- Business and Economics
  ('BCom', 'Business and Economics', 'Bachelor of Commerce (BCom)', 'direct', 3.5, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar,Jul}', null, false, '{}', null, null, '3', null),
  ('BProp', 'Business and Economics', 'Bachelor of Property (BProp)', 'direct', 3.5, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar,Jul}', null, false, '{}', null, null, '3', null),
  -- Engineering and Design
  ('BAS', 'Engineering and Design', 'Bachelor of Architectural Studies (BAS)', 'direct', 4.7, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar}', null, true, '{}', null,
     'By selection only. Subject to the qualitative evaluation of a portfolio of creative work and written statement.', '3', null),
  ('BDes', 'Engineering and Design', 'Bachelor of Design (BDes)', 'direct', 3.0, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar}', null, false, '{}', null, null, '3', null),
  ('BEHons', 'Engineering and Design', 'Bachelor of Engineering (Honours) (BE (Hons))', 'direct', 5.0, 70, '70% (B grade) in English (EAP)', '50% EAP + IELTS 6.5（单项不低于 6.0）', '{Mar,Jul}', 'Jul intake subject to availability', false, '{Calculus,Physics}', 'all',
     'Calculus and Physics.', '4', null),
  ('BUrbPlanHons', 'Engineering and Design', 'Bachelor of Urban Planning (Honours) (BUrbPlan (Hons))', 'direct', 3.0, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar}', null, false, '{}', null, null, '4', null),
  -- Law
  ('LLB1', 'Law', 'Bachelor of Laws Part I (LLB (Part I))', 'via_other_degree', null, null, 'Must meet minimum English requirements for other Bachelor''s Degree.', null, '{Mar,Jul}', null, false, '{}', null,
     'Students must be offered a place in another Bachelor''s Degree either as a concurrent degree or a conjoint degree; entry based on that degree''s requirements. Selected into Part II on the basis of Part I results.', '4', 'GPA/英语按所搭配的另一学位要求'),
  -- Medical and Health Sciences
  ('BBiomedSc', 'Medical and Health Sciences', 'Bachelor of Biomedical Science', 'direct', 4.0, 70, '70% (B grade) in English (EAP)', '50% EAP + IELTS 6.5（单项不低于 6.0）', '{Mar}', null, false, '{Biology,Chemistry,Physics}', 'any_one',
     'One of Biology, Chemistry or Physics.', '3', null),
  ('BHSc', 'Medical and Health Sciences', 'Bachelor of Health Sciences (BHSc)', 'direct', 4.0, 70, '70% (B grade) in English (EAP)', '50% EAP + IELTS 6.5（单项不低于 6.0）', '{Mar}', null, false, '{Biology,Chemistry,Physics}', 'any_one',
     'One of Biology, Chemistry or Physics.', '3', null),
  ('MBChB', 'Medical and Health Sciences', 'Bachelor of Medicine and Bachelor of Surgery (MBChB)', 'no_direct', null, null, null, null, '{Mar}', null, true, '{}', null,
     'No direct entry for the foundation programme. Selected on the basis of first year results in BBiomedSc, BSc (Cell and Molecular Bioscience, Exercise Sciences, Medicinal Chemistry, Nutrition, Pharmacology and Physiology) or BHSc, UCAT score and an interview, for entry in 2028.', '6',
     '1 年 Biomed/BSc(健康方向)/BHSc + 录取后 5 年 MBChB'),
  ('BNurs', 'Medical and Health Sciences', 'Bachelor of Nursing (BNurs)', 'direct', 4.0, 70, '70% (B grade) in English (EAP)', '50% EAP + IELTS 6.5（单项不低于 6.0）', '{Mar}', null, true, '{Biology,Chemistry,Physics}', 'any_one',
     'One of Biology, Chemistry or Physics. Limited numbers of places available. Selection by interview.', '3', null),
  ('BOptom', 'Medical and Health Sciences', 'Bachelor of Optometry (BOptom)', 'no_direct', null, null, null, null, '{Mar}', null, true, '{}', null,
     'No direct entry for the foundation programme. Selected on the basis of first year results in BBiomedSc, BSc (Cell and Molecular Bioscience, Exercise Sciences, Medicinal Chemistry, Nutrition, Pharmacology and Physiology) or BHSc, and an interview, for entry in 2028.', '5',
     '1 年 Biomed/BSc(健康方向)/BHSc + 录取后 4 年 BOptom'),
  ('BPharm', 'Medical and Health Sciences', 'Bachelor of Pharmacy (BPharm)', 'no_direct', null, null, null, null, '{Mar}', null, true, '{}', null,
     'No direct entry for the foundation programme. Selected on the basis of first year results in BBiomedSc, BSc (Cell and Molecular Bioscience, Exercise Sciences, Medicinal Chemistry, Nutrition, Pharmacology and Physiology) or BHSc, and an interview, for entry in 2028.', '4',
     '1 年 Biomed/BSc(健康方向)/BHSc + 录取后 3 年 BPharm'),
  ('BMedImagHons', 'Medical and Health Sciences', 'Bachelor of Medical Imaging (Hons) (BMedImagH)', 'no_direct', null, null, null, null, '{Mar}', null, true, '{}', null,
     'No direct entry for the foundation programme. Selected on the basis of first year results in BBiomedSc, BSc (Cell and Molecular Bioscience, Exercise Sciences, Medicinal Chemistry, Nutrition, Pharmacology and Physiology) or BHSc, and an interview, for entry in 2028.', '4',
     '1 年 Biomed/BSc(健康方向)/BHSc + 录取后 3 年 BMedImag(Hons)'),
  ('BPsych', 'Medical and Health Sciences', 'Bachelor of Psychology (BPsych)', 'direct', 3.0, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar,Jul}', null, false,
     '{Biology,Calculus,Chemistry,Geography,Modelling,Physics,Statistics}', 'any_one', 'One science subject.', '3', '原表排在 Medical and Health Sciences 续表中'),
  -- Science
  ('BScHealth', 'Science', 'Bachelor of Science (BSc) – Cell and Molecular Bioscience, Exercise Sciences, Medicinal Chemistry, Nutrition, Pharmacology and Physiology', 'direct', 4.0, 70, '70% (B grade) in English (EAP)', '50% EAP + IELTS 6.5（单项不低于 6.0）', '{Mar,Jul}', null, false,
     '{Biology,Calculus,Chemistry,Geography,Modelling,Physics,Statistics}', 'any_one', 'One science subject.', '3', null),
  ('BSc', 'Science', 'Bachelor of Science (BSc) – other majors', 'direct', 3.0, 65, '65% (B- grade) in English (EAP)', '50% EAP + IELTS 6.0（单项不低于 5.5）', '{Mar,Jul}', null, false,
     '{Biology,Calculus,Chemistry,Geography,Modelling,Physics,Statistics}', 'any_one', 'One science subject.', '3', null),
  -- Conjoint
  ('ConjointStd', 'Conjoint Degree Programmes', 'Conjoint Degrees (without Engineering or Health Pathways)', 'direct', 3.9, null, 'Must meet minimum English requirements for both degrees.', null, '{}', 'Dependent on faculty', false, '{}', null,
     'See the additional requirements listed for both degree programmes.', '4+', 'EAP 取两个学位中较高者'),
  ('ConjointHealth', 'Conjoint Degree Programmes', 'Conjoint Degrees (with Health Pathways)', 'direct', 4.5, null, 'Must meet minimum English requirements for both degrees.', null, '{}', 'Dependent on faculty', false, '{}', null,
     'See the additional requirements listed for both degree programmes.', '5+', 'Health Pathways = BBiomedSc / BHSc / BSc(Cell and Molecular Bioscience, Exercise Sciences, Medicinal Chemistry, Nutrition, Pharmacology and Physiology)'),
  ('ConjointEng', 'Conjoint Degree Programmes', 'Conjoint Degrees (with Engineering)', 'direct', 6.0, null, 'Must meet minimum English requirements for both degrees.', null, '{}', 'Dependent on faculty', false, '{}', null,
     'See the additional requirements listed for both degree programmes.', '5+', null)
)
insert into public.uoa_programmes (entry_year, code, faculty, programme, entry_type, gpa_min, eap_min, english_requirement, english_alternative,
  intakes, intake_note, selection_required, required_subjects, required_subjects_mode, additional_requirements, duration_years, notes, source)
select 2027, code, faculty, programme, entry_type, gpa_min::numeric, eap_min::numeric, english_requirement, english_alternative,
  intakes::text[], intake_note, selection_required, required_subjects::text[], required_subjects_mode, additional_requirements, duration_years, notes,
  'UoA 2027 Entry Requirements for the Certificate of Foundation Studies (UP Education), correct as of June 2026'
from src
on conflict (entry_year, code) do update set
  faculty = excluded.faculty, programme = excluded.programme, entry_type = excluded.entry_type,
  gpa_min = excluded.gpa_min, eap_min = excluded.eap_min, english_requirement = excluded.english_requirement,
  english_alternative = excluded.english_alternative, intakes = excluded.intakes, intake_note = excluded.intake_note,
  selection_required = excluded.selection_required, required_subjects = excluded.required_subjects,
  required_subjects_mode = excluded.required_subjects_mode, additional_requirements = excluded.additional_requirements,
  duration_years = excluded.duration_years, notes = excluded.notes, source = excluded.source;

-- 学生目标专业 → 专业要求（只挂能明确判定的；只补空）
with m(target_degree, code) as (values
  ('Bachelor of Engineering (Honours)-Engineering Part I', 'BEHons'),
  ('Bachelor of Engineering (Honours)-Engineering Part I-Civil Engineering', 'BEHons'),
  ('Bachelor of Science:Data Science', 'BSc'),
  ('Bachelor of Science-Computer Science', 'BSc'),
  ('Bachelor of Science-Statistics', 'BSc'),
  ('Bachelor of Science:Information and Technology Management', 'BSc'),
  ('Bachelor of Science-Geography', 'BSc'),
  ('Bachelor of Science:Psychology', 'BSc'),
  ('Bachelor of Commerce: Accounting', 'BCom'),
  ('Bachelor of Commerce: Marketing & Business Analytics', 'BCom'),
  ('Bachelor of Commerce-Economics', 'BCom'),
  ('Bachelor of Commerce:Business Analytics', 'BCom'),
  ('Bachelor of Commerce: Operations and Supply Chain Management', 'BCom'),
  ('Bachelor of Commerce: Business Analytics & Supply Chain Management', 'BCom'),
  ('Bachelor of Commerce:Marketing', 'BCom'),
  ('Bachelor of Music:Songcraft and Music Production', 'BMus'),
  ('音乐制作', 'BMus'),
  ('Bachelor of Sport, Health & Physical Education -Sport, Health & PE', 'BSportHPE'),
  ('Bachelor of Design/Bachelor of Science Conjoint - Computer science', 'ConjointStd'),
  ('Bachelor of Design/ Bachelor of Science Conjoint - Computer science', 'ConjointStd'),
  ('Bachelor of Arts: TESOL & English', 'BA'),
  ('Bachelor of Health Sciences-Community Health', 'BHSc'),
  ('Bachelor of Architectural Studies-Architecture', 'BAS'),
  ('Bachelor of Nursing', 'BNurs'),
  ('Bachelor of Design', 'BDes')
)
update public.students_info si
   set target_programme_id = p.id
  from m join public.uoa_programmes p on p.code = m.code and p.entry_year = 2027
 where si.target_degree = m.target_degree
   and si.target_programme_id is null;
