import { useEffect, useState } from 'react';
import { Modal, message } from 'antd';
import { IconUserPlus, IconLoader2, IconKey } from '@tabler/icons-react';
import { useStaffStore, STAFF_ROLE_LABELS, type StaffMember } from '../../store/useStaffStore';

const ROLE_OPTIONS = Object.entries(STAFF_ROLE_LABELS); // [value, label]

export default function Accounts() {
  const { staff, isLoading, fetchStaff, createStaff, updateRole, resetPassword, setStatus } = useStaffStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', role: 'manager', password: '' });

  const [pwTarget, setPwTarget] = useState<StaffMember | null>(null);
  const [newPw, setNewPw] = useState('');

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const submitCreate = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      message.warning('姓名、邮箱、密码为必填'); return;
    }
    setSaving(true);
    const res = await createStaff({
      email: form.email.trim(), password: form.password,
      full_name: form.full_name.trim(), role: form.role, phone: form.phone.trim() || undefined,
    });
    setSaving(false);
    if (res.ok) {
      message.success('员工账号已创建');
      setCreateOpen(false);
      setForm({ full_name: '', email: '', phone: '', role: 'manager', password: '' });
    } else message.error(res.error || '创建失败');
  };

  const submitResetPw = async () => {
    if (!pwTarget) return;
    if (newPw.length < 6) { message.warning('密码至少 6 位'); return; }
    setSaving(true);
    const ok = await resetPassword(pwTarget.id, newPw);
    setSaving(false);
    if (ok) { message.success(`已重置 ${pwTarget.full_name} 的密码`); setPwTarget(null); setNewPw(''); }
    else message.error('重置失败');
  };

  const handleRoleChange = async (m: StaffMember, role: string) => {
    if (role === m.role) return;
    const ok = await updateRole(m.id, role);
    message[ok ? 'success' : 'error'](ok ? '角色已更新' : '更新失败');
  };

  const handleToggleStatus = (m: StaffMember) => {
    const disabling = m.status !== 0;
    Modal.confirm({
      title: disabling ? '停用账号' : '启用账号',
      content: `确认${disabling ? '停用' : '启用'} ${m.full_name} 的账号吗？${disabling ? '停用后该员工将无法登录。' : ''}`,
      okButtonProps: disabling ? { danger: true } : undefined,
      onOk: async () => {
        const ok = await setStatus(m.id, disabling ? 0 : 1);
        message[ok ? 'success' : 'error'](ok ? '操作成功' : '操作失败');
      },
    });
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>共 {staff.length} 名员工</div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <IconUserPlus size={16} style={{ marginRight: 4 }} />新建员工
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-scroll">
          <table className="tbl" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>姓名</th>
                <th>角色</th>
                <th>电话</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && staff.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}><IconLoader2 className="spinner" size={24} style={{ color: 'var(--color-primary)' }} /></td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-tertiary)' }}>暂无员工</td></tr>
              ) : staff.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.full_name}</td>
                  <td>
                    <select className="sel" value={m.role} onChange={e => handleRoleChange(m, e.target.value)} style={{ fontSize: 12, padding: '3px 8px' }}>
                      {ROLE_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                    </select>
                  </td>
                  <td>{m.phone || '—'}</td>
                  <td>
                    {m.status === 0
                      ? <span className="pill p-gray">已停用</span>
                      : <span className="pill p-green">正常</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => { setPwTarget(m); setNewPw(''); }}>
                        <IconKey size={12} style={{ marginRight: 2 }} />重置密码
                      </button>
                      <button className="btn" style={{ padding: '3px 8px', fontSize: 11, color: m.status === 0 ? 'var(--color-success)' : 'var(--color-danger)' }} onClick={() => handleToggleStatus(m)}>
                        {m.status === 0 ? '启用' : '停用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新建员工 */}
      <Modal title="新建员工账号" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={submitCreate} okText={saving ? '创建中…' : '创建'} confirmLoading={saving}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
          <div className="form-group">
            <label className="form-label">姓名 *</label>
            <input className="input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">角色 *</label>
            <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {ROLE_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">登录邮箱 *</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="staff@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">电话</label>
            <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">初始密码 *（至少 6 位）</label>
            <input className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="员工首次登录用，建议提醒其登录后修改" />
          </div>
        </div>
      </Modal>

      {/* 重置密码 */}
      <Modal title={`重置密码 · ${pwTarget?.full_name || ''}`} open={!!pwTarget} onCancel={() => setPwTarget(null)} onOk={submitResetPw} okText={saving ? '提交中…' : '确认重置'} confirmLoading={saving}>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">新密码（至少 6 位）</label>
          <input className="input" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="输入新密码" />
        </div>
      </Modal>
    </>
  );
}
