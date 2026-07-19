-- ============================================================
-- 住宿管理：卫生检查 hygiene_checks
-- 卫生检查（按房间）：合格/不合格 + 整改闭环（截止 + 复检）
-- 本轮不联动风险分。（白天巡查暂不需要，已移除）
-- ============================================================

-- 卫生检查（每房间每次 + 整改闭环）
CREATE TABLE IF NOT EXISTS hygiene_checks (
  id SERIAL PRIMARY KEY,
  dorm_id INT REFERENCES dorms(id) ON DELETE CASCADE,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  result VARCHAR NOT NULL,                    -- pass 合格 / fail 不合格
  rectify_deadline TIMESTAMPTZ,              -- 不合格时的整改截止
  status VARCHAR NOT NULL DEFAULT 'pending',  -- pending 待整改 / rectified 已复检
  rechecked_at TIMESTAMPTZ,
  notes TEXT,
  photo_url TEXT,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hygiene_checks_dorm ON hygiene_checks(dorm_id);

-- ---------------- RLS（参照 medications / meal 口径：登录员工可读写）----------------
ALTER TABLE hygiene_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read hygiene_checks"   ON hygiene_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert hygiene_checks" ON hygiene_checks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update hygiene_checks" ON hygiene_checks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete hygiene_checks" ON hygiene_checks FOR DELETE TO authenticated USING (true);
