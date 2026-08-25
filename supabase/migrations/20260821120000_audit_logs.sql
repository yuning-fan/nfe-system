-- ============================================================
-- 系统操作日志（审计） P0
-- 思路：数据库触发器统一记录，前端零改动、无法绕过。
-- 覆盖：A 层核心表全记（增/改/删 + 字段级 diff）
--       B 层高频表只记删除与关键字段改动
--       C 层运营流水（daily_checks / meal_signups 等）不接入
-- 已有的 log_hour_changes / log_risk_changes 是业务流水，保持原样不重复记。
-- ============================================================

-- ------------------------------------------------------------
-- 1. 清理旧表
--    log_audit_operations 建于 init_schema，云端序列 setval(...,1,false)
--    说明从未写入过任何一行；无视图、无外键指向它，drop 无损失。
-- ------------------------------------------------------------
DROP TABLE IF EXISTS public.log_audit_operations;

-- ------------------------------------------------------------
-- 2. 审计表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id             BIGSERIAL PRIMARY KEY,
  actor_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name     VARCHAR(100),          -- 快照：账号改名或删除后仍可追溯
  actor_role     VARCHAR(30),           -- 快照：操作发生时的角色
  action         VARCHAR(10) NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  table_name     VARCHAR(64) NOT NULL,
  record_id      TEXT,                  -- 目标行主键，统一转 text
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  old_data       JSONB,                 -- UPDATE 只存变化字段；DELETE 存整行
  new_data       JSONB,                 -- UPDATE 只存变化字段；INSERT 存整行
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created   ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor     ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target    ON public.audit_logs (table_name, record_id);

COMMENT ON TABLE public.audit_logs IS '系统操作日志：由触发器写入，任何角色不可增删改，仅 admin 可读';

-- ------------------------------------------------------------
-- 3. RLS：admin 只读，无任何写策略
--    写入走 SECURITY DEFINER 触发器，绕过 RLS；因此日志不可篡改。
-- ------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 显式收回写权限：即便将来有人误加策略，表级权限这一层也拦得住
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM authenticated;
REVOKE ALL ON public.audit_logs FROM anon;

DROP POLICY IF EXISTS "admin read audit_logs" ON public.audit_logs;
CREATE POLICY "admin read audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');

-- ------------------------------------------------------------
-- 4. 通用触发器函数
--    TG_ARGV[0] 主键列名（默认 id）
--    TG_ARGV[1] 脱敏列，逗号分隔（值替换为 ***）
--    TG_ARGV[2] 关注列，逗号分隔；非空即视为 B 层：
--               不记 INSERT，UPDATE 仅在关注列变化时记，DELETE 照记
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pk_col   TEXT   := COALESCE(NULLIF(TG_ARGV[0], ''), 'id');
  v_masked   TEXT[] := array_remove(string_to_array(COALESCE(TG_ARGV[1], ''), ','), '');
  v_watch    TEXT[] := array_remove(string_to_array(COALESCE(TG_ARGV[2], ''), ','), '');
  v_ignore   TEXT[] := ARRAY['updated_at','created_at'];
  v_old      JSONB;
  v_new      JSONB;
  v_old_slim JSONB  := '{}'::jsonb;
  v_new_slim JSONB  := '{}'::jsonb;
  v_changed  TEXT[] := '{}';
  v_k        TEXT;
  v_record   TEXT;
  v_actor    UUID   := auth.uid();
  v_name     TEXT;
  v_role     TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW); END IF;

  v_record := COALESCE(v_new, v_old) ->> v_pk_col;

  IF TG_OP = 'UPDATE' THEN
    FOR v_k IN SELECT key FROM jsonb_each(v_new) LOOP
      CONTINUE WHEN v_k = ANY(v_ignore);
      IF (v_old -> v_k) IS DISTINCT FROM (v_new -> v_k) THEN
        v_changed  := v_changed || v_k;
        v_old_slim := v_old_slim || jsonb_build_object(v_k, v_old -> v_k);
        v_new_slim := v_new_slim || jsonb_build_object(v_k, v_new -> v_k);
      END IF;
    END LOOP;

    -- 无实质变化（只动了 updated_at 或原值写回）不记
    IF COALESCE(array_length(v_changed, 1), 0) = 0 THEN
      RETURN NULL;
    END IF;

    -- B 层：关注列没动就不记
    IF COALESCE(array_length(v_watch, 1), 0) > 0 AND NOT (v_changed && v_watch) THEN
      RETURN NULL;
    END IF;

  ELSIF TG_OP = 'INSERT' THEN
    -- B 层不记新增
    IF COALESCE(array_length(v_watch, 1), 0) > 0 THEN
      RETURN NULL;
    END IF;
    v_new_slim := v_new;

  ELSE  -- DELETE
    v_old_slim := v_old;
  END IF;

  -- 敏感字段脱敏：必须在比对之后做，否则改密码会被判成「无变化」而漏记；
  -- 这里只保留「这个字段被改过」的事实，不落任何明文。
  FOREACH v_k IN ARRAY v_masked LOOP
    IF v_old_slim ? v_k THEN v_old_slim := jsonb_set(v_old_slim, ARRAY[v_k], to_jsonb('***'::text)); END IF;
    IF v_new_slim ? v_k THEN v_new_slim := jsonb_set(v_new_slim, ARRAY[v_k], to_jsonb('***'::text)); END IF;
  END LOOP;

  SELECT full_name, role::text INTO v_name, v_role
  FROM public.profiles WHERE id = v_actor;

  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_role, action, table_name,
    record_id, changed_fields, old_data, new_data
  ) VALUES (
    v_actor,
    COALESCE(v_name, '(系统/未登录)'),
    v_role,
    TG_OP,
    TG_TABLE_NAME,
    v_record,
    v_changed,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE v_old_slim END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE v_new_slim END
  );

  RETURN NULL;  -- AFTER 触发器，返回值被忽略
END;
$$;

-- ------------------------------------------------------------
-- 5. 批量挂表
--    每行：表名 | 主键列 | 脱敏列 | 关注列（空=A层全记，非空=B层）
-- ------------------------------------------------------------
DO $do$
DECLARE
  v_cfg   TEXT[][] := ARRAY[
    -- ── A 层：核心业务表，全记 ──────────────────────────
    ARRAY['profiles',             'id',         '',                   ''],
    ARRAY['students_info',        'student_id', '',                   ''],
    ARRAY['student_enrollments',  'id',         '',                   ''],
    ARRAY['student_fees',         'id',         '',                   ''],
    ARRAY['student_hour_pools',   'id',         '',                   ''],
    ARRAY['student_credentials',  'id',         'encrypted_password', ''],
    ARRAY['student_documents',    'id',         '',                   ''],
    ARRAY['dorm_assignments',     'id',         '',                   ''],
    ARRAY['warning_letters',      'id',         '',                   ''],
    ARRAY['violation_logs',       'id',         '',                   ''],
    ARRAY['risk_config',          'key',        '',                   ''],
    ARRAY['courses',              'id',         '',                   ''],
    -- ── B 层：高频表，只记删除与关注列改动 ──────────────
    ARRAY['schedules',      'id', '', 'status,start_time,end_time,tutor_id,student_id'],
    ARRAY['grade_records',  'id', '', 'score,score_type'],
    ARRAY['reports',        'id', '', 'status,pdf_url'],
    ARRAY['resources',      'id', '', 'title,file_url,is_student_visible'],
    ARRAY['activities',     'id', '', 'title,activity_date,location']
  ];
  v_tbl TEXT; v_pk TEXT; v_mask TEXT; v_watch TEXT;
  i INT;
BEGIN
  FOR i IN 1 .. array_length(v_cfg, 1) LOOP
    v_tbl := v_cfg[i][1]; v_pk := v_cfg[i][2]; v_mask := v_cfg[i][3]; v_watch := v_cfg[i][4];

    IF to_regclass('public.' || v_tbl) IS NULL THEN
      RAISE NOTICE '跳过不存在的表: %', v_tbl;
      CONTINUE;
    END IF;

    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$I', v_tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION public.fn_audit(%2$L, %3$L, %4$L)',
      v_tbl, v_pk, v_mask, v_watch
    );
  END LOOP;
END
$do$;
