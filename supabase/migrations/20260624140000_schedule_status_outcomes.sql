-- 辅导排课补全：销课结果与取消状态
-- 现有 schedule_status: scheduled / completed / rescheduling / pending_approval
-- 新增：absent(无故缺勤) / leave(请假) / cancelled(已取消)
alter type public.schedule_status add value if not exists 'absent';
alter type public.schedule_status add value if not exists 'leave';
alter type public.schedule_status add value if not exists 'cancelled';
