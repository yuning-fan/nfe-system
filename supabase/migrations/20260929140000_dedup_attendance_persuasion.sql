-- ============================================================
-- 出勤率历史去重：同一学生 + 同一天 + 同一数值 不再新增历史行
--
-- 背景：官方出勤率录入页每点一次「保存」就往 attendance_persuasions 插一条。
--   风险引擎用这张表算「出勤率反复跌破合约线 N 次」，所以重复行会虚增「屡教不改」。
--
-- 关键：实际使用习惯是「先录数值 → 过一会儿回来补劝说备注」（王新然、陈亦凡两例都是
--   19:38 无备注 / 19:56 带备注）。所以不能简单跳过重复插入，否则会把老师后补的
--   劝说备注吞掉——那条备注既是工作记录，也是「已劝说 N 次」的依据。
--   因此：同日同值不新增行，但把这次带来的备注合并到原记录上。
--
-- 放在触发器而不是前端：保证任何调用方（页面、脚本、以后的接口）都一致。
-- 时区按新西兰，与 daily_checks.check_date 同口径。
-- ============================================================

create or replace function public.fn_dedup_attendance_persuasion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ex_id bigint;
  new_note text := nullif(btrim(new.note), '');
begin
  select id into ex_id
    from public.attendance_persuasions
   where student_id = new.student_id
     and rate is not distinct from new.rate
     and (created_at at time zone 'Pacific/Auckland')::date
         = (coalesce(new.created_at, now()) at time zone 'Pacific/Auckland')::date
   order by created_at
   limit 1;

  if ex_id is null then
    return new;   -- 当天该数值的第一条，正常插入
  end if;

  -- 已有同日同值记录：不新增历史；若这次带了备注则合并进原记录
  if new_note is not null then
    update public.attendance_persuasions
       set note = case
             when nullif(btrim(note), '') is null then new_note              -- 原来没备注 → 直接写入
             when position(new_note in note) > 0 then note                   -- 已包含相同内容 → 不动
             else note || '；' || new_note                                   -- 追加，避免覆盖旧备注
           end,
           created_by = coalesce(created_by, new.created_by)
     where id = ex_id;
  end if;

  return null;    -- 跳过本次插入
end;
$$;

drop trigger if exists trg_dedup_attendance_persuasion on public.attendance_persuasions;
create trigger trg_dedup_attendance_persuasion
  before insert on public.attendance_persuasions
  for each row execute function public.fn_dedup_attendance_persuasion();

comment on function public.fn_dedup_attendance_persuasion() is
  '出勤率历史幂等：同一学生+同一天(新西兰)+同一数值不新增行，备注合并到原记录。前端无需改动。';
