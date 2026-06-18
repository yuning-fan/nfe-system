-- 主页手动待办：默认私人，可选协作者（被勾选的同事也能看到/勾选）
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  collaborator_ids UUID[] NOT NULL DEFAULT '{}',
  due_at TIMESTAMPTZ,
  is_done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_todos_creator ON todos(created_by);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- 可见/可改：创建人本人，或被列为协作者
CREATE POLICY "todos select own or collab" ON todos FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR auth.uid() = ANY(collaborator_ids));

-- 新建：只能以自己为创建人
CREATE POLICY "todos insert self" ON todos FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 更新（勾选完成/编辑）：创建人或协作者
CREATE POLICY "todos update own or collab" ON todos FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR auth.uid() = ANY(collaborator_ids));

-- 删除：仅创建人
CREATE POLICY "todos delete own" ON todos FOR DELETE TO authenticated
  USING (created_by = auth.uid());
