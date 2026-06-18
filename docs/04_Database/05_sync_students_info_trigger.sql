-- Migration: 自动同步 profiles → students_info
-- 解决问题：通过住宿页或其他途径新建学生时，只创建了 profiles 记录，
--           导致 students_info 行数永远少于 profiles 中 role='student' 的数量。
-- 执行方式：在 Supabase SQL Editor 中执行（需 postgres 权限）

-- ─────────────────────────────────────────────
-- Step 1: 触发器函数
-- 每次 profiles 插入 role='student' 的记录时，自动创建对应的 students_info 空行
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_auto_create_students_info()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'student' THEN
    INSERT INTO students_info (student_id, risk_level, total_risk_score)
    VALUES (NEW.id, 'green', 100)
    ON CONFLICT (student_id) DO NOTHING;  -- 幂等，重复执行安全
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- Step 2: 绑定触发器到 profiles 表
-- ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_auto_create_students_info ON profiles;

CREATE TRIGGER trg_auto_create_students_info
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION fn_auto_create_students_info();

-- ─────────────────────────────────────────────
-- Step 3: 一次性回填
-- 为所有现存的 role='student' profiles 补齐缺失的 students_info 行
-- ─────────────────────────────────────────────
INSERT INTO students_info (student_id, risk_level, total_risk_score)
SELECT id, 'green', 100
FROM profiles
WHERE role = 'student'
  AND id NOT IN (SELECT student_id FROM students_info)
ON CONFLICT (student_id) DO NOTHING;

-- 验证：执行后下面两个数字应该相等
SELECT
  (SELECT COUNT(*) FROM profiles WHERE role = 'student') AS profiles_student_count,
  (SELECT COUNT(*) FROM students_info)                   AS students_info_count;
