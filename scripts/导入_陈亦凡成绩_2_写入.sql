-- ============================================================
-- 陈亦凡 成绩导入 · 第2步：写入
-- 策略：节点(academic_milestones)按「科目+标题」查重，缺失才建；
--       成绩(grade_records)按「学生+节点」先删后插 → 可重复运行不产生重复。
-- 0分记为 status='missed'（缺考）；物理 Test 0 两项 weight_percent=0（诊断，不进总评）。
-- ⚠️ due_date 为 NOT NULL，本脚本用占位日期 2026-01-01，导入后请按实际考试日期订正（见文件末尾模板）。
-- 先跑 导入_陈亦凡成绩_0_预检.sql 确认无误再执行本脚本。
-- ============================================================
DO $$
DECLARE
  v_name text := '陈亦凡';
  v_student uuid;
  v_ps int;
  v_mid int;
  r record;
  v_created int := 0; v_reused int := 0; v_graded int := 0;
BEGIN
  SELECT id INTO v_student FROM public.profiles
   WHERE full_name = v_name AND role = 'student' LIMIT 1;
  IF v_student IS NULL THEN RAISE EXCEPTION '找不到学生 %', v_name; END IF;

  FOR r IN
    SELECT * FROM (VALUES
      -- 科目关键词, 节点标题, 权重%, 分数, 状态, 类型
      ('EAP',  'Assessment 1 · Common Test',                        5.0,  60.00,'graded','exam'),
      ('EAP',  'Assessment 2 · Explanation Writing',               10.0,  53.00,'graded','assignment'),
      ('EAP',  'Assessment 3 · Listening',                          5.0,  86.00,'graded','exam'),
      ('EAP',  'Assessment 4 · Common Test',                        5.0,  63.00,'graded','exam'),
      ('EAP',  'Assessment 5 · Summary Writing Project',           15.0,  40.00,'graded','assignment'),

      ('Econ', '1 Common Test 1',                                   5.0,  28.00,'graded','exam'),
      ('Econ', '2 Common Test 2',                                  10.0,  77.00,'graded','exam'),
      ('Econ', '4 Group Presentation',                             15.0,  72.00,'graded','assignment'),

      ('Math', '1 Common Test 1 Math',                              6.0,   0.00,'missed','exam'),
      ('Math', '2 Common Test 2 Mathematics',                       9.0,  72.00,'graded','exam'),
      ('Math', 'FLA Assignment',                                    5.0,  94.00,'graded','assignment'),

      ('Physic','UoA JAN Physics Test 0 Topic 1 Part A (19分制)',   0.0,  76.32,'graded','exam'),
      ('Physic','UoA JAN Physics Test 0 Topic 1 Part B (27分制)',   0.0,  48.15,'graded','exam'),
      ('Physic','4. UoA Jan Physics Test 1 Topic 1',                2.0,  60.00,'graded','exam'),
      ('Physic','5. UoA Jan Physics Test 2 Topic 2',                3.0,  65.00,'graded','exam'),
      ('Physic','6. UoA Jan Physics Test 3 Topics 3&4',             6.0,  79.00,'graded','exam'),
      ('Physic','10. UoA Jan Physics Assignments',                 11.0,  58.00,'graded','assignment'),
      ('Physic','11. UoA Jan Physics Practical Investigation',      5.0,   0.00,'missed','assignment'),

      ('Stat', 'Common Test 1',                                     5.0,  59.00,'graded','exam'),
      ('Stat', 'Common Test 2',                                     7.5,  58.00,'graded','exam'),
      ('Stat', 'Common Test 3',                                     7.5,  43.00,'graded','exam')
    ) AS t(subj_kw, title, weight, score, st, mtype)
  LOOP
    -- 定位该生所报项目下的科目
    SELECT ps.id INTO v_ps
    FROM public.student_enrollments se
    JOIN public.program_subjects ps ON ps.program_id = se.program_id
    WHERE se.student_id = v_student AND ps.subject_name ILIKE '%'||r.subj_kw||'%'
    ORDER BY ps.id LIMIT 1;

    IF v_ps IS NULL THEN
      RAISE NOTICE '⚠️ 跳过：找不到科目 [%]（节点：%）', r.subj_kw, r.title;
      CONTINUE;
    END IF;

    -- 节点查重：同科目同标题则复用
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

    -- 成绩：先删后插（幂等）
    DELETE FROM public.grade_records
     WHERE student_id = v_student AND milestone_id = v_mid;

    INSERT INTO public.grade_records
      (student_id, program_subject_id, milestone_id, score, score_type, status, recorded_at)
    VALUES (v_student, v_ps, v_mid, r.score, 'final', r.st, now());
    v_graded := v_graded + 1;
  END LOOP;

  RAISE NOTICE '✅ 完成：新建节点 % 个，复用节点 % 个，写入成绩 % 条', v_created, v_reused, v_graded;
END $$;

-- ===== 写入后自查：看成绩单 =====
select ps.subject_name as "科目", am.title as "节点", am.weight_percent as "权重%",
       g.score as "分数", g.status as "状态"
from public.grade_records g
join public.profiles p on p.id = g.student_id
join public.program_subjects ps on ps.id = g.program_subject_id
join public.academic_milestones am on am.id = g.milestone_id
where p.full_name = '陈亦凡'
order by ps.subject_name, am.weight_percent desc, am.title;

-- ===== 各科已出成绩加权情况 =====
select ps.subject_name as "科目",
       sum(am.weight_percent) as "已出权重",
       round(sum(am.weight_percent * g.score) / nullif(sum(am.weight_percent),0), 3) as "已出加权均分",
       round(sum(am.weight_percent * g.score) / 100, 3) as "已计入总评分",
       ps.pass_mark as "过线分"
from public.grade_records g
join public.profiles p on p.id = g.student_id
join public.program_subjects ps on ps.id = g.program_subject_id
join public.academic_milestones am on am.id = g.milestone_id
where p.full_name = '陈亦凡' and am.weight_percent > 0
group by ps.subject_name, ps.pass_mark
order by ps.subject_name;

-- ===== 订正考试日期模板（把占位日期改成实际日期）=====
-- update public.academic_milestones set due_date = DATE '2026-03-15'
--  where title = 'Assessment 1 · Common Test'
--    and program_subject_id = (select id from public.program_subjects where subject_name ilike '%EAP%' limit 1);
