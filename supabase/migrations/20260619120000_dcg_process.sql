-- ============================================================
-- DCG（Designated Caregiver Guardianship）流程
-- 未满18岁学生的指定监护流程：申请→conditional offer→DCG要求→缴费
-- →host family流程（相识证明+公寓访问）→存档→每月监督
-- ============================================================

-- DCG 阶段枚举
DO $$ BEGIN
  CREATE TYPE dcg_stage AS ENUM (
    'applied',            -- 已递交申请
    'conditional_offer',  -- 已收到 conditional offer
    'dcg_required',       -- 已触发 DCG 要求（未满18）
    'paid',               -- 家长已缴费
    'host_visit',         -- host family 流程中（相识证明 + 公寓访问）
    'archived',           -- 材料已存档
    'supervising',        -- 持续监督中
    'completed'           -- 流程结束
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 公寓 → 监护员工映射（监护人绑在公寓上）
CREATE TABLE IF NOT EXISTS apartment_guardians (
  id SERIAL PRIMARY KEY,
  building_name VARCHAR NOT NULL UNIQUE,
  guardian_staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- DCG 案件（每个学生一条）
CREATE TABLE IF NOT EXISTS dcg_cases (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  stage dcg_stage NOT NULL DEFAULT 'applied',
  guardian_staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  offer_date DATE,            -- 收到 conditional offer 日期
  payment_date DATE,          -- 家长缴费日期
  host_visit_date DATE,       -- host family 公寓访问日期
  archived_date DATE,         -- 存档完成日期
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- DCG 监督报告（每月一次）
CREATE TABLE IF NOT EXISTS dcg_supervision_reports (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES dcg_cases(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reporter_staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT,
  photo_url TEXT,             -- R2 中的照片 key
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dcg_reports_case ON dcg_supervision_reports(case_id);

-- ---------------- RLS ----------------
ALTER TABLE apartment_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE dcg_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE dcg_supervision_reports ENABLE ROW LEVEL SECURITY;

-- 登录员工可读全部
CREATE POLICY "auth read apartment_guardians" ON apartment_guardians FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dcg_cases" ON dcg_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dcg_reports" ON dcg_supervision_reports FOR SELECT TO authenticated USING (true);

-- 公寓监护人映射：仅 admin/manager 可改
CREATE POLICY "elevated write apartment_guardians" ON apartment_guardians FOR ALL TO authenticated
  USING (is_elevated()) WITH CHECK (is_elevated());

-- DCG 案件：登录员工可建/改（实际操作者为学管/监护人）
CREATE POLICY "auth insert dcg_cases" ON dcg_cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update dcg_cases" ON dcg_cases FOR UPDATE TO authenticated USING (true);
CREATE POLICY "elevated delete dcg_cases" ON dcg_cases FOR DELETE TO authenticated USING (is_elevated());

-- 监督报告：登录员工可增删改
CREATE POLICY "auth insert dcg_reports" ON dcg_supervision_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update dcg_reports" ON dcg_supervision_reports FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete dcg_reports" ON dcg_supervision_reports FOR DELETE TO authenticated USING (true);

-- ---------------- 初始化 5 个公寓（监护人待分配） ----------------
INSERT INTO apartment_guardians (building_name)
SELECT DISTINCT building_name FROM dorms
ON CONFLICT (building_name) DO NOTHING;
