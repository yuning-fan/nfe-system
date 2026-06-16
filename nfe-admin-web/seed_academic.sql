INSERT INTO program_types (id, name, description) VALUES (1, '奥大预科', '奥克兰大学预科项目') ON CONFLICT (id) DO NOTHING;

INSERT INTO programs (id, program_type_id, name, track, duration_months, is_active) 
VALUES (1, 1, '标准预科-Standard', 'standard', 8, true) ON CONFLICT (id) DO NOTHING;

INSERT INTO program_subjects (id, program_id, subject_name, subject_category, subject_area, difficulty_level, hours_per_week, sessions_per_week)
VALUES 
(1, 1, 'EAP (English for Academic Purposes)', 'core', 'english', 'standard', 4, 2),
(2, 1, 'Calculus', 'elective', 'science', 'standard', 4, 2),
(3, 1, 'Physics', 'elective', 'science', 'standard', 4, 2),
(4, 1, 'Accounting', 'elective', 'commerce', 'standard', 4, 2),
(5, 1, 'Design', 'elective', 'arts', 'standard', 4, 2)
ON CONFLICT (id) DO NOTHING;
