// 巡查老师 · 详情页（晚自习点名/出勤率录入/我的学生/违规记录/学习跟进均已接真功能）
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { IconLoader2, IconSearch, IconNotebook } from '@tabler/icons-react';
import { Section, riskPill, pill } from '../ui';
import RollCall from '../components/RollCall';
import { RISK_WINDOW_DAYS } from '../../lib/riskEngine';
import { RISK_LEVEL_LABEL } from '../../lib/riskLabels';

const db = supabase as any;

const CAT_LABEL: Record<string, string> = {
  homework_check: '作业核查', night_study: '晚自习跟进', recitation: '带背考察',
  mini_tutoring: '个辅记录', key_points: '重难点梳理',
};

interface StudentRow {
  student_id: string;
  name: string;
  school: string;
  dorm: string;
  violRecent: number;        // 近15天违规（与风险引擎同口径）
  violTotal: number;
  lastFollowUp: string;      // 最近一条跟进：MM-DD 类别
  pendingFollowUps: number;  // 挂着的待跟进数
  riskLevel: 'red' | 'yellow' | 'green';
}

export function PatrolStudents() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fRisk, setFRisk] = useState<string>('all');   // all | red | yellow | green | pending(有待跟进)

  const load = useCallback(async () => {
    setLoading(true);
    const since15 = new Date(Date.now() - RISK_WINDOW_DAYS * 86400000).toISOString();
    const [{ data: infos }, { data: dorms }, { data: viols }, { data: fus }] = await Promise.all([
      db.from('students_info').select('student_id, school_name, risk_level, profiles!student_id(full_name)'),
      db.from('dorm_assignments').select('student_id, dorms(building_name, room_number)').eq('is_active', true),
      db.from('violation_logs').select('student_id, created_at'),
      db.from('study_follow_ups').select('student_id, category, needs_followup, created_at').order('created_at', { ascending: false }),
    ]);
    const dormOf: Record<string, string> = {};
    for (const d of (dorms || []) as any[]) {
      const dm = Array.isArray(d.dorms) ? d.dorms[0] : d.dorms;
      if (dm) dormOf[d.student_id] = `${dm.building_name} · ${dm.room_number}`;
    }
    const violRecent: Record<string, number> = {};
    const violTotal: Record<string, number> = {};
    for (const v of (viols || []) as any[]) {
      violTotal[v.student_id] = (violTotal[v.student_id] || 0) + 1;
      if (v.created_at >= since15) violRecent[v.student_id] = (violRecent[v.student_id] || 0) + 1;
    }
    const lastFu: Record<string, string> = {};
    const pendingFu: Record<string, number> = {};
    for (const f of (fus || []) as any[]) {
      if (!lastFu[f.student_id]) {
        const d = new Date(f.created_at);
        lastFu[f.student_id] = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')} ${CAT_LABEL[f.category] || f.category}`;
      }
      if (f.needs_followup) pendingFu[f.student_id] = (pendingFu[f.student_id] || 0) + 1;
    }

    const list: StudentRow[] = ((infos || []) as any[]).map(i => ({
      student_id: i.student_id,
      name: Array.isArray(i.profiles) ? i.profiles[0]?.full_name : i.profiles?.full_name,
      school: i.school_name || '—',
      dorm: dormOf[i.student_id] || '—',
      violRecent: violRecent[i.student_id] || 0,
      violTotal: violTotal[i.student_id] || 0,
      lastFollowUp: lastFu[i.student_id] || '',
      pendingFollowUps: pendingFu[i.student_id] || 0,
      riskLevel: (i.risk_level || 'green') as 'red' | 'yellow' | 'green',
    })).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh'));
    setRows(list);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r =>
    (fRisk === 'all' ? true : fRisk === 'pending' ? r.pendingFollowUps > 0 : r.riskLevel === fRisk) &&
    (!search.trim() || (r.name || '').toLowerCase().includes(search.trim().toLowerCase()))
  );
  const pendingTotal = rows.reduce((a, r) => a + r.pendingFollowUps, 0);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;

  return (
    <Section title="学生基本信息" hint="只读 · 违规口径：近15天（与风险引擎同窗口）/ 总计。如需更新学生信息请联系学管老师。">
      {/* 筛选行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {([['all', '全部'], ['red', RISK_LEVEL_LABEL.red], ['yellow', RISK_LEVEL_LABEL.yellow], ['green', RISK_LEVEL_LABEL.green], ['pending', `有待跟进 ${pendingTotal ? `(${pendingTotal})` : ''}`]] as [string, string][]).map(([v, l]) => (
          <button key={v} className={`btn ${fRisk === v ? 'btn-primary' : ''}`}
            style={{ padding: '3px 12px', minHeight: 0, fontSize: 12 }} onClick={() => setFRisk(v)}>
            {l}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <IconSearch size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input className="input" style={{ width: 160, minHeight: 0, padding: '4px 8px 4px 26px', fontSize: 12 }}
            placeholder="搜索姓名" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>无匹配学生</div>
      ) : (
        <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
          <thead><tr>
            <th style={{ padding: '10px 12px' }}>姓名</th>
            <th style={{ padding: '10px 12px' }}>学校</th>
            <th style={{ padding: '10px 12px' }}>住宿</th>
            <th style={{ padding: '10px 12px' }}>违规（近15天/总）</th>
            <th style={{ padding: '10px 12px' }}>最近跟进</th>
            <th style={{ padding: '10px 12px' }}>待跟进</th>
            <th style={{ padding: '10px 12px' }}>风险状态</th>
            <th style={{ padding: '10px 12px' }}></th>
          </tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.student_id} style={{ borderTop: '1px solid var(--color-border-tertiary)', background: r.pendingFollowUps > 0 ? 'rgba(239,159,39,0.05)' : undefined }}>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.name || '—'}</td>
                <td style={{ padding: '10px 12px' }}>{r.school}</td>
                <td style={{ padding: '10px 12px' }}>{r.dorm}</td>
                <td style={{ padding: '10px 12px' }}>
                  {r.violRecent > 0 ? <span className="pill p-red">{r.violRecent} 次</span> : <span style={{ color: 'var(--color-text-tertiary)' }}>0</span>}
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}> / {r.violTotal}</span>
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{r.lastFollowUp || '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  {r.pendingFollowUps > 0
                    ? <span className="link" onClick={() => navigate(`../follow-ups?tab=pending&student=${r.student_id}`)}>{pill('p-amber', `${r.pendingFollowUps} 项`)}</span>
                    : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                </td>
                <td style={{ padding: '10px 12px' }}>{riskPill(r.riskLevel)}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  <span className="link" onClick={() => navigate(`../follow-ups?student=${r.student_id}`)}>
                    <IconNotebook size={13} style={{ verticalAlign: 'middle' }} /> 记跟进
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

export function PatrolRollcall() {
  // 晚自习点名：应到=全体在读，缺席写 daily_checks(night_study)，自动扣分
  return <RollCall checkType="night_study" title="晚自习点名" hint="18:00 全体点名 · 应到=全体在读学生" />;
}

// 作业核查已并入「学习跟进」（study_follow_ups 的 homework_check 类别），见 pages/followUps.tsx
// 违规记录（真功能）：复用学管的 ViolationLog（登记 + 扣分 + 申请三步走警告信），见 StaffSubPage 注册表
