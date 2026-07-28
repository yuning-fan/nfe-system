-- ============================================================
-- 更新 4 名学生生日（会改数据！）按中文名精确匹配。
-- ⚠️ 注意：这批生日与之前 degree 导入表里的值不一致，尤其张铄相差 2 年，
--          执行前请再核对一次。
-- 安全：只改这 4 人，事务包裹，最后打印实际更新条数——不是 4 就 rollback。
-- ============================================================
begin;

with fixes(cn_name, dob) as (values
  ('陈几何', date '2009-08-03'),
  ('丁可莹', date '2009-01-04'),
  ('沈永欢', date '2009-04-06'),
  ('张铄',   date '2009-01-09')
)
update public.students_info s
set date_of_birth = f.dob
from fixes f
join public.profiles p on trim(p.full_name) = f.cn_name and p.role = 'student'
where s.student_id = p.id;

-- 核对结果
select p.full_name as "学生", s.date_of_birth as "更新后生日"
from public.students_info s
join public.profiles p on p.id = s.student_id
where trim(p.full_name) in ('陈几何','丁可莹','沈永欢','张铄')
order by p.full_name;

commit;
-- 若上面不是 4 行 / 日期不对，把 commit; 换成 rollback; 重查。
