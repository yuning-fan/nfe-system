-- ============================================================
-- Mathematics 剩余考核节点导入（依官方 Assessment Overview）
-- 只建节点、不录分数——这些是尚未发生的考核。
-- 幂等：按「科目+标题」查重，已存在则跳过。
--
-- ⚠️ 影响面：节点挂在「预科-Standard」的 Mathematics 科目上，
--            该科目下所有学生（陈亦凡、陈祺…）都会看到这些节点。
--
-- 权重配平：已有 CT1(6) + CT2(9) + FLA(5) = 20%
--           本次   CT3(6) + CT4(9) + Group Project(10)
--                  + Flexible Learning(5) + Final Exam(50) = 80%
--           ─────────────────────────────────────────  合计 100% ✅
-- 注：term_no 仅在官方表明确标注「Term 2」的行填写，其余留空（表中未注明）。
-- ============================================================
DO $$
DECLARE
  v_program int := 1;
  v_ps int; v_mid int; r record;
  v_created int := 0; v_reused int := 0;
  v_sum numeric;
BEGIN
  SELECT id INTO v_ps FROM public.program_subjects
   WHERE program_id = v_program AND subject_name ILIKE '%Mathematics%' ORDER BY id LIMIT 1;
  IF v_ps IS NULL THEN RAISE EXCEPTION '❌ 找不到 Mathematics 科目'; END IF;
  RAISE NOTICE '科目 Mathematics id=%', v_ps;

  FOR r IN
    SELECT * FROM (VALUES
      -- 标题, 权重%, 类型, mode, term, week, 是否大考
      ('Common Test 3',        6.0,  'exam',      'secure',     NULL, 4,    false),
      ('Common Test 4',        9.0,  'exam',      'secure',     NULL, 9,    false),
      ('Group Project',       10.0,  'assignment','non_secure', 2,    2,    false),
      ('Flexible Learning',    5.0,  'assignment','non_secure', NULL, NULL, false),
      ('Final Examination',   50.0,  'exam',      'secure',     2,    8,    true)
    ) AS t(title, weight, mtype, mode, term_no, week_no, is_major)
  LOOP
    SELECT id INTO v_mid FROM public.academic_milestones
     WHERE program_subject_id = v_ps AND title = r.title LIMIT 1;

    IF v_mid IS NULL THEN
      INSERT INTO public.academic_milestones
        (program_subject_id, milestone_type, title, due_date, weight_percent,
         mode, term_no, week_no, is_major, is_grade_recorded)
      VALUES (v_ps, r.mtype::milestone_type, r.title, DATE '2026-01-01', r.weight,
              r.mode, r.term_no::smallint, r.week_no::smallint, r.is_major, false);
      v_created := v_created + 1;
      RAISE NOTICE '  ✅ 新建 %  权重 %', r.title, r.weight;
    ELSE
      v_reused := v_reused + 1;
      RAISE NOTICE '  ⏭  已存在 %', r.title;
    END IF;
  END LOOP;

  SELECT sum(weight_percent) INTO v_sum FROM public.academic_milestones
   WHERE program_subject_id = v_ps AND parent_id IS NULL;
  RAISE NOTICE '✅ 完成：新建 % / 跳过 % ；Mathematics 顶层权重合计 = % (应为 100)',
               v_created, v_reused, v_sum;
  IF round(v_sum) <> 100 THEN
    RAISE NOTICE '⚠️ 权重合计不等于 100，请检查节点配置';
  END IF;
END $$;

-- ===== 自查：Mathematics 全部节点 =====
select am.id as "节点ID", am.title as "节点", am.weight_percent as "权重%",
       am.mode as "模式", am.term_no as "学期", am.week_no as "周",
       am.is_major as "大考", am.due_date as "日期"
from public.academic_milestones am
join public.program_subjects ps on ps.id = am.program_subject_id
where ps.program_id = 1 and ps.subject_name ilike '%Mathematics%'
order by coalesce(am.term_no,0), coalesce(am.week_no,0), am.id;

-- ===== 自查：受影响学生的 Mathematics 达标预测 =====
select p.full_name as "学生",
       sum(am.weight_percent) as "已评权重",
       round(sum(am.weight_percent*g.score)/100, 2) as "已得加权分",
       ps.pass_mark as "过线",
       round((ps.pass_mark - sum(am.weight_percent*g.score)/100)
             / nullif(100 - sum(am.weight_percent),0) * 100, 1) as "剩余需均分"
from public.grade_records g
join public.profiles p on p.id = g.student_id
join public.program_subjects ps on ps.id = g.program_subject_id
join public.academic_milestones am on am.id = g.milestone_id
where ps.program_id = 1 and ps.subject_name ilike '%Mathematics%' and am.weight_percent > 0
group by p.full_name, ps.pass_mark
order by p.full_name;
