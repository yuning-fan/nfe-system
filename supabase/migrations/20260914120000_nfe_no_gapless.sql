-- ============================================================
-- NFE 学号改为「无空号」分配：序列默认值 → BEFORE INSERT 触发器（max+1，咨询锁串行）
--
-- 根因（2026-09-14 排查）：
--   nfe_no 原先 default nextval('students_nfe_no_seq')。Postgres 在 INSERT … ON CONFLICT
--   检测冲突之前就先求默认值，所以对「已存在的学生」做 upsert 也会推进序列；序列又不随事务回滚。
--   建档时 profiles 触发器先插一行（取号 N），staff-admin 边函数紧接着 upsert 补字段（烧 N+1）；
--   前端 updateStudent 也是 upsert，每保存一次档案再烧一个。70–72、74–76、78 均由此而来，
--   与 audit_logs 逐条对应。
--
-- 根治：
--   1) 去掉序列默认值、删序列，改由触发器在插入时取 max+1：
--      - upsert 冲突转更新的行虽然也会跑触发器，但 max+1 无副作用，不消耗任何东西；
--      - 失败/回滚的插入同样不留痕，下次仍取到同一个号；
--      - pg_advisory_xact_lock 串行化取号，并发建档不撞号；
--      - SECURITY DEFINER：取 max 不受 RLS 可见范围影响，否则受限角色插入会算错号、撞唯一索引。
--   2) 改号保护：已编号的行不可被改号（静默保持原号）。
--      必要性：BEFORE INSERT 触发器改写的值会进入 EXCLUDED；updateStudent 把表单字段原样
--      塞进 upsert，若哪天 payload 带了 nfe_no: null，DO UPDATE SET nfe_no = EXCLUDED.nfe_no
--      就会把原号覆盖成 max+1。
--      确需人工改号时，在事务内先 set local nfe.allow_renumber = 'on'。
--
-- 仍会出现空号的唯一途径：直接删除某个学生的 students_info 行（系统界面无此入口）。
-- ============================================================

alter table public.students_info alter column nfe_no drop default;
drop sequence if exists public.students_nfe_no_seq;

create or replace function public.fn_assign_nfe_no()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.nfe_no is null then
    perform pg_advisory_xact_lock(hashtext('public.students_info.nfe_no'));
    select coalesce(max(nfe_no), 0) + 1 into new.nfe_no from public.students_info;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_nfe_no on public.students_info;
create trigger trg_assign_nfe_no
  before insert on public.students_info
  for each row execute function public.fn_assign_nfe_no();

create or replace function public.fn_guard_nfe_no()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.nfe_no is not null
     and new.nfe_no is distinct from old.nfe_no
     and coalesce(current_setting('nfe.allow_renumber', true), '') <> 'on' then
    new.nfe_no := old.nfe_no;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_nfe_no on public.students_info;
create trigger trg_guard_nfe_no
  before update of nfe_no on public.students_info
  for each row execute function public.fn_guard_nfe_no();

comment on column public.students_info.nfe_no is
  'NFE 内部学号，展示为 NFE-000001。按建档先后连续编号、无空号：由 trg_assign_nfe_no 取 max+1 分配；已编号不可改（trg_guard_nfe_no），人工改号需在事务内 set local nfe.allow_renumber = ''on''。';
