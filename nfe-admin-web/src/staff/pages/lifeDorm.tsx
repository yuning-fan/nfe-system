// 生活老师 · 住宿管理（三 tab：晚上查寝 / 白天巡查 / 卫生检查）
// 晚上查寝：查寝点名(dorm_check→风险引擎扣分) + 外宿审批 + 违规只读
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { getGuardedStudentIds } from '../../lib/guardedStudents';
import RollCall from '../components/RollCall';
import { Section } from '../ui';
import { message } from 'antd';
import { IconLoader2 } from '@tabler/icons-react';
import { LifeDormHygiene } from './lifeDormHygiene';

const db = supabase as any;

interface Overnight {
  id: number;
  studentName: string;
  start: string;
  end: string;
  reason: string;
}
interface Violation {
  id: number;
  studentName: string;
  type: string;
  reason: string;
  status: string;
  date: string;
}

const fmt = (iso: string | null) => (iso ? iso.slice(0, 16).replace('T', ' ') : '—');

// 两 tab 壳（白天巡查暂不需要，已移除）
type DormTab = 'night' | 'hygiene';
export function LifeDorm() {
  const [tab, setTab] = useState<DormTab>('night');
  const tabs: { k: DormTab; label: string }[] = [
    { k: 'night', label: '晚上查寝' },
    { k: 'hygiene', label: '卫生检查' },
  ];
  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.k} className={`btn ${tab === t.k ? 'btn-primary' : ''}`} onClick={() => setTab(t.k)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'night' && <LifeDormNight />}
      {tab === 'hygiene' && <LifeDormHygiene />}
    </>
  );
}

function LifeDormNight() {
  const staffId = useAuthStore(s => s.user?.id ?? null);
  const [overnight, setOvernight] = useState<Overnight[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const ids = await getGuardedStudentIds(staffId);
    if (ids.length === 0) { setOvernight([]); setViolations([]); setLoading(false); return; }

    const nameMap: Record<string, string> = {};
    const { data: profs } = await db.from('profiles').select('id, full_name').in('id', ids);
    for (const p of (profs || []) as any[]) nameMap[p.id] = p.full_name;

    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ data: leaves }, { data: vios }] = await Promise.all([
      db.from('leave_applications')
        .select('id, student_id, start_time, end_time, reason, status, leave_type')
        .eq('leave_type', 'overnight_stay')
        .eq('status', 'pending')
        .in('student_id', ids)
        .order('start_time', { ascending: true }),
      db.from('violation_logs')
        .select('id, student_id, violation_type, reason, status, created_at')
        .in('student_id', ids)
        .gte('created_at', since)
        .order('created_at', { ascending: false }),
    ]);

    setOvernight(((leaves || []) as any[]).map(l => ({
      id: l.id,
      studentName: nameMap[l.student_id] || '未知',
      start: fmt(l.start_time),
      end: fmt(l.end_time),
      reason: l.reason || '—',
    })));
    setViolations(((vios || []) as any[]).map(v => ({
      id: v.id,
      studentName: nameMap[v.student_id] || '未知',
      type: v.violation_type || '违规',
      reason: v.reason || '',
      status: v.status || 'pending',
      date: (v.created_at || '').slice(0, 10),
    })));
    setLoading(false);
  }, [staffId]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: number, status: 'approved' | 'rejected') => {
    const { error } = await db.from('leave_applications')
      .update({ status, approver_id: staffId, approved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { message.error('操作失败'); return; }
    message.success(status === 'approved' ? '已批准外宿' : '已拒绝');
    load();
  };

  return (
    <>
      {/* 1) 查寝点名 —— 复用通用点名，名下公寓在住学生 */}
      <RollCall
        checkType="dorm_check"
        scope="my_dorm"
        title="晚上查寝"
        hint="22:45–23:00 全体在寝记录 · 只标未在寝(缺席)与请假，异常自动扣分"
      />

      {/* 2) 外宿审批 */}
      <Section title="外宿审批" hint="待审批的周末/临时外宿申请">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><IconLoader2 className="spinner" size={22} /></div>
        ) : overnight.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无待审批外宿申请</div>
        ) : overnight.map(o => (
          <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--color-border-tertiary)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{o.studentName}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{o.start} ~ {o.end} · {o.reason}</div>
            </div>
            <button className="btn btn-primary" style={{ padding: '4px 12px', minHeight: 0 }} onClick={() => decide(o.id, 'approved')}>批准</button>
            <button className="btn" style={{ padding: '4px 12px', minHeight: 0, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => decide(o.id, 'rejected')}>拒绝</button>
          </div>
        ))}
      </Section>

      {/* 3) 晚归/未归违规（只读，登记走违规记录页） */}
      <Section title="近 30 天违规记录" hint="晚归 / 查寝未在 等 · 只读展示，登记与存档在「违规记录」处理">
        {loading ? null : violations.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>近 30 天无违规记录</div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>{['学生', '类型', '说明', '状态', '日期'].map(c => (
                <th key={c} style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{c}</th>
              ))}</tr>
            </thead>
            <tbody>
              {violations.map(v => (
                <tr key={v.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{v.studentName}</td>
                  <td style={{ padding: '10px 12px' }}>{v.type}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{v.reason}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`pill ${v.status === 'archived' ? 'p-green' : 'p-amber'}`}>{v.status === 'archived' ? '已存档' : '待存档'}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{v.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </>
  );
}
