ALTER TABLE program_subjects
ADD COLUMN default_schedule JSONB DEFAULT '[]'::jsonb;
