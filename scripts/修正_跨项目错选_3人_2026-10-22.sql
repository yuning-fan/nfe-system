-- ============================================================
-- 修正 3 名 Accelerated 学生「选到别的项目同名科目」的选课记录
--
-- 成因：学业跟进→选课与建档 的「选择选修课」下拉**没有按 program_id 过滤**，
--       把四个项目的选修课全列了出来，同名科目（Accounting / Economics / Art History
--       在多个项目里都有）在下拉里完全一样，学管改选课时点到了隔壁项目的那一条。
--       前端已修（AcademicTrack.tsx：按 enrollment.program_id 过滤 + 占位文案带上阶段名）。
--
-- 背景（用户说明）：这三人是**换课**，学管只改了选课没改课表。
--       所以选课里的科目名是对的、课表是旧的；本脚本只把科目指回本项目的同名科目，**不换科目**。
--
--   沈思妤(57)  Art History  预科-Fast-track → 预科-Accelerated
--   蔡佳虹(44)  Economics    预科-Standard   → 预科-Accelerated
--   高一菲(62)  Accounting   预科-Standard   → 已有正确的 Accelerated 同名选课，删除重复行
--
-- 通用写法：目标项目已有同名选课则删重复行，否则原地改指向。
-- 幂等：跑完再跑不会有任何变化（届时已无跨项目行）。
-- ============================================================
DO $$
DECLARE
  r record; v_target int; v_dup int; v_moved int := 0; v_deleted int := 0; v_grades int;
BEGIN
  -- 安全检查：这些错选的科目节点上如果已经录了成绩，改指向会让成绩与科目对不上，先拦下来
  SELECT count(*) INTO v_grades
    FROM grade_records g
    JOIN academic_milestones m ON m.id = g.milestone_id
    JOIN student_subject_selections s
      ON s.program_subject_id = m.program_subject_id
    JOIN student_enrollments e ON e.id = s.enrollment_id AND e.student_id = g.student_id
    JOIN program_subjects ps ON ps.id = s.program_subject_id
   WHERE ps.program_id <> e.program_id;
  IF v_grades > 0 THEN
    RAISE EXCEPTION '❌ 错选的科目上已有 % 条成绩，改指向会让成绩对不上科目，先人工处理', v_grades;
  END IF;

  FOR r IN
    SELECT s.id AS sel_id, e.program_id AS want_prog, ps.subject_name, ps.id AS wrong_ps,
           p.full_name, si.nfe_no
      FROM student_subject_selections s
      JOIN student_enrollments e ON e.id = s.enrollment_id
      JOIN program_subjects ps ON ps.id = s.program_subject_id
      JOIN profiles p ON p.id = e.student_id
      JOIN students_info si ON si.student_id = p.id
     WHERE ps.program_id <> e.program_id
     ORDER BY si.nfe_no
  LOOP
    SELECT id INTO v_target FROM program_subjects
     WHERE program_id = r.want_prog AND subject_name = r.subject_name;
    IF v_target IS NULL THEN
      RAISE EXCEPTION '❌ % 的项目下没有同名科目「%」', r.full_name, r.subject_name;
    END IF;

    SELECT s2.id INTO v_dup FROM student_subject_selections s2
      JOIN student_enrollments e2 ON e2.id = s2.enrollment_id
     WHERE s2.program_subject_id = v_target
       AND e2.student_id = (SELECT student_id FROM student_enrollments WHERE id =
            (SELECT enrollment_id FROM student_subject_selections WHERE id = r.sel_id))
     LIMIT 1;

    IF v_dup IS NOT NULL THEN
      DELETE FROM student_subject_selections WHERE id = r.sel_id;
      v_deleted := v_deleted + 1;
      RAISE NOTICE '🗑  % (NFE-%) 的「%」已有本项目的正确选课，删除重复行 id=%',
                   r.full_name, lpad(r.nfe_no::text,6,'0'), r.subject_name, r.sel_id;
    ELSE
      UPDATE student_subject_selections
         SET program_subject_id = v_target
       WHERE id = r.sel_id;
      v_moved := v_moved + 1;
      RAISE NOTICE '✅ % (NFE-%) 的「%」已指回本项目 (ps % → %)',
                   r.full_name, lpad(r.nfe_no::text,6,'0'), r.subject_name, r.wrong_ps, v_target;
    END IF;
  END LOOP;

  RAISE NOTICE '——— 改指向 % 条 / 删重复 % 条 ———', v_moved, v_deleted;
END $$;
