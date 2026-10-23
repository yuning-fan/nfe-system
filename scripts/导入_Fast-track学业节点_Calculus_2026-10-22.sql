-- ============================================================
-- Fast-track（program_id=3）学业节点：Calculus
-- 数据源：Calculus — October Fast Track 2026–2027 Assessment Overview（批次吻合）
-- 合计 6+9+6+9+10+10+50 = 100%
--
-- 学期日历（与 4 科那份一致，UP Education 官方快捷课程日程）：
--   Term 1 = 2026 学期4  2026-10-05 起（10 周）
--   Term 2 = 2027 学期1  2027-01-25 起（10 周）
--   Term 3 = 2027 学期2  2027-04-19 起（9 周）
--   due_date = 学期开始日 + (周次-1)×7
--
-- 跨周节点取值规则（与已导的 4 科保持一致）：
--   · 考试跨周 → 取**第一周**（Final T3 W6–7 → W6）
--   · 项目/作业跨周 → 取**最后一周**当截止（Group Project T3 W3–4 → W4）
--   两种在 note 里都写明了原文区间。
--
-- 幂等：按 (program_subject_id, title) 查重。
-- ============================================================
DO $$
DECLARE
  t1_start date := DATE '2026-10-05';
  t2_start date := DATE '2027-01-25';
  t3_start date := DATE '2027-04-19';
  v_open date := DATE '2026-10-05';
  r record; v_ps int; v_mid int; v_due date;
  v_created int := 0; v_reused int := 0; v_sum numeric;
BEGIN
  SELECT id INTO v_ps FROM public.program_subjects
   WHERE program_id = 3 AND subject_name = 'Calculus';
  IF v_ps IS NULL THEN RAISE EXCEPTION '❌ 找不到 Fast-track 的 Calculus'; END IF;

  UPDATE public.program_subjects SET node_dates_intake = v_open WHERE id = v_ps;

  FOR r IN SELECT * FROM (VALUES
    ('Common Test 1',                1, 4,   6.0,'exam','secure',      false,'Algebra Skills；Exponential and Logarithmic Equations'),
    ('Common Test 2',                2, 3,   9.0,'exam','secure',      false,'Trigonometry；Functions and Graphs；Differentiation Skills（schedule 标 Topics 3,4,5）'),
    ('Common Test 3',                2, 7,   6.0,'exam','secure',      false,'Applications of Differentiation'),
    ('Common Test 4',                3, 2,   9.0,'exam','secure',      false,'Complex Numbers；Integration Skills（schedule 标 T7 and T8）'),
    ('Group Project',                3, 4,  10.0,'assignment','non_secure',false,'Applications of Integration；原文 3rd Term Weeks 3–4，取第 4 周为截止'),
    ('Flexible Learning Activities', NULL,NULL,10.0,'assignment','non_secure',false,'全课程每周；Education Perfect + PlayPosit；含笔记质量与完成情况'),
    ('Final Examination',            3, 6,  50.0,'exam','secure',      true, 'All topics；原文 3rd Term Weeks 6–7，取第 6 周')
  ) AS t(title, term, wk, weight, mtype, mode, major, note) LOOP

    v_due := CASE
      WHEN r.term IS NULL OR r.wk IS NULL THEN v_open
      WHEN r.term = 1 THEN t1_start + (r.wk - 1) * 7
      WHEN r.term = 2 THEN t2_start + (r.wk - 1) * 7
      ELSE                t3_start + (r.wk - 1) * 7
    END;

    SELECT id INTO v_mid FROM public.academic_milestones
     WHERE program_subject_id = v_ps AND title = r.title;
    IF v_mid IS NULL THEN
      INSERT INTO public.academic_milestones
        (program_subject_id, parent_id, milestone_type, title, due_date, weight_percent,
         mode, term_no, week_no, is_major, is_grade_recorded, note)
      VALUES (v_ps, NULL, r.mtype::milestone_type, r.title, v_due, r.weight,
              r.mode, r.term::smallint, r.wk::smallint, r.major, false, r.note);
      v_created := v_created + 1;
    ELSE
      v_reused := v_reused + 1;
    END IF;
  END LOOP;

  SELECT sum(weight_percent) INTO v_sum FROM public.academic_milestones
   WHERE program_subject_id = v_ps AND parent_id IS NULL;
  RAISE NOTICE '✅ Calculus 新建 % / 跳过 % ；顶层权重合计 = % %',
               v_created, v_reused, v_sum, CASE WHEN round(v_sum)=100 THEN '✅' ELSE '⚠️' END;
END $$;
