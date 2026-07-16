// 生活老师 · 药物管理
// 1) 今日待分发（有每日定时的存档药）→「标记已发」写 medication_records 并 stock-1
// 2) 药物存档（录入/删除）
// 3) 近期分发记录
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { getGuardedStudentIds } from '../../lib/guardedStudents';
import { Section } from '../ui';
import { message, Modal, Select, Input, InputNumber, TimePicker } from 'antd';
import { IconLoader2, IconPlus, IconTrash } from '@tabler/icons-react';

const db = supabase as any;

interface Med {
  id: number;
  student_id: string;
  studentName: string;
  name: string;
  usage: string;
  stock: number;
  daily_time: string | null;
}
interface DispenseRow {
  id: number;
  studentName: string;
  name: string;
  dosage: string;
  at: string;
}

export function LifeMeds() {
  const staffId = useAuthStore(s => s.user?.id ?? null);
  const [meds, setMeds] = useState<Med[]>([]);
  const [records, setRecords] = useState<DispenseRow[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ student_id?: string; name: string; usage: string; stock: number; daily_time: string | null }>({ name: '', usage: '', stock: 0, daily_time: null });

  const load = useCallback(async () => {
    setLoading(true);
    const ids = await getGuardedStudentIds(staffId);
    if (ids.length === 0) { setMeds([]); setRecords([]); setStudents([]); setLoading(false); return; }

    const nameMap: Record<string, string> = {};
    const { data: profs } = await db.from('profiles').select('id, full_name').in('id', ids);
    for (const p of (profs || []) as any[]) nameMap[p.id] = p.full_name;
    setStudents(ids.map(id => ({ id, name: nameMap[id] || '未知' })).sort((a, b) => a.name.localeCompare(b.name, 'zh')));

    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    const [{ data: medRows }, { data: recRows }] = await Promise.all([
      db.from('medications').select('id, student_id, name, usage, stock, daily_time').eq('is_active', true).in('student_id', ids),
      db.from('medication_records').select('id, student_id, medication_name, dosage, dispensed_at').in('student_id', ids).gte('dispensed_at', since).order('dispensed_at', { ascending: false }),
    ]);

    setMeds(((medRows || []) as any[]).map(m => ({
      id: m.id, student_id: m.student_id, studentName: nameMap[m.student_id] || '未知',
      name: m.name, usage: m.usage || '', stock: m.stock ?? 0, daily_time: m.daily_time,
    })).sort((a, b) => a.studentName.localeCompare(b.studentName, 'zh')));

    setRecords(((recRows || []) as any[]).map(r => ({
      id: r.id, studentName: nameMap[r.student_id] || '未知', name: r.medication_name, dosage: r.dosage || '', at: (r.dispensed_at || '').slice(0, 16).replace('T', ' '),
    })));
    setLoading(false);
  }, [staffId]);

  useEffect(() => { load(); }, [load]);

  // 标记已发：写分发记录 + 库存 -1
  const dispense = async (m: Med) => {
    const { error: e1 } = await db.from('medication_records').insert({
      student_id: m.student_id, medication_id: m.id, medication_name: m.name, dosage: m.usage, dispensed_by: staffId,
    });
    if (e1) { message.error('记录失败'); return; }
    await db.from('medications').update({ stock: Math.max(0, m.stock - 1) }).eq('id', m.id);
    message.success('已标记分发');
    load();
  };

  const submitAdd = async () => {
    if (!form.student_id) { message.warning('请选择学生'); return; }
    if (!form.name.trim()) { message.warning('请填写药名'); return; }
    const { error } = await db.from('medications').insert({
      student_id: form.student_id, name: form.name.trim(), usage: form.usage.trim() || null,
      stock: form.stock || 0, daily_time: form.daily_time, created_by: staffId,
    });
    if (error) { message.error('录入失败'); return; }
    message.success('已录入');
    setAdding(false);
    setForm({ name: '', usage: '', stock: 0, daily_time: null });
    load();
  };

  const removeMed = (m: Med) => {
    Modal.confirm({
      title: `删除 ${m.studentName} 的「${m.name}」`,
      content: '仅停用该存档药（历史分发记录保留）。',
      okButtonProps: { danger: true },
      onOk: async () => {
        const { error } = await db.from('medications').update({ is_active: false }).eq('id', m.id);
        if (error) { message.error('删除失败'); return; }
        message.success('已删除');
        load();
      },
    });
  };

  const pending = meds.filter(m => m.daily_time); // 有每日定时 = 需分发

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;
  }

  return (
    <>
      {/* 今日待分发 */}
      <Section title="今日待分发" hint="有每日定时的常备药 · 分发后库存自动 -1">
        {pending.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无需定时分发的药物</div>
        ) : pending.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--color-border-tertiary)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{m.studentName} — {m.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                每日 {String(m.daily_time).slice(0, 5)} · {m.usage || '—'} · 库存 <b style={{ color: m.stock <= 3 ? 'var(--color-danger)' : undefined }}>{m.stock}</b>
              </div>
            </div>
            <button className="btn btn-primary" style={{ padding: '4px 12px', minHeight: 0 }} disabled={m.stock <= 0} onClick={() => dispense(m)}>
              {m.stock <= 0 ? '缺药' : '标记已发'}
            </button>
          </div>
        ))}
      </Section>

      {/* 药物存档 */}
      <Section title="药物存档" hint="每位学生的常备药 · 用法 / 库存 / 每日定时"
        action={<button className="btn btn-primary" onClick={() => setAdding(true)}><IconPlus size={15} style={{ verticalAlign: 'middle' }} /> 录入药物</button>}>
        {meds.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无药物存档</div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>{['学生', '药物', '用法', '每日定时', '库存', ''].map((c, i) => (
                <th key={i} style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{c}</th>
              ))}</tr>
            </thead>
            <tbody>
              {meds.map(m => (
                <tr key={m.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{m.studentName}</td>
                  <td style={{ padding: '10px 12px' }}>{m.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{m.usage || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{m.daily_time ? String(m.daily_time).slice(0, 5) : '按需'}</td>
                  <td style={{ padding: '10px 12px', color: m.stock <= 3 ? 'var(--color-danger)' : undefined }}>{m.stock}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className="link" style={{ color: 'var(--color-danger)' }} onClick={() => removeMed(m)}>
                      <IconTrash size={13} style={{ verticalAlign: 'middle' }} /> 删除
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* 近期分发记录 */}
      <Section title="近期分发记录" hint="近 14 天">
        {records.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无分发记录</div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>{['学生', '药物', '用法/剂量', '时间'].map(c => (
                <th key={c} style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{c}</th>
              ))}</tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.studentName}</td>
                  <td style={{ padding: '10px 12px' }}>{r.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{r.dosage || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{r.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* 录入药物 弹窗 */}
      <Modal title="录入药物" open={adding} onCancel={() => setAdding(false)} onOk={submitAdd} okText="保存">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>学生</div>
            <Select style={{ width: '100%' }} placeholder="选择学生" value={form.student_id}
              options={students.map(s => ({ value: s.id, label: s.name }))}
              onChange={v => setForm(f => ({ ...f, student_id: v }))} showSearch optionFilterProp="label" />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>药名</div>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如 氯雷他定（抗过敏）" />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>用法说明</div>
            <Input value={form.usage} onChange={e => setForm(f => ({ ...f, usage: e.target.value }))} placeholder="如 每日1片，餐后" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>库存量</div>
              <InputNumber style={{ width: '100%' }} min={0} value={form.stock} onChange={v => setForm(f => ({ ...f, stock: v || 0 }))} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>每日定时（可空=按需）</div>
              <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5}
                onChange={(_, str) => setForm(f => ({ ...f, daily_time: (str as string) || null }))} />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
