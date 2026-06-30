// 学管工作台首页 · 待处理聚合
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { IconLoader2, IconAlertTriangle, IconCalendarStats, IconShieldX, IconChevronRight } from '@tabler/icons-react';

const db = supabase as any;

interface Counts {
  pendingSchedules: number;
  pendingReschedules: number;
  pendingWarnings: number;
  red: number;
  yellow: number;
}

export default function AcademicHome() {
  const [c, setC] = useState<Counts | null>(null);

  const load = useCallback(async () => {
    const headCount = async (tbl: string, build: (q: any) => any) => {
      const q = build(db.from(tbl).select('*', { count: 'exact', head: true }));
      const { count } = await q;
      return count || 0;
    };
    const [pendingSchedules, pendingReschedules, pendingWarnings, red, yellow] = await Promise.all([
      headCount('schedules', (q: any) => q.eq('status', 'pending_approval')),
      headCount('schedule_changes', (q: any) => q.eq('status', 'pending')),
      headCount('warning_letters', (q: any) => q.eq('status', 'pending_approval')),
      headCount('students_info', (q: any) => q.eq('risk_level', 'red')),
      headCount('students_info', (q: any) => q.eq('risk_level', 'yellow')),
    ]);
    setC({ pendingSchedules, pendingReschedules, pendingWarnings, red, yellow });
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!c) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;

  const todos: { label: string; n: number; to: string; danger?: boolean }[] = [
    { label: '待审批排课申请', n: c.pendingSchedules, to: '/staff/academic/academic' },
    { label: '待审批调课申请', n: c.pendingReschedules, to: '/staff/academic/academic' },
    { label: '待审批警告信', n: c.pendingWarnings, to: '/staff/academic/risk', danger: true },
  ].filter(t => t.n > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 风险概览 */}
      <div className="g3">
        <Link to="/staff/academic/risk" className="stat-card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="stat-label"><IconShieldX size={14} style={{ verticalAlign: 'middle' }} /> 🔴 红色风险</div>
          <div className="stat-val" style={{ color: '#A32D2D' }}>{c.red}</div>
          <div className="stat-sub">需重点干预</div>
        </Link>
        <Link to="/staff/academic/risk" className="stat-card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="stat-label"><IconAlertTriangle size={14} style={{ verticalAlign: 'middle' }} /> 🟡 黄色关注</div>
          <div className="stat-val" style={{ color: '#854F0B' }}>{c.yellow}</div>
          <div className="stat-sub">需要关注</div>
        </Link>
        <Link to="/staff/academic/academic" className="stat-card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="stat-label"><IconCalendarStats size={14} style={{ verticalAlign: 'middle' }} /> 待审批合计</div>
          <div className="stat-val">{c.pendingSchedules + c.pendingReschedules + c.pendingWarnings}</div>
          <div className="stat-sub">排课/调课/警告信</div>
        </Link>
      </div>

      {/* 待处理清单 */}
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
    </div>
  );
}
