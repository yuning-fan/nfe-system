-- ============================================================
-- Fast-track（program_id=3）学业节点：Physics
--
-- ⚠️ 数据源是 **April Fast Track 2025** 的 Assessment Overview，不是 10 月批当期文件。
--    用户确认「2025 和现在的 outline 一样」，照导。
--    旁证：系统里 **预科-Standard 的 Physics** 用的是同一套命名与 topic 对应
--    （Test 0 Topic 1 / Test 1 Topic 1 / Test 2 Topic 2 / Test 3 Topics 3&4 / Practical Investigation），
--    与本大纲同源；而 Accelerated 的 Physics 是另一套（CT1–3 + Group Video + Infographic）。
--    每条 note 都标了来源，拿到 10 月批正式大纲后可据此复核。
--
-- 合计 1 + 1.5 + 2.5 + 5 + 5 + 5 + 20 + 10 + 50 = 100%
--
-- 学期日历与跨周取值规则同前（考试跨周取第一周，项目跨周取最后一周）。
-- 幂等：按 (program_subject_id, title) 查重。
-- ============================================================
DO $$
DECLARE
  t1_start date := DATE '2026-10-05';
  t2_start date := DATE '2027-01-25';
  t3_start date := DATE '2027-04-19';
  v_open date := DATE '2026-10-05';
  v_src text := '【来源：April Fast Track 2025 大纲，待 10 月批正式文件复核】';
  r record; v_ps int; v_mid int; v_due date;
  v_created int := 0; v_reused int := 0; v_sum numeric;
BEGIN
  SELECT id INTO v_ps FROM public.program_subjects
   WHERE program_id = 3 AND subject_name = 'Physics';
  IF v_ps IS NULL THEN RAISE EXCEPTION '❌ 找不到 Fast-track 的 Physics'; END IF;

  UPDATE public.program_subjects SET node_dates_intake = v_open WHERE id = v_ps;

  FOR r IN SELECT * FROM (VALUES
    ('Test 0',                   1, 3,   1.0,'exam','secure',          false,'Topic 1 的 introductory concepts（Kinematics）；paper-based'),
    ('Test 1',                   1, 5,   1.5,'exam','secure',          false,'Topic 1 Kinematics；paper-based'),
    ('Test 2',                   1, 8,   2.5,'exam','secure',          false,'Topic 2 Newton''s Laws and their Application；paper-based'),
    ('Test 3',                   2, 4,   5.0,'exam','secure',          false,'Topics 3 & 4 Circular Motion / Work and Energy；paper-based'),
    ('Test 4',                   3, 1,   5.0,'exam','secure',          false,'Topics 5 & 6 Linear Momentum / Mechanical Waves；paper-based'),
    ('Test 5',                   3, 6,   5.0,'exam','secure',          false,'Topics 7 & 8 Electromagnetic Waves / Direct Current Electricity；paper-based'),
    ('Independent Learning',     NULL,NULL,20.0,'assignment','non_secure',false,'三个 Term 全程；Topics 1–9；通过 Teams 完成；非传统考试'),
    ('Practical Investigation',  2, 6,  10.0,'report_due','non_secure',false,'Laboratory Equipment & Booklet，Topic A；原文 Term 2 Weeks 3 和 6，取第 6 周为截止'),
    ('Final Examination',        3, 8,  50.0,'exam','secure',          true, 'Topics 1–9；2 小时笔试；原文 Term 3 Weeks 8–9，取第 8 周')
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
              r.mode, r.term::smallint, r.wk::smallint, r.major, false, r.note || '　' || v_src);
      v_created := v_created + 1;
    ELSE
      v_reused := v_reused + 1;
    END IF;
  END LOOP;

  SELECT sum(weight_percent) INTO v_sum FROM public.academic_milestones
   WHERE program_subject_id = v_ps AND parent_id IS NULL;
  RAISE NOTICE '✅ Physics 新建 % / 跳过 % ；顶层权重合计 = % %',
               v_created, v_reused, v_sum, CASE WHEN round(v_sum)=100 THEN '✅' ELSE '⚠️' END;
END $$;
