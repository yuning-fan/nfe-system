// 生活管理工作台首页 · 待处理聚合（限名下公寓学生）
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { getGuardedStudentIds } from '../lib/guardedStudents';
import { normalizeRiskLevel } from '../lib/riskLabels';
import {
  IconLoader2, IconChevronRight, IconShieldX, IconAlertTriangle,
  IconDoorExit, IconPill, IconSun, IconBed,
} from '@tabler/icons-react';

const db = supabase as any;

interface Data {
  red: number;
  yellow: number;
  overnight: number;
  pendingMeds: number;
  attention: { id: string; name: string; level: 'red' | 'yellow' }[];
}

export default function LifeHome() {
  const staffId = useAuthStore(s => s.user?.id ?? null);
  const [d, setD] = useState<Data | null>(null);

  const load = useCallback(async () => {
    const ids = await getGuardedStudentIds(staffId);
    if (ids.length === 0) {
      setD({ red: 0, yellow: 0, overnight: 0, pendingMeds: 0, attention: [] });
      return;
    }

    const [{ data: infos }, { count: overnight }, { data: medRows }] = await Promise.all([
      db.from('students_info').select('student_id, risk_level, profiles(full_name)').in('student_id', ids),
      db.from('leave_applications').select('*', { count: 'exact', head: true })
        .eq('leave_type', 'overnight_stay').eq('status', 'pending').in('student_id', ids),
      db.from('medications').select('id').eq('is_active', true).not('daily_time', 'is', null).in('student_id', ids),
    ]);

    const attention: Data['attention'] = [];
    let red = 0, yellow = 0;
    for (const i of (infos || []) as any[]) {
      const lvl = normalizeRiskLevel(i.risk_level);
      if (lvl === 'red') { red++; attention.push({ id: i.student_id, name: i.profiles?.full_name || '未知', level: 'red' }); }
      else if (lvl === 'yellow') { yellow++; attention.push({ id: i.student_id, name: i.profiles?.full_name || '未知', level: 'yellow' }); }
    }
    attention.sort((a, b) => (a.level === b.level ? 0 : a.level === 'red' ? -1 : 1));

    setD({ red, yellow, overnight: overnight || 0, pendingMeds: (medRows || []).length, attention });
  }, [staffId]);

  useEffect(() => { load(); }, [load]);

  if (!d) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;

  const todos = [
    { label: '待审批外宿申请', n: d.overnight, to: '/staff/life/dorm', danger: false },
    { label: '今日待分发药物', n: d.pendingMeds, to: '/staff/life/meds', danger: false },
  ].filter(t => t.n > 0);

  const shortcuts = [
    { label: '早上出勤确认', to: '/staff/life/morning', icon: <IconSun size={16} /> },
    { label: '晚上查寝', to: '/staff/life/dorm', icon: <IconBed size={16} /> },
    { label: '药物分发', to: '/staff/life/meds', icon: <IconPill size={16} /> },
    { label: '外宿审批', to: '/staff/life/dorm', icon: <IconDoorExit size={16} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 风险概览 */}
      <div className="g3">
        <Link to="/staff/life/risk" className="stat-card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="stat-label"><IconShieldX size={14} style={{ verticalAlign: 'middle' }} /> 🔴 红色风险</div>
          <div className="stat-val" style={{ color: '#A32D2D' }}>{d.red}</div>
          <div className="stat-sub">需重点关注</div>
        </Link>
        <Link to="/staff/life/risk" className="stat-card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="stat-label"><IconAlertTriangle size={14} style={{ verticalAlign: 'middle' }} /> 🟡 黄色关注</div>
          <div className="stat-val" style={{ color: '#854F0B' }}>{d.yellow}</div>
          <div className="stat-sub">需要关注</div>
        </Link>
        <Link to="/staff/life/dorm" className="stat-card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="stat-label"><IconDoorExit size={14} style={{ verticalAlign: 'middle' }} /> 待审批外宿</div>
          <div className="stat-val">{d.overnight}</div>
          <div className="stat-sub">周末/临时外宿</div>
        </Link>
      </div>

      {/* 待处理 */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>待处理</div>
        {todos.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>暂无待处理事项 🎉</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {todos.map((t, i) => (
              <Link key={i} to={t.to} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 4px', borderTop: i ? '1px solid var(--color-border-tertiary)' : 'none',
                color: 'inherit', textDecoration: 'none',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`pill ${t.danger ? 'p-red' : 'p-blue'}`}>{t.n}</span>
                  {t.label}
                </span>
                <IconChevronRight size={16} style={{ color: 'var(--color-text-tertiary)' }} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 关注学生 + 快捷入口 */}
      <div className="g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>关注学生</div>
          {d.attention.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>名下暂无风险学生 🟢</div>
          ) : d.attention.map((s, i) => (
            <Link key={s.id} to="/staff/life/risk" style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 4px',
              borderTop: i ? '1px solid var(--color-border-tertiary)' : 'none', color: 'inherit', textDecoration: 'none',
            }}>
              <span>{s.level === 'red' ? '🔴' : '🟡'}</span>
              <span style={{ fontWeight: 500 }}>{s.name}</span>
            </Link>
          ))}
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>快捷入口</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {shortcuts.map(s => (
              <Link key={s.label} to={s.to} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 12px',
                background: 'var(--color-bg-secondary)', borderRadius: 8, color: 'inherit', textDecoration: 'none',
              }}>
                <span style={{ color: 'var(--color-primary)' }}>{s.icon}</span>
                <span style={{ fontWeight: 500, fontSize: 14 }}>{s.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
