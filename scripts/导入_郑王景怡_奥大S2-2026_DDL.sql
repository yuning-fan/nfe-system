-- ============================================================
-- 郑王景怡 · 奥大 S2 2026 学术数据导入
-- 数据源：小瑷_S2_2026_DDL_Tracker.xlsx（2026-07-23）
--
-- 落点：
--   program_subjects (program_id=4 大学阶段（奥大）, year=2026, semester='S2')  4 门 paper
--     └ academic_milestones 顶层 15 个（评估组，weight_percent = 占总评%，每门配平 100）
--         └ academic_milestones 子项 22 个（具体 DDL，weight_percent = 占父节点%）
--   student_subject_selections  4 条 → enrollment #79
--
-- ⚠️ 权重口径：表里「具体占比」写的是占总评，库里子项定义是占父节点，本脚本已换算。
--    例：EDUC 213 单次 quiz 表内 2%（占总评）→ 库内 10%（占 Quizzes 组 20% 的 1/10）。
-- ⚠️ 考核节点挂在「科目」上而非学生上，未来同样选 2026 S2 这几门 paper 的学生会共用。
-- ⚠️ 两个待公布 exam 用占位日期 2026-11-17（考试期末），note 已注明。
--
-- 幂等：科目按 (program_id, subject_name, year, semester) 查重；
--       节点按 (program_subject_id, title) 查重；选课按 (enrollment_id, program_subject_id) 查重。
-- ============================================================
DO $$
DECLARE
  v_program  int      := 4;
  v_year     smallint := 2026;
  v_sem      text     := 'S2';
  v_enroll   int      := 79;          -- 郑王景怡 3f2dafb4-0764-4358-8779-919bed1f426d
  v_ps int; v_pid int; v_mid int; r record;
  v_ps_created int := 0; v_n_created int := 0; v_n_reused int := 0; v_sel int := 0;
  v_sum numeric;
BEGIN
  -- 前置校验：enrollment 必须属于本人且指向 program 4
  PERFORM 1 FROM public.student_enrollments
   WHERE id = v_enroll AND program_id = v_program
     AND student_id = '3f2dafb4-0764-4358-8779-919bed1f426d';
  IF NOT FOUND THEN RAISE EXCEPTION '❌ enrollment #% 不是郑王景怡的大学阶段记录，中止', v_enroll; END IF;

  ---------------------------------------------------------------
  -- 1. 科目（4 门 paper）
  ---------------------------------------------------------------
  FOR r IN SELECT * FROM (VALUES
    ('DANCE 101', '奥大 S2 2026；及格线 overall 50/100；⚠️ Assessment 4 Exam 日期待公布；⚠️ AI 政策大纲未明确'),
    ('EDUC 114',  '奥大 S2 2026；及格线 50%；⚠️ Final Exam 在 10/30–11/17 考试期内待公布；⚠️ 大纲 schedule 写 Wednesday 但 8/6、8/20 实为周四，开学请确认；⚠️ AI 政策大纲未明确'),
    ('EDUC 213',  '奥大 S2 2026；及格线 50%；迟交扣分：1 周内 -10%，1-2 周 -20%，2-3 周 -40%，3 周后需联系 coordinator；⚠️ Commentary 1a 是否 in-class 待确认；⚠️ AI 政策大纲未明确'),
    ('GEOG 205',  '奥大 S2 2026；及格线 50%；全平时成绩、无期末考；10/31 tutorial 出勤最终结算；⚠️ AI 政策大纲未明确')
  ) t(name, descr) LOOP
    SELECT id INTO v_ps FROM public.program_subjects
     WHERE program_id = v_program AND subject_name = r.name AND year = v_year AND semester = v_sem LIMIT 1;
    IF v_ps IS NULL THEN
      INSERT INTO public.program_subjects
        (program_id, subject_name, subject_category, subject_area, difficulty_level,
         pass_mark, year, semester, description)
      VALUES (v_program, r.name, 'elective', 'arts', 'standard', 50, v_year, v_sem, r.descr);
      v_ps_created := v_ps_created + 1;
      RAISE NOTICE '✅ 新建科目 % (% %)', r.name, v_year, v_sem;
    ELSE
      RAISE NOTICE '⏭  科目已存在 % (id=%)', r.name, v_ps;
    END IF;
  END LOOP;

  ---------------------------------------------------------------
  -- 2. 顶层考核节点（weight_percent = 占该门总评 %）
  ---------------------------------------------------------------
  FOR r IN SELECT * FROM (VALUES
    -- subject, title, weight, type, mode, due_date, due_time, is_major, note
    ('DANCE 101','Assessment 1: Study in Creativity (SIC)', 20.0,'assignment','non_secure','2026-09-18','17:00',false,'4 次反思写作 Part 1–4；Canvas 上传'),
    ('DANCE 101','Assessment 2: Solo/Duet Choreography',    10.0,'assignment','secure',    '2026-09-21','15:00',false,'课堂内现场表演；含 9/14 中期反馈展示'),
    ('DANCE 101','Assessment 3: Artistic Project',          30.0,'assignment','secure',    '2026-10-19','15:00',true, '⚠️ 形式待确认（现场表演 / 媒体作品）'),
    ('DANCE 101','Assessment 4: Exam',                      40.0,'exam',      'secure',    '2026-11-17',NULL,   true, '⚠️ 日期待公布，占位=考试期末 11/17；及格线 50/100'),

    ('EDUC 114','Quizzes（4 次）',                          20.0,'assignment','non_secure','2026-10-01','23:59',false,'每次 5%；Canvas Quiz'),
    ('EDUC 114','Essay',                                   30.0,'assignment','non_secure','2026-10-15','23:59',true, '⚠️ 具体时间大纲未明写；Canvas 上传'),
    ('EDUC 114','Final Exam S2 2026',                       50.0,'exam',      'secure',    '2026-11-17',NULL,   true, '⚠️ 日期待公布，在 10/30–11/17 考试期内，占位=11/17；及格线 50%'),

    ('EDUC 213','Assessment 1: Quizzes（10 次）',            20.0,'assignment','non_secure','2026-10-18','23:59',false,'每次 2%（占总评）；8/2 起每周一次；Canvas Quiz'),
    ('EDUC 213','Assessment 2: Three Writing Commentaries',  60.0,'assignment','non_secure','2026-10-23','23:59',true, '3 次 × 20%（占总评）'),
    ('EDUC 213','Assessment 3: Video Presentation',          20.0,'assignment','non_secure','2026-10-30','23:59',false,'Video Analysis；Canvas 视频上传'),

    ('GEOG 205','Photo Narrative Essay',                     20.0,'assignment','non_secure','2026-08-17','23:59',false,'Canvas 上传'),
    ('GEOG 205','Essay（1500 字）',                          25.0,'assignment','non_secure','2026-09-21','23:59',false,'Canvas 上传'),
    ('GEOG 205','LEGO Map & Reflection',                     25.0,'assignment','non_secure','2026-10-09','23:59',false,'Canvas 上传'),
    ('GEOG 205','Summative Assessment',                      20.0,'assignment','non_secure','2026-10-20','15:00',false,'Canvas 上传；⚠️ 提交形式大纲未明写'),
    ('GEOG 205','Tutorial Participation',                    10.0,'assignment','secure',    '2026-10-31','23:59',false,'整学期每周 tutorial 现场出勤；10/31 最终结算')
  ) t(subj, title, weight, mtype, mode, ddate, dtime, is_major, note) LOOP
    SELECT id INTO v_ps FROM public.program_subjects
     WHERE program_id = v_program AND subject_name = r.subj AND year = v_year AND semester = v_sem LIMIT 1;
    SELECT id INTO v_mid FROM public.academic_milestones
     WHERE program_subject_id = v_ps AND title = r.title LIMIT 1;
    IF v_mid IS NULL THEN
      INSERT INTO public.academic_milestones
        (program_subject_id, milestone_type, title, due_date, due_time, weight_percent,
         mode, term_no, week_no, is_major, is_grade_recorded, note)
      VALUES (v_ps, r.mtype::milestone_type, r.title, r.ddate::date, r.dtime::time, r.weight,
              r.mode, 2::smallint, NULL, r.is_major, false, r.note);
      v_n_created := v_n_created + 1;
    ELSE
      v_n_reused := v_n_reused + 1;
    END IF;
  END LOOP;

  ---------------------------------------------------------------
  -- 3. 子项（weight_percent = 占父节点 %）
  ---------------------------------------------------------------
  FOR r IN SELECT * FROM (VALUES
    -- subject, parent_title, title, weight(占父), type, mode, due_date, due_time, note
    ('DANCE 101','Assessment 1: Study in Creativity (SIC)','SIC Part 1', 25.0,'assignment','non_secure','2026-08-07','17:00','反思性写作；Canvas 上传'),
    ('DANCE 101','Assessment 1: Study in Creativity (SIC)','SIC Part 2', 25.0,'assignment','non_secure','2026-08-28','17:00','反思性写作；Canvas 上传'),
    ('DANCE 101','Assessment 1: Study in Creativity (SIC)','SIC Part 3', 25.0,'assignment','non_secure','2026-09-18','17:00','反思性写作；Canvas 上传'),
    ('DANCE 101','Assessment 1: Study in Creativity (SIC)','SIC Part 4', 25.0,'assignment','non_secure','2026-09-18','17:00','反思性写作；与 Part 3 同日提交'),
    ('DANCE 101','Assessment 2: Solo/Duet Choreography','Feedback Showing（中期反馈展示）', NULL,'assignment','secure','2026-09-14','15:00','含在 Assessment 2 的 10% 内，不单独计权重'),

    ('EDUC 114','Quizzes（4 次）','Quiz 1: Treaty of Waitangi in Education', 25.0,'assignment','non_secure','2026-08-06','23:59','⚠️ 大纲写 Wed，8/6 实为 Thu；时间大纲未明写'),
    ('EDUC 114','Quizzes（4 次）','Quiz 2: Māori Language in Education',     25.0,'assignment','non_secure','2026-08-20','23:59','⚠️ 大纲写 Wed，8/20 实为 Thu；时间大纲未明写'),
    ('EDUC 114','Quizzes（4 次）','Quiz 3: Policy in Māori Education',       25.0,'assignment','non_secure','2026-09-17','23:59','⚠️ 具体时间大纲未明写'),
    ('EDUC 114','Quizzes（4 次）','Quiz 4: Māori Women and Education',       25.0,'assignment','non_secure','2026-10-01','23:59','⚠️ 具体时间大纲未明写'),

    ('EDUC 213','Assessment 1: Quizzes（10 次）','Quiz 1: Freire (2000)',                         10.0,'assignment','non_secure','2026-08-02','23:59',NULL),
    ('EDUC 213','Assessment 1: Quizzes（10 次）','Quiz 2: Keddie (2012)',                         10.0,'assignment','non_secure','2026-08-09','23:59',NULL),
    ('EDUC 213','Assessment 1: Quizzes（10 次）','Quiz 3: Snook & O''Neill (2014)',               10.0,'assignment','non_secure','2026-08-14','23:59',NULL),
    ('EDUC 213','Assessment 1: Quizzes（10 次）','Quiz 4: Dewhurst (2010)',                       10.0,'assignment','non_secure','2026-08-23','23:59',NULL),
    ('EDUC 213','Assessment 1: Quizzes（10 次）','Quiz 5: Locke',                                 10.0,'assignment','non_secure','2026-08-28','23:59',NULL),
    ('EDUC 213','Assessment 1: Quizzes（10 次）','Quiz 6: O''Connor & Aitken (2014)',             10.0,'assignment','non_secure','2026-09-20','23:59',NULL),
    ('EDUC 213','Assessment 1: Quizzes（10 次）','Quiz 7: Gallagher, Allen and Bolt (2024)',      10.0,'assignment','non_secure','2026-09-27','23:59',NULL),
    ('EDUC 213','Assessment 1: Quizzes（10 次）','Quiz 8: Rata (2017)',                           10.0,'assignment','non_secure','2026-10-04','23:59',NULL),
    ('EDUC 213','Assessment 1: Quizzes（10 次）','Quiz 9: Rata (2021)',                           10.0,'assignment','non_secure','2026-10-11','23:59',NULL),
    ('EDUC 213','Assessment 1: Quizzes（10 次）','Quiz 10: Rata (2021b)',                         10.0,'assignment','non_secure','2026-10-18','23:59',NULL),
    ('EDUC 213','Assessment 2: Three Writing Commentaries','Commentary 1a: Alexis''s Ed & Social Justice',        33.33,'assignment','non_secure','2026-08-14','23:59','⚠️ 大纲标 in-class Writing Commentary——是否课堂现场完成待确认'),
    ('EDUC 213','Assessment 2: Three Writing Commentaries','Commentary 1b: Paul''s Social Justice in Arts Ed',    33.33,'assignment','non_secure','2026-09-25','23:59','Canvas 上传'),
    ('EDUC 213','Assessment 2: Three Writing Commentaries','Commentary 1c: Promise of Education',                 33.34,'assignment','non_secure','2026-10-23','23:59','Canvas 上传')
  ) t(subj, ptitle, title, weight, mtype, mode, ddate, dtime, note) LOOP
    SELECT id INTO v_ps FROM public.program_subjects
     WHERE program_id = v_program AND subject_name = r.subj AND year = v_year AND semester = v_sem LIMIT 1;
    SELECT id INTO v_pid FROM public.academic_milestones
     WHERE program_subject_id = v_ps AND title = r.ptitle LIMIT 1;
    IF v_pid IS NULL THEN RAISE EXCEPTION '❌ 找不到父节点 %/%', r.subj, r.ptitle; END IF;

    SELECT id INTO v_mid FROM public.academic_milestones
     WHERE program_subject_id = v_ps AND title = r.title LIMIT 1;
    IF v_mid IS NULL THEN
      INSERT INTO public.academic_milestones
        (program_subject_id, parent_id, milestone_type, title, due_date, due_time, weight_percent,
         mode, term_no, week_no, is_major, is_grade_recorded, note)
      VALUES (v_ps, v_pid, r.mtype::milestone_type, r.title, r.ddate::date, r.dtime::time, r.weight,
              r.mode, 2::smallint, NULL, false, false, r.note);
      v_n_created := v_n_created + 1;
    ELSE
      v_n_reused := v_n_reused + 1;
    END IF;
  END LOOP;

  ---------------------------------------------------------------
  -- 4. 选课：4 门挂到 enrollment #79
  ---------------------------------------------------------------
  FOR v_ps IN SELECT id FROM public.program_subjects
   WHERE program_id = v_program AND year = v_year AND semester = v_sem ORDER BY id LOOP
    PERFORM 1 FROM public.student_subject_selections
     WHERE enrollment_id = v_enroll AND program_subject_id = v_ps;
    IF NOT FOUND THEN
      INSERT INTO public.student_subject_selections
        (enrollment_id, program_subject_id, selection_type, status, confirmed_at)
      VALUES (v_enroll, v_ps, 'elective', 'confirmed', now());
      v_sel := v_sel + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '——————————————————————————';
  RAISE NOTICE '科目新建 % ｜ 节点新建 % / 跳过 % ｜ 选课新增 %', v_ps_created, v_n_created, v_n_reused, v_sel;

  -- 5. 权重配平自检
  FOR r IN
    SELECT ps.subject_name, sum(m.weight_percent) w
      FROM public.program_subjects ps
      JOIN public.academic_milestones m ON m.program_subject_id = ps.id AND m.parent_id IS NULL
     WHERE ps.program_id = v_program AND ps.year = v_year AND ps.semester = v_sem
     GROUP BY ps.subject_name ORDER BY ps.subject_name
  LOOP
    RAISE NOTICE '% 顶层权重合计 = %  %', r.subject_name, r.w,
      CASE WHEN round(r.w) = 100 THEN '✅' ELSE '⚠️ 不等于 100' END;
  END LOOP;
END $$;
