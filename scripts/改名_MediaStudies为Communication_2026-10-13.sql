-- 科目改名：Media Studies → Communication（用户要求：所有相关表述统一为 Communication，中文「传媒」也改）
-- 涉及：科目底表、晚自习课程/周计划、资料库。科目以 id 关联，选课/成绩/考核节点不受影响。幂等可重跑。
begin;
update public.program_subjects set subject_name = 'Communication' where subject_name = 'Media Studies';

update public.night_study_sessions set subject = 'Communication' where subject = 'Media Studies';
update public.night_study_sessions set topic = replace(topic, '传媒', 'Communication') where topic like '%传媒%';
update public.night_study_sessions set notes = replace(notes, '传媒', 'Communication') where notes like '%传媒%';
update public.night_study_weeks set exam_notes = replace(exam_notes, '传媒', 'Communication') where exam_notes like '%传媒%';
update public.night_study_weeks set general_tasks = replace(general_tasks, '传媒', 'Communication') where general_tasks like '%传媒%';
update public.night_study_weeks set teacher_tasks = replace(teacher_tasks::text, '传媒', 'Communication')::jsonb where teacher_tasks::text like '%传媒%';
update public.night_study_weeks set room_plan = replace(room_plan::text, '传媒', 'Communication')::jsonb where room_plan::text like '%传媒%';

update public.resources set subject = 'Communication' where subject = 'Media Studies';
update public.resources set title = replace(title, '传媒', 'Communication') where title like '%传媒%';
update public.resources set description = replace(description, '传媒', 'Communication') where description like '%传媒%';
commit;
