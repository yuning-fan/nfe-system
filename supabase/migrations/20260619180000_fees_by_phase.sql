-- 费用改为挂在"阶段(enrollment)"下：全流程按阶段追踪服务与缴费
-- student_fees 此前用自由文本 period，现改为 enrollment_id（0 数据，直接重建）

DROP TABLE IF EXISTS student_fees;

CREATE TABLE student_fees (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES student_enrollments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fee_type fee_type NOT NULL,         -- 监管/辅导/住宿/学费
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_date DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, fee_type)    -- 每个阶段·每类服务唯一一行
);

CREATE INDEX idx_student_fees_enrollment ON student_fees(enrollment_id);
CREATE INDEX idx_student_fees_student ON student_fees(student_id);

ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read student_fees" ON student_fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "elevated write student_fees" ON student_fees FOR ALL TO authenticated
  USING (is_elevated()) WITH CHECK (is_elevated());
