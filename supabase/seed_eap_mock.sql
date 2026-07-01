-- ============================================================
-- Mock 数据：给一个学生 + 他项目的 EAP，建全套考核节点 + 部分成绩
-- 用途：直观测试「考核节点 / 成绩录入 / 加权总评 / 学生档案成绩单」
-- 在 Supabase SQL 编辑器运行（service_role，绕过 RLS）。可重复运行（会先清旧 mock）。
-- 想换学生：改下面 v_student_name。
-- ============================================================
DO $$
DECLARE
  v_student_name text := '张铄';      -- ← 想换人改这里
  v_student uuid;
  v_ps int;
  v_ps_name text;
  m_summary int;
  m_report int;
BEGIN
  -- 1) 找学生
  SELECT id INTO v_student FROM public.profiles
   WHERE full_name = v_student_name AND role = 'student' LIMIT 1;

  -- 2) 找该生所报项目里的 EAP 科目
  IF v_student IS NOT NULL THEN
    SELECT ps.id, ps.subject_name INTO v_ps, v_ps_name
    FROM public.student_enrollments se
    JOIN public.program_subjects ps ON ps.program_id = se.program_id
    WHERE se.student_id = v_student
      AND (ps.subject_name ILIKE '%EAP%' OR ps.subject_name ILIKE '%英语%')
    ORDER BY ps.id LIMIT 1;
  END IF;

  -- 兜底：随便找一个 EAP 科目 + 任意学生
  IF v_ps IS NULL THEN
    SELECT id, subject_name INTO v_ps, v_ps_name FROM public.program_subjects
     WHERE subject_name ILIKE '%EAP%' OR subject_name ILIKE '%英语%' ORDER BY id LIMIT 1;
  END IF;
  IF v_student IS NULL THEN
    SELECT id INTO v_student FROM public.profiles WHERE role='student' ORDER BY created_at LIMIT 1;
  END IF;

  IF v_ps IS NULL OR v_student IS NULL THEN
    RAISE NOTICE '没找到 EAP 科目或学生，已跳过。请确认有项目科目与学生。';
    RETURN;
  END IF;

  -- 3) 过线分 65；清旧 mock
  UPDATE public.program_subjects SET pass_mark = 65 WHERE id = v_ps;
  DELETE FROM public.grade_records WHERE student_id = v_student AND program_subject_id = v_ps;
  DELETE FROM public.academic_milestones WHERE program_subject_id = v_ps;

  -- 4) 顶层考核节点（权重合计 100）
  INSERT INTO public.academic_milestones (program_subject_id, milestone_type, title, due_date, weight_percent, term_no, week_no, mode, is_major) VALUES
   (v_ps,'exam','Common Test 1','2026-05-11',10,1,3,'secure',false),
   (v_ps,'exam','Common Test 2','2026-06-22',10,1,9,'secure',false),
   (v_ps,'report_due','Academic Interview','2026-09-14',10,2,9,'secure',false),
   (v_ps,'exam','Examination','2026-11-23',30,3,8,'secure',true);

  INSERT INTO public.academic_milestones (program_subject_id, milestone_type, title, due_date, weight_percent, term_no, week_no, mode, is_major)
   VALUES (v_ps,'assignment','Academic Reading & Summary Project','2026-06-15',15,1,8,'secure',true) RETURNING id INTO m_summary;
  INSERT INTO public.academic_milestones (program_subject_id, milestone_type, title, due_date, weight_percent, term_no, week_no, mode, is_major)
   VALUES (v_ps,'assignment','Report Writing Project','2026-09-07',25,2,8,'secure',true) RETURNING id INTO m_report;

  -- 5) Summary Project 子项（占父% 合计 100）
  INSERT INTO public.academic_milestones (program_subject_id, parent_id, milestone_type, title, due_date, weight_percent, term_no, week_no, mode) VALUES
   (v_ps,m_summary,'assignment','Summary · Quiz 1','2026-05-11',5,1,3,'secure'),
   (v_ps,m_summary,'assignment','Summary · Quiz 2','2026-05-18',10,1,4,'secure'),
   (v_ps,m_summary,'assignment','Summary · Outline','2026-05-25',15,1,5,'non_secure'),
   (v_ps,m_summary,'assignment','Summary · Draft & Final','2026-06-15',70,1,8,'secure');

  -- 6) Report Project 子项（占父% 合计 100，用周历版口径）
  INSERT INTO public.academic_milestones (program_subject_id, parent_id, milestone_type, title, due_date, weight_percent, term_no, week_no, mode) VALUES
   (v_ps,m_report,'assignment','Report · Quiz 1','2026-07-20',5,2,1,'secure'),
   (v_ps,m_report,'assignment','Report · Quiz 2','2026-07-27',15,2,2,'secure'),
   (v_ps,m_report,'assignment','Report · Outline','2026-08-03',10,2,3,'non_secure'),
   (v_ps,m_report,'assignment','Report · Draft','2026-08-17',15,2,5,'non_secure'),
   (v_ps,m_report,'assignment','Report · Reflection Log','2026-08-31',10,2,7,'non_secure'),
   (v_ps,m_report,'assignment','Report · Final Report','2026-09-07',45,2,8,'secure');

  -- 7) 给学生录部分成绩（CT1/CT2 + Summary 全部子项 → Summary 自动汇总；其余待录）
  INSERT INTO public.grade_records (student_id, program_subject_id, milestone_id, score, score_type, status, recorded_at, recorded_by)
  SELECT v_student, v_ps, am.id, x.score, 'final', 'graded', now() - (x.daysago || ' days')::interval, NULL
  FROM (VALUES
    ('Common Test 1', 72, 40),
    ('Common Test 2', 60, 10),
    ('Summary · Quiz 1', 80, 38),
    ('Summary · Quiz 2', 75, 31),
    ('Summary · Outline', 70, 24),
    ('Summary · Draft & Final', 68, 12)
  ) AS x(title, score, daysago)
  JOIN public.academic_milestones am ON am.program_subject_id = v_ps AND am.title = x.title;

  RAISE NOTICE 'Mock 完成：学生=%（%），科目=%（id=%）。去成绩单选这位学生+该项目+该科目查看。', v_student_name, v_student, v_ps_name, v_ps;
END $$;
