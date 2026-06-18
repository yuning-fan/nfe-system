import { useEffect, useState } from 'react';
import { Modal, Select, message } from 'antd';
import { IconChecklist, IconPlus, IconTrash, IconUsers, IconClock } from '@tabler/icons-react';
import { useTodoStore } from '../../store/useTodoStore';
import { useAuthStore } from '../../store/useAuthStore';

function fmtDue(due: string) {
  const d = new Date(due);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function MyTodos() {
  const { todos, staff, isLoading, fetchTodos, fetchStaff, addTodo, toggleDone, deleteTodo } = useTodoStore();
  const userId = useAuthStore(s => s.user?.id);

  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [collabs, setCollabs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTodos(); fetchStaff(); }, [fetchTodos, fetchStaff]);

  const staffName = (id: string) => staff.find(s => s.id === id)?.full_name || '同事';

  const submit = async () => {
    if (!content.trim()) { message.warning('请输入待办内容'); return; }
    setSaving(true);
    // datetime-local 是本地时间，转成 ISO
    const iso = dueAt ? new Date(dueAt).toISOString() : null;
    const ok = await addTodo(content.trim(), iso, collabs);
    setSaving(false);
    if (ok) {
      message.success('已添加');
      setOpen(false); setContent(''); setDueAt(''); setCollabs([]);
    } else message.error('添加失败，请重试');
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}><IconChecklist stroke={1.5} />我的待办</div>
        <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => setOpen(true)}>
          <IconPlus size={14} style={{ marginRight: 2 }} />添加
        </button>
      </div>

      {isLoading && todos.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>加载中…</div>
      ) : todos.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '12px 0', textAlign: 'center' }}>暂无待办，点「添加」记一条</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {todos.map(t => {
            const overdue = t.due_at && !t.is_done && new Date(t.due_at).getTime() < Date.now();
            const mine = t.created_by === userId;
            return (
              <div key={t.id} className="todo-row" style={{ alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
                  <input type="checkbox" checked={t.is_done} onChange={e => toggleDone(t.id, e.target.checked)} style={{ marginTop: 3, cursor: 'pointer' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: t.is_done ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)', textDecoration: t.is_done ? 'line-through' : 'none' }}>
                      {t.content}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                      {t.due_at && (
                        <span style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 2, color: overdue ? '#A32D2D' : 'var(--color-text-tertiary)', fontWeight: overdue ? 600 : 400 }}>
                          <IconClock size={11} />{fmtDue(t.due_at)}{overdue ? ' · 已逾期' : ''}
                        </span>
                      )}
                      {t.collaborator_ids?.length > 0 && (
                        <span style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--color-text-tertiary)' }}>
                          <IconUsers size={11} />{t.collaborator_ids.map(staffName).join('、')}
                        </span>
                      )}
                      {!mine && <span className="pill p-gray" style={{ fontSize: 10 }}>协作</span>}
                    </div>
                  </div>
                </div>
                {mine && (
                  <button className="btn" style={{ padding: '2px 4px', minHeight: 0, height: 22, background: 'transparent', border: 'none' }} onClick={() => deleteTodo(t.id)} title="删除">
                    <IconTrash size={13} color="var(--color-danger)" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal title="添加待办" open={open} onCancel={() => setOpen(false)} onOk={submit} okText={saving ? '保存中…' : '添加'} confirmLoading={saving}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          <div>
            <label className="form-label">待办内容 *</label>
            <textarea className="input" rows={2} value={content} onChange={e => setContent(e.target.value)} placeholder="例如：联系占小诺家长确认 DCG 缴费" />
          </div>
          <div>
            <label className="form-label">截止时间（可选）</label>
            <input className="input" type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} />
          </div>
          <div>
            <label className="form-label">协作者（可选，勾选后对方也能看到）</label>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="选择同事一起协作"
              value={collabs}
              onChange={setCollabs}
              options={staff.filter(s => s.id !== userId).map(s => ({ label: s.full_name, value: s.id }))}
              optionFilterProp="label"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
