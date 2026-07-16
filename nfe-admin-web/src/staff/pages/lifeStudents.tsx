// 生活老师 · 学生基本信息（只读，名下公寓学生）
// 紧急联系人 / 健康·饮食备注 / 风险等级 / 住宿房间
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { getGuardedStudentIds } from '../../lib/guardedStudents';
import { normalizeRiskLevel } from '../../lib/riskLabels';
import { Section, riskPill } from '../ui';
import { IconLoader2 } from '@tabler/icons-react';

const db = supabase as any;

interface Row {
  id: string;
  name: string;
  room: string;
  contactName: string;
  contactPhone: string;
  health: string;
  risk: 'red' | 'yellow' | 'green';
}

export function LifeStudents() {
  const staffId = useAuthStore(s => s.user?.id ?? null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const ids = await getGuardedStudentIds(staffId);
    if (ids.length === 0) { setRows([]); setLoading(false); return; }

    const [{ data: infos }, { data: assigns }] = await Promise.all([
      db.from('students_info')
        .select('student_id, emergency_contact_name, emergency_contact_phone, health_notes, risk_level, profiles(full_name)')
        .in('student_id', ids),
      db.from('dorm_assignments')
        .select('student_id, dorms(building_name, room_number)')
        .in('student_id', ids)
        .eq('is_active', true),
    ]);

    const roomOf: Record<string, string> = {};
    for (const a of (assigns || []) as any[]) {
      const d = a.dorms;
      if (d) roomOf[a.student_id] = `${d.building_name} · ${d.room_number}`;
    }

    const list: Row[] = ((infos || []) as any[]).map(i => ({
      id: i.student_id,
      name: i.profiles?.full_name || '未知',
      room: roomOf[i.student_id] || '—',
      contactName: i.emergency_contact_name || '—',
      contactPhone: i.emergency_contact_phone || '—',
      health: i.health_notes || '无',
      risk: normalizeRiskLevel(i.risk_level),
    })).sort((a, b) => a.name.localeCompare(b.name, 'zh'));

    setRows(list);
    setLoading(false);
  }, [staffId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;
  }

  return (
    <Section title="学生基本信息" hint={`名下公寓在住学生 ${rows.length} 人 · 紧急联系人 / 健康饮食（只读）`}>
      {rows.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
          暂无名下公寓学生（未绑定公寓或公寓无在住学生）
        </div>
      ) : (
        <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr>
              {['姓名', '住宿房间', '紧急联系人', '联系方式', '健康/饮食备注', '风险'].map(c => (
                <th key={c} style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: '10px 12px' }}>{r.room}</td>
                <td style={{ padding: '10px 12px' }}>{r.contactName}</td>
                <td style={{ padding: '10px 12px' }}>{r.contactPhone}</td>
                <td style={{ padding: '10px 12px', color: r.health !== '无' ? 'var(--color-danger)' : undefined }}>{r.health}</td>
                <td style={{ padding: '10px 12px' }}>{riskPill(r.risk)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
