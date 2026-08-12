-- ============================================================
-- NFE 活动管理（第一阶段）
-- 老师建活动（只需标题）→ 批量代报参与学生 → 留档照片
-- 不做：分类、学生自助报名、签到、费用（后续阶段再加，字段届时补）
-- ============================================================

CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  title VARCHAR NOT NULL,
  activity_date DATE,                        -- 举办日期，可空（先建后补）
  location VARCHAR,
  description TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',       -- R2 key 数组，桶固定 resources、前缀 activity
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(activity_date DESC);

-- 参与名单：本阶段一律老师代报，故无报名状态字段
CREATE TABLE IF NOT EXISTS activity_participants (
  id SERIAL PRIMARY KEY,
  activity_id INT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (activity_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_participants_activity ON activity_participants(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_participants_student ON activity_participants(student_id);

-- ---------------- RLS（参照 meal_plans 口径：登录员工可读写）----------------
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read activities"   ON activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert activities" ON activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update activities" ON activities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete activities" ON activities FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read activity_participants"   ON activity_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert activity_participants" ON activity_participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update activity_participants" ON activity_participants FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete activity_participants" ON activity_participants FOR DELETE TO authenticated USING (true);
