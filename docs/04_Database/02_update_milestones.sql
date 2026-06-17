-- 添加 program_subject_id 支持奥大选修课的节点
ALTER TABLE academic_milestones
ADD COLUMN program_subject_id INT REFERENCES program_subjects(id) ON DELETE CASCADE;

-- 使 course_id 变为可为空（因为有可能是 program_subject_id）
ALTER TABLE academic_milestones
ALTER COLUMN course_id DROP NOT NULL;

-- 同样为了成绩记录表能够支持选修课的成绩
ALTER TABLE grade_records
ADD COLUMN program_subject_id INT REFERENCES program_subjects(id) ON DELETE CASCADE;

ALTER TABLE grade_records
ALTER COLUMN course_id DROP NOT NULL;
