-- ============================================================
-- 陈亦凡 成绩导入 · 完整版（含前置：补报名记录 + 新建 Statistics 科目）
-- ⚠️ 本脚本会写入数据。执行前请通读，尤其 STEP 1 / STEP 2 的影响面。
-- 幂等：可重复运行，不会产生重复记录。
--
-- 影响面提示：
--   STEP 1 只影响陈亦凡本人（新增一条报名记录）。
--   STEP 2 新建的 Statistics 科目挂在「预科-Standard」项目下，
--          该项目的其他学生也会看到这门科目。
--   STEP 3 的考核节点同样挂在科目上 → 对同项目其他学生可见。
--          （目前全库节点数=0，等于是首次建立这批节点）
-- ============================================================
DO $$
DECLARE
  v_student  uuid := 'edd8c78a-d0ed-46a3-91ac-94ac41b335ae';  -- 陈亦凡
  v_program  int  := 1;                    -- 预科-Standard
  v_start    date := NULL;                 -- ← 有确切入学日期就填，如 DATE '2026-02-01'
  v_end      date := NULL;                 -- ← 结课日期，可留空
  v_enroll   int;
  v_ps int; v_mid int; r record;
  v_created int := 0; v_reused int := 0; v_graded int := 0; v_skipped int := 0;
BEGIN
  ---------------------------------------------------------------
  -- STEP 1｜补报名记录（仅当他还没有任何报名时才建）
  ---------------------------------------------------------------
  SELECT id INTO v_enroll FROM public.student_enrollments
   WHERE student_id = v_student ORDER BY id LIMIT 1;

  IF v_enroll IS NULL THEN
    INSERT INTO public.student_enrollments
      (student_id, program_id, start_date, end_date, status)
    VALUES (v_student, v_program, v_start, v_end, 'active')
    RETURNING id INTO v_enroll;
    RAISE NOTICE 'STEP1 ✅ 已新建报名记录 id=%（项目=预科-Standard）', v_enroll;
  ELSE
    RAISE NOTICE 'STEP1 ⏭  已存在报名记录 id=%，跳过', v_enroll;
  END IF;

  -- 回填 students_info.enrollment_id（若为空）
  UPDATE public.students_info SET enrollment_id = v_enroll
   WHERE student_id = v_student AND enrollment_id IS NULL;

  ---------------------------------------------------------------
  -- STEP 2｜新建 Statistics 科目（照 Mathematics 的配法）
  ---------------------------------------------------------------
  SELECT id INTO v_ps FROM public.program_subjects
   WHERE program_id = v_program AND subject_name ILIKE 'Statistics' LIMIT 1;

  IF v_ps IS NULL THEN
    INSERT INTO public.program_subjects
      (program_id, subject_name, subject_category, subject_area,
       difficulty_level, hours_per_week, sessions_per_week, pass_mark)
    VALUES (v_program,'Statistics','elective','science','standard',4.00,2,50)
    RETURNING id INTO v_ps;
    RAISE NOTICE 'STEP2 ✅ 已新建科目 Statistics id=%', v_ps;
  ELSE
    RAISE NOTICE 'STEP2 ⏭  Statistics 已存在 id=%，跳过', v_ps;
  END IF;

  ---------------------------------------------------------------
  -- STEP 3｜建考核节点 + 写成绩
  ---------------------------------------------------------------
  FOR r IN
    SELECT * FROM (VALUES
      -- 科目关键词, 节点标题, 权重%, 分数, 状态, 类型
      ('EAP',  'Assessment 1 · Common Test',                       5.0,  60.00,'graded','exam'),
      ('EAP',  'Assessment 2 · Explanation Writing',              10.0,  53.00,'graded','assignment'),
      ('EAP',  'Assessment 3 · Listening',                         5.0,  86.00,'graded','exam'),
      ('EAP',  'Assessment 4 · Common Test',                       5.0,  63.00,'graded','exam'),
      ('EAP',  'Assessment 5 · Summary Writing Project',          15.0,  40.00,'graded','assignment'),

      ('Economics','1 Common Test 1',                              5.0,  28.00,'graded','exam'),
      ('Economics','2 Common Test 2',                             10.0,  77.00,'graded','exam'),
      ('Economics','4 Group Presentation',                        15.0,  72.00,'graded','assignment'),

      ('Mathematics','1 Common Test 1 Math',                       6.0,   0.00,'missed','exam'),
      ('Mathematics','2 Common Test 2 Mathematics',                9.0,  72.00,'graded','exam'),
      ('Mathematics','FLA Assignment',                             5.0,  94.00,'graded','assignment'),

      ('Physics','UoA JAN Physics Test 0 Topic 1 Part A (19分制)',  0.0,  76.32,'graded','exam'),
      ('Physics','UoA JAN Physics Test 0 Topic 1 Part B (27分制)',  0.0,  48.15,'graded','exam'),
      ('Physics','4. UoA Jan Physics Test 1 Topic 1',               2.0,  60.00,'graded','exam'),
      ('Physics','5. UoA Jan Physics Test 2 Topic 2',               3.0,  65.00,'graded','exam'),
      ('Physics','6. UoA Jan Physics Test 3 Topics 3&4',            6.0,  79.00,'graded','exam'),
      ('Physics','10. UoA Jan Physics Assignments',               11.0,  58.00,'graded','assignment'),
      ('Physics','11. UoA Jan Physics Practical Investigation',     5.0,   0.00,'missed','assignment'),

      ('Statistics','Common Test 1',                               5.0,  59.00,'graded','exam'),
      ('Statistics','Common Test 2',                               7.5,  58.00,'graded','exam'),
      ('Statistics','Common Test 3',                               7.5,  43.00,'graded','exam')
    ) AS t(subj_kw, title, weight, score, st, mtype)
  LOOP
    SELECT ps.id INTO v_ps FROM public.program_subjects ps
     WHERE ps.program_id = v_program AND ps.subject_name ILIKE '%'||r.subj_kw||'%'
     ORDER BY ps.id LIMIT 1;

    IF v_ps IS NULL THEN
      RAISE NOTICE '⚠️ 跳过（找不到科目 %）：%', r.subj_kw, r.title;
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    SELECT id INTO v_mid FROM public.academic_milestones
     WHERE program_subject_id = v_ps AND title = r.title LIMIT 1;

    IF v_mid IS NULL THEN
      INSERT INTO public.academic_milestones
        (program_subject_id, milestone_type, title, due_date, weight_percent, is_grade_recorded)
      VALUES (v_ps, r.mtype::milestone_type, r.title, DATE '2026-01-01', r.weight, true)
      RETURNING id INTO v_mid;
      v_created := v_created + 1;
    ELSE
      v_reused := v_reused + 1;
    END IF;

    DELETE FROM public.grade_records
     WHERE student_id = v_student AND milestone_id = v_mid;

    INSERT INTO public.grade_records
      (student_id, program_subject_id, milestone_id, score, score_type, status, recorded_at)
    VALUES (v_student, v_ps, v_mid, r.score, 'final', r.st, now());
    v_graded := v_graded + 1;
  END LOOP;

  RAISE NOTICE '✅ 完成：新建节点 % / 复用 % / 写入成绩 % / 跳过 %',
               v_created, v_reused, v_graded, v_skipped;
END $$;

-- ===== 自查：成绩单 =====
select ps.subject_name as "科目", am.title as "节点", am.weight_percent as "权重%",
       g.score as "分数", g.status as "状态"
from public.grade_records g
join public.profiles p on p.id = g.student_id
join public.program_subjects ps on ps.id = g.program_subject_id
join public.academic_milestones am on am.id = g.milestone_id
where p.full_name = '陈亦凡'
order by ps.subject_name, am.weight_percent desc, am.title;

-- ===== 自查：各科加权 =====
select ps.subject_name as "科目",
       sum(am.weight_percent) as "已出权重",
       round(sum(am.weight_percent*g.score)/nullif(sum(am.weight_percent),0),3) as "已出加权均分",
       ps.pass_mark as "过线分"
from public.grade_records g
join public.profiles p on p.id = g.student_id
join public.program_subjects ps on ps.id = g.program_subject_id
join public.academic_milestones am on am.id = g.milestone_id
where p.full_name = '陈亦凡' and am.weight_percent > 0
group by ps.subject_name, ps.pass_mark order by ps.subject_name;
