-- ============================================================
-- 点名新增「迟到」状态（check_status += 'late'）
--
-- 口径（2026-09-29 用户决定）：
--   · 只有晚自习的点名界面提供「迟到」按钮（RollCall 的 allowLate；早上出勤/查寝不变）。
--     枚举是全表共用的，所以数据层允许，但入口只开晚自习。
--   · 扣分：2 分/次，走配置项 deduct_attendance_late，可在系统设置页改（缺席是 8 分/次）。
--   · 出勤率：迟到算「在场」（人到了），分子分母都计；报告里另行单列迟到次数。
--
-- 注意：ALTER TYPE ... ADD VALUE 之后，同一事务内不能使用这个新值。
--       本迁移里的 risk_config 插入只写文本、不使用枚举值，因此可同事务执行。
-- ============================================================

alter type public.check_status add value if not exists 'late';

insert into public.risk_config (key, value, label, category)
values ('deduct_attendance_late', '2', '晚自习迟到每次扣分', 'deduct')
on conflict (key) do nothing;
