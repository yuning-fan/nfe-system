-- Migration: 新增学生抵达日期字段
-- 用途：支持入学清单检测（几号到达、接机安排）
-- 执行方式：在 Supabase SQL Editor 或 psql 中执行

ALTER TABLE students_info
  ADD COLUMN IF NOT EXISTS arrival_date DATE;

COMMENT ON COLUMN students_info.arrival_date IS '学生预计抵达新西兰日期，用于接机安排与入学清单检测';
