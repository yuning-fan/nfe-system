-- ============================================================
-- 陈祺 成绩导入（含前置：补报名 + 新建 Biology / Chemistry 科目）
-- 幂等：可重复运行。执行前请通读。
--
-- 口径（沿用陈亦凡那次的约定）：
--   · 0 分 → status='missed'（缺考）
--   · 未给权重的项 → weight_percent=0，仅留档、不进加权总评
--     ⚠️ 涉及 4 项：Biology「0 Progress Report Data」「Assignment 1 Submission」
--                   Design「Typography Assignment」「Logo Assignment」
--     拿到官方评分表后请用文件末尾模板订正权重。
--   · Design 两项原始分(44.5/50、39/50)已折算成百分比存入，原始分记在 note。
--
-- 影响面：新建的 Biology/Chemistry 科目 + 全部考核节点挂在「预科-Standard」下，
--         对同项目其他学生可见。EAP 与 Mathematics 的节点上次已建，本次自动复用。
-- ============================================================
DO $$
DECLARE
  v_name    text := '陈祺';
  v_program int  := 1;                 -- 预科-Standard
  v_start   date := NULL;              -- ← 有确切入学日期就填
  v_student uuid; v_cnt int;
  v_enroll int; v_ps int; v_mid int; r record;
  v_created int := 0; v_reused int := 0; v_graded int := 0; v_skipped int := 0;
BEGIN
  ---------------------------------------------------------------
  -- STEP 0｜定位学生（严格校验，避免重名写错人）
  ---------------------------------------------------------------
  SELECT count(*) INTO v_cnt FROM public.profiles
   WHERE full_name = v_name AND role = 'student';
  IF v_cnt = 0 THEN RAISE EXCEPTION '❌ 找不到学生「%」', v_name; END IF;
  IF v_cnt > 1 THEN RAISE EXCEPTION '❌ 有 % 个同名「%」，请先确认用哪个 id', v_cnt, v_name; END IF;

  SELECT id INTO v_student FROM public.profiles
   WHERE full_name = v_name AND role = 'student';
  RAISE NOTICE 'STEP0 ✅ 学生 % id=%', v_name, v_student;

  ---------------------------------------------------------------
  -- STEP 1｜报名记录（没有才建）
  ---------------------------------------------------------------
  SELECT id INTO v_enroll FROM public.student_enrollments
   WHERE student_id = v_student ORDER BY id LIMIT 1;
  IF v_enroll IS NULL THEN
    INSERT INTO public.student_enrollments (student_id, program_id, start_date, status)
    VALUES (v_student, v_program, v_start, 'active') RETURNING id INTO v_enroll;
    RAISE NOTICE 'STEP1 ✅ 已建报名记录 id=%', v_enroll;
  ELSE
    RAISE NOTICE 'STEP1 ⏭  已有报名记录 id=%', v_enroll;
  END IF;
  UPDATE public.students_info SET enrollment_id = v_enroll
   WHERE student_id = v_student AND enrollment_id IS NULL;

  ---------------------------------------------------------------
  -- STEP 2｜新建 Biology / Chemistry 科目（照现有理科配法）
  ---------------------------------------------------------------
  FOR r IN SELECT * FROM (VALUES ('Biology'), ('Chemistry')) AS t(nm) LOOP
    SELECT id INTO v_ps FROM public.program_subjects
     WHERE program_id = v_program AND subject_name ILIKE r.nm LIMIT 1;
    IF v_ps IS NULL THEN
      INSERT INTO public.program_subjects
        (program_id, subject_name, subject_category, subject_area,
         difficulty_level, hours_per_week, sessions_per_week, pass_mark)
      VALUES (v_program, r.nm, 'elective', 'science', 'standard', 4.00, 2, 50)
      RETURNING id INTO v_ps;
      RAISE NOTICE 'STEP2 ✅ 已建科目 % id=%', r.nm, v_ps;
    ELSE
      RAISE NOTICE 'STEP2 ⏭  科目 % 已存在 id=%', r.nm, v_ps;
    END IF;
  END LOOP;

  ---------------------------------------------------------------
  -- STEP 3｜考核节点 + 成绩
  ---------------------------------------------------------------
  FOR r IN
    SELECT * FROM (VALUES
      -- 科目关键词, 节点标题, 权重%, 分数, 状态, 类型, 备注
      ('EAP','Assessment 1 · Common Test',                      5.0, 64.00,'graded','exam',      NULL),
      ('EAP','Assessment 2 · Explanation Writing',             10.0, 47.00,'graded','assignment',NULL),
      ('EAP','Assessment 3 · Listening',                        5.0, 54.00,'graded','exam',      NULL),
      ('EAP','Assessment 4 · Common Test',                      5.0, 63.00,'graded','exam',      NULL),
      ('EAP','Assessment 5 · Summary Writing Project',         15.0, 58.00,'graded','assignment',NULL),

      ('Biology','0 Progress Report Data',                      0.0, 10.00,'graded','report_due','⚠️ 权重待确认'),
      ('Biology','Assignment 1 Submission',                     0.0, 64.00,'graded','assignment','⚠️ 权重待确认'),
      ('Biology','3 Practical Investigation & Report Submission',5.0, 0.00,'missed','assignment',NULL),
      ('Biology','4 Common Test 1',                             7.5, 36.00,'graded','exam',      NULL),

      ('Chemistry','UoA Common Test 1 Part I',                  2.0, 28.57,'graded','exam',      NULL),
      ('Chemistry','UoA Common Test 1 Part II',                 3.0, 10.00,'graded','exam',      NULL),
      ('Chemistry','2. UoA Common Test 2',                      5.0, 33.00,'graded','exam',      NULL),
      ('Chemistry','5. UoA Group Project',                      5.0, 69.00,'graded','assignment',NULL),

      ('Design','4 Week Design Workshops (JAN & JULY)',         5.0, 74.00,'graded','assignment',NULL),
      ('Design','Typography Assignment Hand in',                0.0, 89.00,'graded','assignment','原始分 44.5/50；⚠️ 权重待确认'),
      ('Design','Logo Assignment Hand In',                      0.0, 78.00,'graded','assignment','原始分 39/50；⚠️ 权重待确认'),

      ('Mathematics','1 Common Test 1 Math',                    6.0, 81.00,'graded','exam',      NULL),
      ('Mathematics','2 Common Test 2 Mathematics',             9.0, 41.00,'graded','exam',      NULL),
      ('Mathematics','FLA Assignment',                          5.0, 91.00,'graded','assignment',NULL)
    ) AS t(subj_kw, title, weight, score, st, mtype, note)
  LOOP
    SELECT ps.id INTO v_ps FROM public.program_subjects ps
     WHERE ps.program_id = v_program AND ps.subject_name ILIKE '%'||r.subj_kw||'%'
     ORDER BY ps.id LIMIT 1;

    IF v_ps IS NULL THEN
      RAISE NOTICE '⚠️ 跳过（找不到科目 %）：%', r.subj_kw, r.title;
      v_skipped := v_skipped + 1; CONTINUE;
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
      (student_id, program_subject_id, milestone_id, score, score_type, status, note, recorded_at)
    VALUES (v_student, v_ps, v_mid, r.score, 'final', r.st, r.note, now());
    v_graded := v_graded + 1;
  END LOOP;

  RAISE NOTICE '✅ 完成：新建节点 % / 复用 % / 写入成绩 % / 跳过 %',
               v_created, v_reused, v_graded, v_skipped;
END $$;

-- ===== 自查：成绩单 =====
select ps.subject_name as "科目", am.title as "节点", am.weight_percent as "权重%",
       g.score as "分数", g.status as "状态", g.note as "备注"
from public.grade_records g
join public.profiles p on p.id = g.student_id
join public.program_subjects ps on ps.id = g.program_subject_id
join public.academic_milestones am on am.id = g.milestone_id
where p.full_name = '陈祺'
order by ps.subject_name, am.weight_percent desc, am.title;

-- ===== 自查：各科加权 + 还需均分 =====
select ps.subject_name as "科目",
       sum(am.weight_percent) as "已出权重",
       round(sum(am.weight_percent*g.score)/nullif(sum(am.weight_percent),0),2) as "已出加权均分",
       round(sum(am.weight_percent*g.score)/100,2) as "已得加权分",
       ps.pass_mark as "过线",
       round((ps.pass_mark - sum(am.weight_percent*g.score)/100)
             / nullif(100 - sum(am.weight_percent),0) * 100, 1) as "剩余需均分"
from public.grade_records g
join public.profiles p on p.id = g.student_id
join public.program_subjects ps on ps.id = g.program_subject_id
join public.academic_milestones am on am.id = g.milestone_id
where p.full_name = '陈祺' and am.weight_percent > 0
group by ps.subject_name, ps.pass_mark order by ps.subject_name;

-- ===== 订正权重模板（拿到官方评分表后用）=====
-- update public.academic_milestones set weight_percent = 10
--  where title = 'Assignment 1 Submission'
--    and program_subject_id = (select id from public.program_subjects
--                              where subject_name ilike 'Biology' and program_id = 1 limit 1);
