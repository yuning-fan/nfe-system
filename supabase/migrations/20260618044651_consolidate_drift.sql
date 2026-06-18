create type "public"."enrollment_source" as enum ('green_channel', 'agent');

alter table "public"."schedules" alter column "status" drop default;

alter type "public"."program_track" rename to "program_track__old_version_to_be_dropped";

create type "public"."program_track" as enum ('accelerate', 'fast_track', 'standard', 'other', 'university');

alter type "public"."schedule_status" rename to "schedule_status__old_version_to_be_dropped";

create type "public"."schedule_status" as enum ('scheduled', 'completed', 'rescheduling', 'pending_approval');

alter table "public"."programs" alter column track type "public"."program_track" using track::text::"public"."program_track";

alter table "public"."schedules" alter column status type "public"."schedule_status" using status::text::"public"."schedule_status";

alter table "public"."schedules" alter column "status" set default 'scheduled'::public.schedule_status;

drop type "public"."program_track__old_version_to_be_dropped";

drop type "public"."schedule_status__old_version_to_be_dropped";

alter table "public"."academic_milestones" add column "program_subject_id" integer;

alter table "public"."dorms" add column "notes" text;

alter table "public"."grade_records" add column "program_subject_id" integer;

alter table "public"."program_subjects" add column "default_schedule" jsonb default '[]'::jsonb;

alter table "public"."student_enrollments" add column "source" public.enrollment_source;

alter table "public"."students_info" add column "arrival_date" date;

alter table "public"."students_info" add column "gender" character varying(10);

alter table "public"."academic_milestones" add constraint "academic_milestones_program_subject_id_fkey" FOREIGN KEY (program_subject_id) REFERENCES public.program_subjects(id) ON DELETE CASCADE not valid;

alter table "public"."academic_milestones" validate constraint "academic_milestones_program_subject_id_fkey";

alter table "public"."grade_records" add constraint "grade_records_program_subject_id_fkey" FOREIGN KEY (program_subject_id) REFERENCES public.program_subjects(id) ON DELETE CASCADE not valid;

alter table "public"."grade_records" validate constraint "grade_records_program_subject_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.fn_auto_create_students_info()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.role = 'student' THEN
    INSERT INTO students_info (student_id, risk_level, total_risk_score)
    VALUES (NEW.id, 'green', 100)
    ON CONFLICT (student_id) DO NOTHING;  -- 幂等，重复执行安全
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE TRIGGER trg_auto_create_students_info AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_auto_create_students_info();

-- 注：storage schema 的触发器由 Supabase 托管，已从此处移除，避免云端 "already exists" 冲突。


