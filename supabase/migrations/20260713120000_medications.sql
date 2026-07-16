-- ============================================================
-- 药物管理：存档表 medications + 分发记录 medication_records 关联
-- 生活老师维护每位学生的常备药（用法/库存/每日定时），到点分发记入 medication_records。
-- ============================================================

-- 药物存档（每位学生可有多条常备药）
CREATE TABLE IF NOT EXISTS medications (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,        -- 药名
  usage TEXT,                        -- 用法说明（每日1片，餐后 等）
  stock INT NOT NULL DEFAULT 0,      -- 库存量（片/剂）
  daily_time TIME,                   -- 每日定时分发时间（可空 = 按需）
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_student ON medications(student_id);

-- 分发记录关联到具体存档药物（历史记录保留，允许为空以兼容旧数据）
ALTER TABLE medication_records
  ADD COLUMN IF NOT EXISTS medication_id INT REFERENCES medications(id) ON DELETE SET NULL;

-- ---------------- RLS（参照 dcg_process.sql 口径）----------------
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- 登录员工可读
CREATE POLICY "auth read medications" ON medications FOR SELECT TO authenticated USING (true);
-- 登录员工可增删改（实际操作者为生活老师）
CREATE POLICY "auth insert medications" ON medications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update medications" ON medications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete medications" ON medications FOR DELETE TO authenticated USING (true);
