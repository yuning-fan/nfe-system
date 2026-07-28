-- ============================================================
-- 陈亦凡 成绩导入 · 第0步：预检（只读，不改任何数据）
-- 目的：确认 学生唯一性 / 科目对得上 / 已有节点与成绩，避免重复插入
-- ============================================================

-- 【A】学生是否唯一
select id, full_name, role, status from public.profiles
where full_name = '陈亦凡' and role = 'student';

-- 【B】他报的项目 + 该项目下的全部科目（拿 program_subject_id）
select se.id as enrollment_id, pr.name as "项目", se.start_date as "入学",
       ps.id as "科目ID", ps.subject_name as "科目名", ps.pass_mark as "过线分"
from public.student_enrollments se
join public.profiles p       on p.id = se.student_id
join public.programs pr      on pr.id = se.program_id
join public.program_subjects ps on ps.program_id = se.program_id
where p.full_name = '陈亦凡'
order by ps.subject_name;

-- 【C】这些科目下【已存在】的考核节点（关键：看是否已建过，避免重复）
select ps.subject_name as "科目", am.id as "节点ID", am.parent_id as "父节点",
       am.title as "节点名", am.weight_percent as "权重%", am.milestone_type as "类型",
       am.term_no as "学期", am.due_date as "截止"
from public.academic_milestones am
join public.program_subjects ps on ps.id = am.program_subject_id
where ps.program_id in (
  select se.program_id from public.student_enrollments se
  join public.profiles p on p.id = se.student_id where p.full_name = '陈亦凡')
order by ps.subject_name, am.parent_id nulls first, am.term_no, am.due_date;

-- 【D】各科顶层权重合计（应=100；不足说明节点没建全）
select ps.subject_name as "科目",
       sum(am.weight_percent) filter (where am.parent_id is null) as "顶层权重合计",
       count(*) filter (where am.parent_id is null) as "顶层节点数"
from public.academic_milestones am
join public.program_subjects ps on ps.id = am.program_subject_id
where ps.program_id in (
  select se.program_id from public.student_enrollments se
  join public.profiles p on p.id = se.student_id where p.full_name = '陈亦凡')
group by ps.subject_name order by ps.subject_name;

-- 【E】陈亦凡【已录】的成绩（避免重复录入）
select ps.subject_name as "科目", am.title as "节点", g.score as "分数",
       g.status as "状态", g.score_type as "类型", g.recorded_at as "录入时间"
from public.grade_records g
join public.profiles p on p.id = g.student_id
left join public.program_subjects ps on ps.id = g.program_subject_id
left join public.academic_milestones am on am.id = g.milestone_id
where p.full_name = '陈亦凡'
order by ps.subject_name, am.due_date;
