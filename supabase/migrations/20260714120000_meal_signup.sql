-- ============================================================
-- 餐食报餐：公寓餐食模式 + 排餐 meal_plans + 学生报餐 meal_signups
-- 做饭模式(cook)：老师排早/中/晚菜单 → 学生（微信小程序，后续）接龙报餐 → 汇总份数
-- 取餐模式(pickup)：老师记份数/菜单/照片，无逐人报餐
-- ============================================================

-- 公寓餐食模式
ALTER TABLE apartment_guardians
  ADD COLUMN IF NOT EXISTS meal_mode VARCHAR NOT NULL DEFAULT 'pickup';  -- pickup 取餐 / cook 做饭

-- 每公寓每天一条排餐
CREATE TABLE IF NOT EXISTS meal_plans (
  id SERIAL PRIMARY KEY,
  building_name VARCHAR NOT NULL,
  meal_date DATE NOT NULL,
  mode VARCHAR NOT NULL,                     -- 记录时快照公寓 meal_mode
  breakfast_menu TEXT,
  lunch_menu TEXT,
  dinner_menu TEXT,
  portions INT DEFAULT 0,                    -- 取餐模式总份数（做饭模式由报餐汇总，冗余可空）
  signup_deadline TIMESTAMPTZ,              -- 接龙截止（默认前一晚 24:00）
  notes TEXT,
  breakfast_photo TEXT,                      -- R2 key 实物留档
  lunch_photo TEXT,
  dinner_photo TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (building_name, meal_date)
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(meal_date);

-- 学生每天一条报餐（做饭模式）
CREATE TABLE IF NOT EXISTS meal_signups (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  breakfast BOOLEAN NOT NULL DEFAULT false,
  lunch BOOLEAN NOT NULL DEFAULT false,
  dinner BOOLEAN NOT NULL DEFAULT false,
  source VARCHAR NOT NULL DEFAULT 'manual',  -- manual 老师登记 / miniprogram 学生自助
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (plan_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_meal_signups_plan ON meal_signups(plan_id);

-- 预留：微信 openid ↔ 学生绑定（本轮建表不接登录，小程序上线时用）
CREATE TABLE IF NOT EXISTS student_wx_bindings (
  student_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  openid VARCHAR UNIQUE NOT NULL,
  bound_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------- RLS（参照 medications 口径：登录员工可读写）----------------
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_wx_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read meal_plans"   ON meal_plans   FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert meal_plans" ON meal_plans   FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update meal_plans" ON meal_plans   FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete meal_plans" ON meal_plans   FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth read meal_signups"   ON meal_signups FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert meal_signups" ON meal_signups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update meal_signups" ON meal_signups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete meal_signups" ON meal_signups FOR DELETE TO authenticated USING (true);

-- 绑定表：仅 elevated 可读写（敏感，学生 openid）；小程序侧由 Edge Function service role 操作
CREATE POLICY "elevated all wx_bindings" ON student_wx_bindings FOR ALL TO authenticated
  USING (is_elevated()) WITH CHECK (is_elevated());
