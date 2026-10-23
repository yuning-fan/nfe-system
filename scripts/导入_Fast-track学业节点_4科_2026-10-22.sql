-- ============================================================
-- Fast-track（program_id=3）学业节点：Statistics / Accounting / Economics / EAP
-- 数据源：用户提供的 October Fast Track 各科 Assessment Overview 汇总
--
-- ⚠️ 运行前必须填下面三个学期开始日（第 1 周的周一），否则脚本会主动中止。
--    课程学期 ↔ 日历学期：Term 1 = T4 2026，Term 2 = T1 2027，Term 3 = T2 2027。
--    （Statistics 原文用日历学期号 T4/T1/T2，其余三科用课程学期号 Term 1/2/3，
--      本脚本统一成课程学期 1/2/3。）
--
-- 口径说明：
--   · term_no + week_no 存「课程学期 + 学期内周次」，页面显示成 T1 W5，与原文一致。
--     注意与 Accelerated 那批不同：那批 term_no 留空、week_no 存的是连续课程周（1–17）。
--     Fast-track 跨三个学期，按学期存更贴原始大纲。
--   · due_date = 学期开始日 + (周次-1)×7；持续性节点（每周/全课程）无周次，取开课日。
--   · program_subjects.node_dates_intake 标成 2026-10-05，表示这批日期对应 10 月批次。
--
-- 用户已决定的两处改动：
--   1. Accounting「Processing Transactions Test」占比由大纲的 25% 改为 5%
--      —— 原表 8 项合计 120%，改后正好 100%。
--   2. EAP 只导对得上的部分：6 个顶层（合计 95%，页面会标⚠️）
--      + Academic Reading and Summary Writing Project 的 4 个子项（合计 100% ✓）；
--      Report Writing Project 的 5 个子项（原文合计仅 90%）**本次不建**。
--
-- 幂等：按 (program_subject_id, title) 查重，已存在则跳过。
-- ============================================================
DO $$
DECLARE
  -- 学期日历取自 UP Education 官方《2026/2027 预科证书 标准课程&快捷课程》日程图
  -- 快捷课程共 3 个学期；本批次 2026 年 10 月开学：
  --   Term 1 = 2026 学期4   上课 10/05–12/11（10 周）
  --   Term 2 = 2027 学期1   上课 01/25–04/02（10 周）
  --   Term 3 = 2027 学期2   上课 04/19–06/18（9 周）
  -- 三个日期均为该学期第 1 周的周一；各学期周数与大纲用到的最大周次吻合（10/10/8）。
  t1_start date := DATE '2026-10-05';
  t2_start date := DATE '2027-01-25';
  t3_start date := DATE '2027-04-19';
  v_open date := DATE '2026-10-05';   -- 开课日，持续性节点用

  r record; v_ps int; v_pid int; v_mid int;
  v_due date; v_created int := 0; v_reused int := 0;
BEGIN
  IF t1_start IS NULL OR t2_start IS NULL OR t3_start IS NULL THEN
    RAISE EXCEPTION '❌ 三个学期开始日未填，拒绝执行。填好 t1_start / t2_start / t3_start 再跑。';
  END IF;

  -- 标记这批节点日期对应哪个入学批次
  UPDATE public.program_subjects SET node_dates_intake = v_open
   WHERE program_id = 3
     AND subject_name IN ('Statistics','Accounting','Economics','EAP (English for Academic Purposes)');

  ---------------------------------------------------------------
  -- 顶层节点
  ---------------------------------------------------------------
  FOR r IN SELECT * FROM (VALUES
    -- 科目, 标题, 学期, 周次, 权重(占总评), 类型, mode, 是否大考, 备注
    ('Statistics','Common Test 1',                 1, 4,    5.0,'exam','secure',      false,'Summary Statistics, Data Display'),
    ('Statistics','Common Test 2',                 1, 10,   7.5,'exam','secure',      false,'Arrangements and Selections, Probability, Expectation Algebra'),
    ('Statistics','Common Test 3',                 2, 5,    7.5,'exam','secure',      false,'Binomial / Poisson / Normal Distribution'),
    ('Statistics','Common Test 4',                 2, 10,   7.5,'exam','secure',      false,'Sampling Methods, Sampling Distributions, Confidence Intervals'),
    ('Statistics','Group Project',                 3, 3,   12.5,'assignment','non_secure',false,'Bivariate Data'),
    ('Statistics','Flexible Learning Activities',  NULL,NULL,10.0,'assignment','non_secure',false,'每周；All topics；PlayPosit + Education Perfect'),
    ('Statistics','Final Examination',             3, 6,   50.0,'exam','secure',      true, 'All topics；原文为 T2 Week 6–7，取第 6 周'),

    ('Accounting','Flexible Learning Activities',  NULL,NULL, 5.0,'assignment','non_secure',false,'全课程每周；PlayPosit 视频 + Nearpod 预学习'),
    ('Accounting','Online Tests',                  NULL,NULL, 5.0,'exam','non_secure',false,'全课程；Blackboard open-book；覆盖当前教学内容'),
    ('Accounting','Reading Review',                1, 5,   10.0,'assignment','secure', false,'Accounting Principles，基于 newspaper article'),
    ('Accounting','Processing Transactions Test',  2, 2,    5.0,'exam','secure',      false,'⚠️ 大纲写 25%，经确认改为 5%（原 8 项合计 120%）'),
    ('Accounting','Financial Reporting Test',      2, 7,   10.0,'exam','secure',      false,'Balance Day Adjustments'),
    ('Accounting','Group Presentation',            3, 1,   10.0,'assignment','non_secure',false,'Decision Making & Cost-Volume-Profit Analysis'),
    ('Accounting','Cash Flow Statement Test',      3, 5,    5.0,'exam','secure',      false,'Cash Flow Statement, Reconciliation Statement'),
    ('Accounting','External Examination',          3, 8,   50.0,'exam','secure',      true, '原文 Week 8/9，取第 8 周；不含 Accounting Principles / Decision Making / CVP'),

    ('Economics','Common Test 1',                  1, 4,    5.0,'exam','secure',      false,'Topics A1–A3'),
    ('Economics','Common Test 2',                  2, 4,   10.0,'exam','secure',      false,'Topics A4–A9；⚠️ schedule 写 T2 W2，按 Overview 取 W4'),
    ('Economics','Group Presentation / Research',  2, 7,   15.0,'assignment','non_secure',false,'Topics B1–B5；⚠️ schedule 写 T2 W6 due，按 Overview 取 W7'),
    ('Economics','Research Essay Test',            3, 3,   10.0,'exam','secure',      false,'Topics C1–C3；⚠️ schedule 写 T3 W1，按 Overview 取 W3'),
    ('Economics','Common Test 3',                  3, 6,    5.0,'exam','secure',      false,'Topics C1–C5；⚠️ schedule 写 T3 W4，按 Overview 取 W6'),
    ('Economics','Flexible Learning Activities',   NULL,NULL, 5.0,'assignment','non_secure',false,'全课程；All topics；PlayPosit'),
    ('Economics','Final Examination',              3, 8,   50.0,'exam','secure',      true, 'Topics A and C；原文 W8–9 取第 8 周；⚠️ schedule 写 T3 W6–7'),

    ('EAP (English for Academic Purposes)','Common Test 1',                                 1, 3,  10.0,'exam','secure',      false,'Academic Writing / Reading'),
    ('EAP (English for Academic Purposes)','Academic Reading and Summary Writing Project',  1, 9,  15.0,'assignment','non_secure',false,'T1 W3–W9；子项按占父节点%计'),
    ('EAP (English for Academic Purposes)','Common Test 2',                                 1, 10, 10.0,'exam','secure',      false,'阅读与摘要写作'),
    ('EAP (English for Academic Purposes)','Report Writing Project',                        2, 8,  20.0,'assignment','non_secure',false,'T2 W1–W8；⚠️ 原文 5 个子项合计仅 90%，子项待核未建'),
    ('EAP (English for Academic Purposes)','Academic Interview',                            2, 9,  10.0,'assignment','secure', false,'反思 report writing'),
    ('EAP (English for Academic Purposes)','Examination',                                   3, 6,  30.0,'exam','secure',      true, '阅读 passage 并写 text 回应作者观点')
  ) AS t(subj, title, term, wk, weight, mtype, mode, major, note) LOOP

    SELECT id INTO v_ps FROM public.program_subjects
     WHERE program_id = 3 AND subject_name = r.subj;
    IF v_ps IS NULL THEN RAISE EXCEPTION '❌ 找不到 Fast-track 科目「%」', r.subj; END IF;

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

  ---------------------------------------------------------------
  -- 子项：EAP · Academic Reading and Summary Writing Project（占父节点%，合计 100）
  ---------------------------------------------------------------
  FOR r IN SELECT * FROM (VALUES
    ('Quiz 1',        1, 3, 10.0,'exam','non_secure'),
    ('Quiz 2',        1, 5, 25.0,'exam','non_secure'),
    ('Draft',         1, 7, 20.0,'assignment','non_secure'),
    ('Final Summary', 1, 9, 45.0,'assignment','non_secure')
  ) AS t(title, term, wk, weight, mtype, mode) LOOP

    SELECT id INTO v_ps FROM public.program_subjects
     WHERE program_id = 3 AND subject_name = 'EAP (English for Academic Purposes)';
    SELECT id INTO v_pid FROM public.academic_milestones
     WHERE program_subject_id = v_ps AND title = 'Academic Reading and Summary Writing Project';
    IF v_pid IS NULL THEN RAISE EXCEPTION '❌ 找不到父节点 Academic Reading and Summary Writing Project'; END IF;

    v_due := t1_start + (r.wk - 1) * 7;

    SELECT id INTO v_mid FROM public.academic_milestones
     WHERE program_subject_id = v_ps AND title = r.title AND parent_id = v_pid;
    IF v_mid IS NULL THEN
      INSERT INTO public.academic_milestones
        (program_subject_id, parent_id, milestone_type, title, due_date, weight_percent,
         mode, term_no, week_no, is_major, is_grade_recorded, note)
      VALUES (v_ps, v_pid, r.mtype::milestone_type, r.title, v_due, r.weight,
              r.mode, r.term::smallint, r.wk::smallint, false, false,
              '占父节点 ' || r.weight || '%；周次为推算，待核');
      v_created := v_created + 1;
    ELSE
      v_reused := v_reused + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ 节点新建 % / 已存在跳过 %', v_created, v_reused;

  FOR r IN
    SELECT ps.subject_name, sum(m.weight_percent) w
      FROM public.program_subjects ps
      JOIN public.academic_milestones m ON m.program_subject_id = ps.id AND m.parent_id IS NULL
     WHERE ps.program_id = 3 GROUP BY ps.subject_name ORDER BY ps.subject_name
  LOOP
    RAISE NOTICE '% 顶层权重合计 = %  %', r.subject_name, r.w,
      CASE WHEN round(r.w) = 100 THEN '✅' ELSE '⚠️ 不等于 100' END;
  END LOOP;
END $$;
