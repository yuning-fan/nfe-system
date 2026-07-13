import { useState, useEffect, useMemo } from 'react';
import { useAcademicStore } from '../../store/useAcademicStore';
import { useStudentStore } from '../../store/useStudentStore';
import { IconWallet, IconPlus } from '@tabler/icons-react';
import { Modal, message, Select } from 'antd';
import StudentSelect from '../../components/common/StudentSelect';

const TYPE_OPTIONS = [
  { label: '班科', value: 'group_class' },
  { label: '1对1', value: 'one_on_one' },
];
export default function CourseHoursManagement() {
  const { hourPools, fetchHourPools, topUpPool, isLoading } = useAcademicStore();
  const { students, fetchStudents } = useStudentStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<{ student_id: string; course_type: 'one_on_one' | 'group_class'; hours: number }>({ student_id: '', course_type: 'group_class', hours: 10 });

  useEffect(() => { fetchHourPools(); fetchStudents(); }, [fetchHourPools, fetchStudents]);

  // 按学生聚合：每生一行，显示 1对1 / 班科 两个池
  const rows = useMemo(() => {
    const byStudent: Record<string, { name: string; one_on_one: number; group_class: number }> = {};
    for (const p of hourPools) {
      const r = byStudent[p.student_id] || { name: p.full_name || '—', one_on_one: 0, group_class: 0 };
      if (p.course_type === 'one_on_one') r.one_on_one = Number(p.total_hours);
      else if (p.course_type === 'group_class') r.group_class = Number(p.total_hours);
      r.name = p.full_name || r.name;
      byStudent[p.student_id] = r;
    }
    return Object.entries(byStudent).map(([id, v]) => ({ id, ...v }));
  }, [hourPools]);

  const handleTopUp = async () => {
    if (!form.student_id || !form.course_type || !form.hours) { message.error('请填写完整必填项'); return; }
    const ok = await topUpPool(form.student_id, form.course_type, Number(form.hours));
    if (ok) { message.success('充值成功'); setIsModalOpen(false); }
  };

  const hourPill = (h: number) => <span className={`pill ${h <= 5 ? 'p-red' : 'p-green'}`}>{h} 小时</span>;

  return (
    <div className="tabpage active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}><IconWallet size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> 课时管理</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>按课型管理剩余课时（1对1 / 班科两个池，价格不同分开充值）。销课时从对应课型的池扣减。</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ student_id: '', course_type: 'group_class', hours: 10 }); setIsModalOpen(true); }}>
          <IconPlus size={16} style={{ marginRight: 4 }} /> 课时充值
        </button>
      </div>

      <div className="card">
        <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              <th style={{ padding: '12px 8px' }}>学生姓名</th>
              <th style={{ padding: '12px 8px' }}>1对1 剩余课时</th>
              <th style={{ padding: '12px 8px' }}>班科 剩余课时</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                <td style={{ padding: '12px 8px', fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: '12px 8px' }}>{hourPill(r.one_on_one)}</td>
                <td style={{ padding: '12px 8px' }}>{hourPill(r.group_class)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>暂无课时记录，点右上「课时充值」录入。</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal title="课时充值" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={handleTopUp} confirmLoading={isLoading}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <div className="form-group">
            <label className="form-label">选择学生</label>
            <StudentSelect style={{ width: '100%' }} value={form.student_id || undefined}
              placeholder="搜索并选择学生" onChange={v => setForm({ ...form, student_id: v })}
              options={students.map(s => ({ label: (s as any).profiles?.full_name || '—', value: s.student_id }))} />
          </div>
          <div className="form-group">
            <label className="form-label">课型</label>
            <Select style={{ width: '100%' }} value={form.course_type} onChange={v => setForm({ ...form, course_type: v })} options={TYPE_OPTIONS} />
          </div>
          <div className="form-group">
            <label className="form-label">充值课时数 (小时)</label>
            <input className="input" type="number" step="0.5" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value as any })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
