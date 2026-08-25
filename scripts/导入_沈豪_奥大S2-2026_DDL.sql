-- ============================================================
-- 沈豪 · 奥大 S2 2026 学术数据导入
-- 数据源：ShenHao_S2_2026_DDL_Tracker.xlsx（2026-07-29）
-- 学生：504e3ffe-984a-4b8e-a9c5-e25db2cce9e6（NFE-000020），enrollment #72
--
-- 选课 4 门：COMMS 106 / DANCE 101 / GLOBAL 101 / MEDIA 102
--   ⚠️ DANCE 101 与郑王景怡是同一门 paper（2026 S2），科目与节点已存在，
--      本脚本只给沈豪补一条选课记录，不重复建节点。
--
-- 本表比郑王景怡那份多一列「AI 政策」：
--   课程级写进 program_subjects.description，单项级写进 academic_milestones.note（前缀「AI 允许 / AI 禁用」）。
-- MEDIA 102 的 quiz 表里拆成「开放」「关闭」两行，本脚本合成一个节点：
--   due_date/due_time 取关闭时刻，开放时刻写进 note。
-- COMMS 106 / MEDIA 102 的 Tutorial Participation 是持续性出勤、无单次 DDL，
--   日期取学期末 2026-10-31 作结算日（与 GEOG 205 同口径）。
-- COMMS 106 Assignment 3 待公布，占位 2026-11-17（考试期末）。
--
-- 幂等：科目按 (program_id, subject_name, year, semester) 查重；
--       节点按 (program_subject_id, title) 查重；选课按 (enrollment_id, program_subject_id) 查重。
-- ============================================================
DO $$
DECLARE
  v_program  int      := 4;
  v_year     smallint := 2026;
  v_sem      text     := 'S2';
  v_enroll   int      := 72;
  v_student  uuid     := '504e3ffe-984a-4b8e-a9c5-e25db2cce9e6';
  v_subjects text[]   := ARRAY['COMMS 106','DANCE 101','GLOBAL 101','MEDIA 102'];
  v_ps int; v_pid int; v_mid int; r record;
  v_ps_created int := 0; v_n_created int := 0; v_n_reused int := 0; v_sel int := 0;
BEGIN
  PERFORM 1 FROM public.student_enrollments
   WHERE id = v_enroll AND program_id = v_program AND student_id = v_student;
  IF NOT FOUND THEN RAISE EXCEPTION '❌ enrollment #% 不是沈豪的大学阶段记录，中止', v_enroll; END IF;

  ---------------------------------------------------------------
  -- 1. 科目（DANCE 101 已存在会被跳过）
  ---------------------------------------------------------------
  FOR r IN SELECT * FROM (VALUES
    ('COMMS 106',  '奥大 S2 2026；AI 允许（大纲未禁止）；迟交每天扣 1 分；⚠️ Assignment 3 日期待公布；⚠️ 大纲对 Assignment 1 Part 1 写 "No submission for this assignment"，开学后需确认交付方式'),
    ('DANCE 101',  '奥大 S2 2026；及格线 overall 50/100；⚠️ Assessment 4 Exam 日期待公布；⚠️ AI 政策大纲未明确'),
    ('GLOBAL 101', '奥大 S2 2026；Essay / Podcast 允许 AI，两次 Test 推测禁 AI；⚠️ 两次 Test 线上/线下大纲未明写，暂按评估中心现场处理'),
    ('MEDIA 102',  '奥大 S2 2026；⚠️ 整门课明确禁止使用 AI（Media & Screen Studies 政策），Essay / Analysis / Quiz 均适用；Tutorial 自 Week 2 起，11 次中需参与 10 次')
  ) t(name, descr) LOOP
    SELECT id INTO v_ps FROM public.program_subjects
     WHERE program_id = v_program AND subject_name = r.name AND year = v_year AND semester = v_sem LIMIT 1;
    IF v_ps IS NULL THEN
      INSERT INTO public.program_subjects
        (program_id, subject_name, subject_category, subject_area, difficulty_level,
         pass_mark, year, semester, description)
      VALUES (v_program, r.name, 'elective', 'arts', 'standard', 50, v_year, v_sem, r.descr);
      v_ps_created := v_ps_created + 1;
      RAISE NOTICE '✅ 新建科目 %', r.name;
    ELSE
      RAISE NOTICE '⏭  科目已存在 % (id=%) —— 复用', r.name, v_ps;
    END IF;
  END LOOP;

  ---------------------------------------------------------------
  -- 2. 顶层考核节点（weight_percent = 占该门总评 %）；DANCE 101 的 4 个已存在，不重复列
  ---------------------------------------------------------------
  FOR r IN SELECT * FROM (VALUES
    -- subject, title, weight, type, mode, due_date, due_time, is_major, note
    ('COMMS 106','Tutorial Participation',                              10.0,'assignment','secure',    '2026-10-31','23:59',false,'AI 允许；每周 tutorial（Week 1 起）现场出勤 + task/worksheet + mini-presentation；允许缺 2 次；无单次 DDL，10/31 结算'),
    ('COMMS 106','Assignment 1 Part 1: Group Manifesto Proposal',       10.0,'assignment','non_secure','2026-08-14','23:59',false,'AI 允许；小组 300–500 字提案；⚠️ 大纲写 "No submission for this assignment"，交付方式待确认'),
    ('COMMS 106','Assignment 1 Part 2: Group Manifesto',                25.0,'assignment','non_secure','2026-10-19','23:59',true, 'AI 允许；小组 1000 字正文，基于 Part 1；⚠️ 具体时间大纲未明写'),
    ('COMMS 106','Assignment 1 Part 3: Self & Peer Evaluations（2 轮）',  5.0,'assignment','non_secure','2026-10-22','23:59',false,'AI 允许；FeedbackFruit；每轮 2.5%（占总评）'),
    ('COMMS 106','Assignment 2: Images & Reflection',                   25.0,'assignment','non_secure','2026-09-18','23:59',true, 'AI 允许；个人；制作图像 + 简短反思；⚠️ 具体时间大纲未明写'),
    ('COMMS 106','Assignment 3: Leadership Reflection',                 25.0,'assignment','non_secure','2026-11-17',NULL,   true, 'AI 允许；⚠️ 日期待公布，占位=考试期末 11/17；750–1000 字个人批判性反思；需融入 Part 3 收到的反馈'),

    ('GLOBAL 101','Essay: Sustainability Reflective',                   25.0,'assignment','non_secure','2026-08-14','23:59',false,'AI 允许；Canvas 上传'),
    ('GLOBAL 101','Group Podcast',                                      25.0,'assignment','non_secure','2026-10-09','23:59',false,'AI 允许；小组合作音频作品；Canvas 上传'),
    ('GLOBAL 101','Test 1',                                             25.0,'exam',      'secure',    '2026-08-26','19:00',false,'⚠️ 推测禁 AI（大纲未明写）；⚠️ 线上/线下大纲未明写，暂按评估中心现场'),
    ('GLOBAL 101','Test 2',                                             25.0,'exam',      'secure',    '2026-10-21','19:00',false,'⚠️ 推测禁 AI（大纲未明写）；⚠️ 线上/线下大纲未明写，暂按评估中心现场'),

    ('MEDIA 102','Tutorial Participation',                              10.0,'assignment','secure',    '2026-10-31','23:59',false,'禁 AI；Week 2 起，11 次 tutorial 中需参与 10 次；无单次 DDL，10/31 结算'),
    ('MEDIA 102','Multiple-choice Quizzes（4 modules）',                 20.0,'assignment','non_secure','2026-10-22','23:59',false,'禁 AI；每模块 5%（占总评）、10 道题；Canvas Quiz'),
    ('MEDIA 102','Media Analysis (Representing Yourself)',              30.0,'assignment','non_secure','2026-08-20','23:59',true, '禁 AI；拍摄照片 + 1000 字分析；⚠️ 具体时间大纲未明写'),
    ('MEDIA 102','Media Essay',                                         40.0,'assignment','non_secure','2026-10-30','23:59',true, '禁 AI；1500 字 essay；⚠️ 具体时间大纲未明写')
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
    ('COMMS 106','Assignment 1 Part 3: Self & Peer Evaluations（2 轮）','Part 3 第 1 轮 Self & Peer Evaluation', 50.0,'assignment','non_secure','2026-08-21','23:59','AI 允许；Part 1 提交后进行；FeedbackFruit；⚠️ 具体时间大纲未明写'),
    ('COMMS 106','Assignment 1 Part 3: Self & Peer Evaluations（2 轮）','Part 3 第 2 轮 Self & Peer Evaluation', 50.0,'assignment','non_secure','2026-10-22','23:59','AI 允许；Part 2 提交后进行；FeedbackFruit；反馈需融入 Assignment 3；⚠️ 具体时间大纲未明写'),

    ('MEDIA 102','Multiple-choice Quizzes（4 modules）','Module 1 Quiz: Media & Meaning',                 25.0,'assignment','non_secure','2026-08-13','23:59','禁 AI；8/7 08:00 开放、8/13 关闭；10 道题；⚠️ 关闭具体时间大纲未明写'),
    ('MEDIA 102','Multiple-choice Quizzes（4 modules）','Module 2 Quiz: Contextualising Media',           25.0,'assignment','non_secure','2026-09-17','23:59','禁 AI；9/14 08:00 开放、9/17 关闭；⚠️ 关闭具体时间大纲未明写'),
    ('MEDIA 102','Multiple-choice Quizzes（4 modules）','Module 3 Quiz: Media Industries & Production',   25.0,'assignment','non_secure','2026-10-08','23:59','禁 AI；10/2 10:00 开放、10/8 关闭；⚠️ 关闭具体时间大纲未明写'),
    ('MEDIA 102','Multiple-choice Quizzes（4 modules）','Module 4 Quiz: Mediating the Past',              25.0,'assignment','non_secure','2026-10-22','23:59','禁 AI；10/16 10:00 开放、10/22 关闭；⚠️ 关闭具体时间大纲未明写')
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
  -- 4. 选课：只挂沈豪这 4 门（不能按 program+学期 全选，那会把郑王景怡的 EDUC/GEOG 也挂上）
  ---------------------------------------------------------------
  FOR v_ps IN SELECT id FROM public.program_subjects
   WHERE program_id = v_program AND year = v_year AND semester = v_sem
     AND subject_name = ANY(v_subjects) ORDER BY id LOOP
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

  FOR r IN
    SELECT ps.subject_name, sum(m.weight_percent) w
      FROM public.program_subjects ps
      JOIN public.academic_milestones m ON m.program_subject_id = ps.id AND m.parent_id IS NULL
     WHERE ps.program_id = v_program AND ps.year = v_year AND ps.semester = v_sem
       AND ps.subject_name = ANY(v_subjects)
     GROUP BY ps.subject_name ORDER BY ps.subject_name
  LOOP
    RAISE NOTICE '% 顶层权重合计 = %  %', r.subject_name, r.w,
      CASE WHEN round(r.w) = 100 THEN '✅' ELSE '⚠️ 不等于 100' END;
  END LOOP;
END $$;
