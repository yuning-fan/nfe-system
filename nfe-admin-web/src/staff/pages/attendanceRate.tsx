// 巡查 · 官方出勤率录入（每周一录一次，核对 life 早上出勤）
// 录入 students_info.school_attendance_rate；<95% 违反合约线、<97% 预警，保存后即时重算风险。
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { recomputeRisk } from '../../lib/riskEngine';
import { message } from 'antd';
import { IconLoader2 } from '@tabler/icons-react';
import { Section } from '../ui';

const db = supabase as any;

interface Row {
  student_id: string;
  name: string;
  rate: number | null;       // 已保存的官方出勤率
  input: string;             // 输入框值
  note: string;              // 劝说备注
  recentAbsent: number;      // 近14天学校上课缺勤次数（核对参考）
}

export function AttendanceRateEntry() {
  const operatorId = useAuthStore(s => s.user?.id ?? null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: infos } = await db
      .from('students_info')
      .select('student_id, school_attendance_rate, profiles(full_name)');
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data: checks } = await db
      .from('daily_checks')
      .select('student_id')
      .eq('check_type', 'morning').eq('status', 'absent').gte('created_at', since);
    const absentCnt: Record<string, number> = {};
    for (const c of (checks || []) as any[]) absentCnt[c.student_id] = (absentCnt[c.student_id] || 0) + 1;

    const list: Row[] = ((infos || []) as any[]).map(i => ({
      student_id: i.student_id,
      name: Array.isArray(i.profiles) ? i.profiles[0]?.full_name : i.profiles?.full_name,
      rate: i.school_attendance_rate,
      input: i.school_attendance_rate != null ? String(i.school_attendance_rate) : '',
      note: '',
      recentAbsent: absentCnt[i.student_id] || 0,
    })).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh'));
    setRows(list);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setInput = (id: string, v: string) => setRows(rs => rs.map(r => r.student_id === id ? { ...r, input: v } : r));
  const setNote = (id: string, v: string) => setRows(rs => rs.map(r => r.student_id === id ? { ...r, note: v } : r));

  const save = async (r: Row) => {
    const val = parseFloat(r.input);
    if (isNaN(val) || val < 0 || val > 100) { message.warning('请输入 0–100 的出勤率'); return; }
    setSavingId(r.student_id);
    try {
      const { error } = await db.from('students_info')
        .update({ school_attendance_rate: val, attendance_rate_updated_at: new Date().toISOString() })
        .eq('student_id', r.student_id);
      if (error) throw error;
      // 存一条出勤历史（含劝说备注），用于"反复/劝说"统计
      await db.from('attendance_persuasions').insert({
        student_id: r.student_id, rate: val, note: r.note?.trim() || null, created_by: operatorId,
      });
      const res = await recomputeRisk(r.student_id, operatorId);
      message.success(`已录入 ${val}%${res ? `，风险：${res.level === 'red' ? '红' : res.level === 'yellow' ? '黄' : '绿'}` : ''}`);
      setRows(rs => rs.map(x => x.student_id === r.student_id ? { ...x, rate: val } : x));
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setSavingId(null);
    }
  };

  const rateColor = (v: number) => (v < 93 ? 'p-red' : v < 95 ? 'p-red' : v < 97 ? 'p-amber' : 'p-green');
  const rateNote = (v: number) => (v < 93 ? '低于学校线' : v < 95 ? '违反合约线' : v < 97 ? '逼近合约线' : '正常');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;

  return (
    <Section title="官方出勤率录入" hint="每周一录入一次（来自学校账户）· 红线：合约 ≥95% / 学校 ≥93% · 右侧近14天缺勤供核对">
      <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
        <thead><tr>
          <th style={{ padding: '10px 12px' }}>学生</th>
          <th style={{ padding: '10px 12px' }}>近14天学校缺勤(参考)</th>
          <th style={{ padding: '10px 12px' }}>当前出勤率</th>
          <th style={{ padding: '10px 12px' }}>录入新值(%)</th>
          <th style={{ padding: '10px 12px' }}>劝说备注(可选)</th>
          <th style={{ padding: '10px 12px' }}></th>
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.student_id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
              <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.name || '—'}</td>
              <td style={{ padding: '10px 12px' }}>
                {r.recentAbsent > 0 ? <span className="pill p-amber">{r.recentAbsent} 次</span> : <span style={{ color: 'var(--color-text-tertiary)' }}>0</span>}
              </td>
              <td style={{ padding: '10px 12px' }}>
                {r.rate != null ? <span className={`pill ${rateColor(r.rate)}`}>{r.rate}% · {rateNote(r.rate)}</span> : <span style={{ color: 'var(--color-text-tertiary)' }}>未录入</span>}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <input className="input" style={{ width: 90, minHeight: 0, padding: '4px 8px' }} type="number" min={0} max={100} step="0.1"
                  value={r.input} onChange={e => setInput(r.student_id, e.target.value)} placeholder="%" />
              </td>
              <td style={{ padding: '10px 12px' }}>
                <input className="input" style={{ width: 180, minHeight: 0, padding: '4px 8px' }}
                  value={r.note} onChange={e => setNote(r.student_id, e.target.value)} placeholder="如已口头劝说…" />
              </td>
              <td style={{ padding: '10px 12px' }}>
                <button className="btn btn-primary" style={{ padding: '3px 12px', minHeight: 0, fontSize: 12 }}
                  disabled={savingId === r.student_id} onClick={() => save(r)}>
                  {savingId === r.student_id ? <IconLoader2 size={14} className="spinner" /> : '保存'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}
