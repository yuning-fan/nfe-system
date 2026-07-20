-- ============================================================
-- 升学信息导入 · 第 0 步：姓名格式诊断（只读，不改任何数据）
-- 目的：搞清楚系统里学生姓名到底长什么样，才能定匹配方式。
-- 用法：整段贴进 Supabase SQL Editor 运行，把结果发回给我。
-- ============================================================

-- (1) 概览：english_name 到底填了没有
select
  count(*)                                          as "学生总数",
  count(s.english_name)                             as "english_name 非空",
  count(*) filter (where trim(coalesce(s.english_name,'')) = '') as "english_name 空的"
from public.students_info s;

-- (2) 明细：中文名 + 英文名（这份发我，我来做姓名映射）
select
  p.full_name      as "中文名",
  s.english_name   as "英文名",
  s.school_name    as "学校"
from public.students_info s
join public.profiles p on p.id = s.student_id
order by p.full_name;
