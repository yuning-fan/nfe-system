-- ============================================================
-- 导出：目前所有已录分学生的成绩，按考核节点分组，节点内分数由低到高
--
-- 口径：
--   · 一行 = 一条 grade_records（某学生在某节点的一次成绩）
--   · 排序：项目 → 科目 → 节点 → 分数升序（同分并列同名次，用 rank()）
--   · 「名次」是节点内由低到高的序号，1 = 该节点最低分 —— 便于一眼挑出垫底的人
--   · 子项节点显示成「父节点 › 子项」，避免同名子项（如多门课都有 Common Test 1）分不清
--   · 过线线取 program_subjects.pass_mark（EAP=65，其余=50）
--   · status='missed' 为缺考，库里按 0 分记，单独标出来别当成考砸了
--   · 节点均分 / 录分人数 跟在每行，方便看这个分在本节点处于什么位置
-- ============================================================
WITH g AS (
  SELECT
    gr.id,
    gr.student_id,
    gr.score,
    gr.status,
    gr.note,
    gr.recorded_at,
    m.id            AS milestone_id,
    m.weight_percent,
    m.milestone_type,
    m.is_major,
    COALESCE(pm.title || ' › ', '') || m.title AS node_full,
    ps.subject_name,
    ps.pass_mark,
    pr.name         AS program_name
  FROM public.grade_records gr
  JOIN public.academic_milestones m  ON m.id  = gr.milestone_id
  LEFT JOIN public.academic_milestones pm ON pm.id = m.parent_id
  JOIN public.program_subjects ps     ON ps.id = m.program_subject_id
  JOIN public.programs pr             ON pr.id = ps.program_id
  WHERE gr.score IS NOT NULL
)
SELECT
  g.program_name                                   AS "项目",
  g.subject_name                                   AS "科目",
  g.node_full                                      AS "考核节点",
  CASE WHEN g.weight_percent IS NULL THEN ''
       ELSE g.weight_percent || '%' END            AS "权重",
  RANK() OVER (PARTITION BY g.milestone_id ORDER BY g.score)        AS "名次(低→高)",
  COUNT(*)      OVER (PARTITION BY g.milestone_id)                  AS "本节点人数",
  -- 学号库里存整数，统一格式化成 NFE-000001（与页面/其它导出一致）
  CASE WHEN si.nfe_no IS NULL THEN ''
       ELSE 'NFE-' || LPAD(si.nfe_no::text, 6, '0') END AS "学号",
  p.full_name                                      AS "姓名",
  g.score                                          AS "分数",
  g.pass_mark                                      AS "过线分",
  CASE WHEN g.status = 'missed' THEN '缺考'
       WHEN g.score >= g.pass_mark THEN '过线'
       ELSE '未过线' END                            AS "是否过线",
  ROUND(AVG(g.score) OVER (PARTITION BY g.milestone_id), 1)         AS "本节点均分",
  ROUND(g.score - AVG(g.score) OVER (PARTITION BY g.milestone_id), 1) AS "与均分差",
  TO_CHAR(g.recorded_at AT TIME ZONE 'Pacific/Auckland', 'YYYY-MM-DD') AS "录入日期",
  COALESCE(g.note, '')                             AS "备注"
FROM g
JOIN public.profiles p       ON p.id = g.student_id
LEFT JOIN public.students_info si ON si.student_id = g.student_id
ORDER BY
  g.program_name,
  g.subject_name,
  g.node_full,
  g.score ASC,          -- 节点内由低到高
  p.full_name;
