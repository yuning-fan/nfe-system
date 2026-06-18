import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBell, IconAlertTriangle, IconShieldX, IconCertificate, IconUserShield } from '@tabler/icons-react';
import { supabase } from '../../lib/supabase';

interface NotifItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  count: number;
  to: string;
  color: string;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const db = supabase as any;
      // 待审批警告信
      const { count: pendingW } = await db.from('warning_letters')
        .select('id', { count: 'exact', head: true }).eq('status', 'pending_approval');
      // 红色风险学生
      const { count: redCnt } = await db.from('students_info')
        .select('student_id', { count: 'exact', head: true }).eq('risk_level', 'red');
      // 签证 90 天内到期
      const { data: visas } = await db.from('student_documents')
        .select('expiry_date, status').eq('doc_type', 'visa');
      const visaSoon = (visas || []).filter((v: any) => {
        if (!v.expiry_date || v.status === 'expired') return false;
        const d = Math.floor((new Date(v.expiry_date).getTime() - Date.now()) / 86400000);
        return d >= 0 && d <= 90;
      }).length;
      // DCG 监督报告逾期
      let dcgOverdue = 0;
      const { data: cases } = await db.from('dcg_cases')
        .select('id, archived_date').eq('stage', 'supervising');
      if (cases && cases.length) {
        const ids = cases.map((c: any) => c.id);
        const { data: reps } = await db.from('dcg_supervision_reports')
          .select('case_id, report_date').in('case_id', ids).order('report_date', { ascending: false });
        const latest: Record<number, string> = {};
        for (const r of reps || []) if (!latest[r.case_id]) latest[r.case_id] = r.report_date;
        for (const c of cases) {
          const base = latest[c.id] || c.archived_date;
          if (!base) continue;
          const due = new Date(base); due.setMonth(due.getMonth() + 1);
          if (due.getTime() < Date.now()) dcgOverdue++;
        }
      }

      setItems([
        { key: 'warn', icon: <IconAlertTriangle size={16} />, label: '待审批警告信', count: pendingW || 0, to: '/risk', color: '#854F0B' },
        { key: 'red', icon: <IconShieldX size={16} />, label: '红色风险学生', count: redCnt || 0, to: '/risk', color: '#A32D2D' },
        { key: 'visa', icon: <IconCertificate size={16} />, label: '签证 90 天内到期', count: visaSoon, to: '/docs', color: '#185FA5' },
        { key: 'dcg', icon: <IconUserShield size={16} />, label: 'DCG 监督报告逾期', count: dcgOverdue, to: '/students', color: '#854F0B' },
      ]);
    }
    load();
  }, []);

  // 点击外部关闭
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const total = items.reduce((s, i) => s + i.count, 0);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="icon-btn" onClick={() => setOpen(o => !o)}>
        <IconBell stroke={1.5} />
        {total > 0 && <div className="notif-badge">{total > 99 ? '99+' : total}</div>}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 40, right: 0, width: 280, zIndex: 100,
          background: 'var(--color-background-primary)', borderRadius: 10,
          border: '0.5px solid var(--color-border-secondary)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 13, fontWeight: 600 }}>
            待办提醒 {total > 0 && <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>· 共 {total} 项</span>}
          </div>
          {total === 0 ? (
            <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
              暂无待办，一切正常 🎉
            </div>
          ) : (
            items.filter(i => i.count > 0).map(i => (
              <div key={i.key}
                onClick={() => { setOpen(false); navigate(i.to); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '0.5px solid var(--color-border-tertiary)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: i.color, display: 'flex' }}>{i.icon}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{i.label}</span>
                <span className="pill" style={{ background: i.color, color: '#fff' }}>{i.count}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
