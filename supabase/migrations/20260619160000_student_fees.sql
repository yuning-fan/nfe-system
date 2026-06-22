-- 结构化费用跟踪：4 类服务费用，按学期/开学季时段，只记是否缴费
-- 取代原先宽泛的 students_info.payment_note 文本

DO $$ BEGIN
  CREATE TYPE fee_type AS ENUM (
    'supervision',   -- 监管
    'tutoring',      -- 辅导
    'accommodation', -- 住宿
    'tuition'        -- 学费
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS student_fees (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fee_type fee_type NOT NULL,
  period TEXT NOT NULL,                 -- 时段标签，如 "2026 T1" / "2026秋季"
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_date DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, fee_type, period) -- 每个学生·每类·每时段唯一
);

CREATE INDEX IF NOT EXISTS idx_student_fees_student ON student_fees(student_id);

ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;

-- 读：全体登录员工；写：admin/manager（费用属敏感/学管职责）
CREATE POLICY "auth read student_fees" ON student_fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "elevated write student_fees" ON student_fees FOR ALL TO authenticated
  USING (is_elevated()) WITH CHECK (is_elevated());
