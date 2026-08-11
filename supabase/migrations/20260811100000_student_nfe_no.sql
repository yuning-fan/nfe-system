-- ============================================================
-- 学号（NFE 编号）：系统内部管理用的顺序编号
-- 语义：号码 = 进入项目的先后，与退出时间无关（退出者也占号，号码永不回收）
-- 展示：前端格式化为 NFE-000001；库里只存整数，便于排序与递增
-- ============================================================

alter table public.students_info add column if not exists nfe_no int;

comment on column public.students_info.nfe_no is
  'NFE 内部学号，按进入项目先后编；展示为 NFE-000001。号码永久唯一、不回收、不重排。';

-- 唯一约束：允许多行为 NULL（尚未编号），但已编号的不得重复
create unique index if not exists uq_students_info_nfe_no
  on public.students_info(nfe_no) where nfe_no is not null;

-- 序列：新建学生自动取下一号，避免前端算 max+1 在并发下撞号
create sequence if not exists public.students_nfe_no_seq as int;

alter table public.students_info
  alter column nfe_no set default nextval('public.students_nfe_no_seq');

-- 让序列归序列所有权，删列时一并清理
alter sequence public.students_nfe_no_seq owned by public.students_info.nfe_no;
