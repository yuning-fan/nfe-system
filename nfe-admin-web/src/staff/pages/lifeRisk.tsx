// 生活老师 · 风险预警（只读，名下公寓学生）
// 生活维度关注：查寝未在、晚归、深夜外出等 —— 只展示等级，不做警告信操作。
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { getGuardedStudentIds } from '../../lib/guardedStudents';
import { normalizeRiskLevel } from '../../lib/riskLabels';
import { Section, riskPill } from '../ui';
import { IconLoader2 } from '@tabler/icons-react';

const db = supabase as any;

interface RiskRow {
  id: string;
  name: string;
  score: number;
  level: 'red' | 'yellow' | 'green';
}

export function LifeRisk() {
  const staffId = useAuthStore(s => s.user?.id ?? null);
  const [rows, setRows] = useState<RiskRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const ids = await getGuardedStudentIds(staffId);
    if (ids.length === 0) { setRows([]); setLoading(false); return; }
    const { data } = await db
      .from('students_info')
      .select('student_id, total_risk_score, risk_level, profiles!student_id(full_name)')
      .in('student_id', ids);
    const list: RiskRow[] = ((data || []) as any[]).map(i => ({
      id: i.student_id,
      name: i.profiles?.full_name || '未知',
      score: i.total_risk_score ?? 100,
      level: normalizeRiskLevel(i.risk_level),
    }));
    // 红→黄→绿排序
    const rank = { red: 0, yellow: 1, green: 2 } as const;
    list.sort((a, b) => rank[a.level] - rank[b.level] || a.score - b.score);
    setRows(list);
    setLoading(false);
  }, [staffId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;
  }

  const attention = rows.filter(r => r.level !== 'green');

  return (
    <>
      <Section title="当前风险学生" hint="名下公寓 · 红/黄等级（只读，风险分由系统按出勤/违规等自动计算）">
        {attention.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>名下公寓暂无风险学生 🟢</div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>{['学生', '风险分', '等级'].map(c => (
                <th key={c} style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{c}</th>
              ))}</tr>
            </thead>
            <tbody>
              {attention.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.name}</td>
                  <td style={{ padding: '10px 12px' }}>{r.score}</td>
                  <td style={{ padding: '10px 12px' }}>{riskPill(r.level)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="生活维度评级说明">
        <div style={{ fontSize: 13, lineHeight: 1.9 }}>
          <div>{riskPill('red')} 查寝连续未在、深夜外出、打架等重大违规</div>
          <div>{riskPill('yellow')} 晚归累计、卫生屡次不合格、违反宿舍规定</div>
          <div style={{ marginTop: 8, color: 'var(--color-text-tertiary)', fontSize: 12 }}>
            生活维度风险升级会自动同步至学管老师；风险分由查寝/出勤/违规等录入即时重算。
          </div>
        </div>
      </Section>
    </>
  );
}
