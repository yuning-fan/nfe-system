// 学生档案 · 学业 tab 考核节点卡：按「已选科目」展示节点树与 DDL
// 节点挂在 program_subjects 上（不挂学生），所以这里用选课记录来圈定「这个学生要看哪几门」。
import { useMemo, useState } from 'react';
import { IconTarget, IconAlertTriangle } from '@tabler/icons-react';
import { intakeLabel } from '../../lib/intakeDates';

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');
const typeLabel = (t: string) => ({ exam: '考试', assignment: '作业', report_due: '报告' } as any)[t] || t;

// 到期天数：负数=已过期
const daysTo = (d: string) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(d + 'T00:00:00').getTime() - today.getTime()) / 86400000);
};

export default function AssessmentNodesCard({ student }: { student: any }) {
  const nodes: any[] = student.assessment_nodes || [];
  const meta: any[] = student.program_subjects_meta || [];
  const selections: any[] = student.subject_selections || [];
  const [showAll, setShowAll] = useState(false);

  // 该生选了哪些科目 → 只看这些科目下的节点
  const subjectIds = useMemo(
    () => Array.from(new Set(selections.map(s => s.program_subject_id).filter(Boolean))),
    [selections]
  );
  const mine = useMemo(
    () => nodes.filter(n => subjectIds.includes(n.program_subject_id)),
    [nodes, subjectIds]
  );

  // 叶子节点才是真正的 DDL：有子项的顶层是「评估组」，它的日期只是组内最后一次交
  const leaves = useMemo(() => {
    const parentIds = new Set(mine.filter(n => n.parent_id).map(n => n.parent_id));
    return mine.filter(n => !parentIds.has(n.id) && n.due_date)
               .sort((a, b) => a.due_date.localeCompare(b.due_date) || hhmm(a.due_time).localeCompare(hhmm(b.due_time)));
  }, [mine]);

  const upcoming = leaves.filter(n => daysTo(n.due_date) >= 0);
  const shown = showAll ? leaves : upcoming.slice(0, 6);

  if (subjectIds.length === 0 || mine.length === 0) {
    return (
      <div className="card">
        <div className="card-title">考核节点与 DDL</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '20px 0', textAlign: 'center' }}>
          {subjectIds.length === 0
            ? '该生尚无选课记录 —— 到「学业跟进 → 选课与建档」为其选课后，这里会带出对应科目的考核节点。'
            : '已选科目尚未配置考核节点 —— 到「学业跟进 → 考核节点配置」添加。'}
        </div>
      </div>
    );
  }

  const nameOf = (sid: number) => meta.find(m => m.id === sid)?.subject_name || '科目';
  const termOf = (sid: number) => {
    const m = meta.find(x => x.id === sid);
    return m && (m.year || m.semester) ? `${m.year || ''} ${m.semester || ''}`.trim() : '';
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div className="card-title" style={{ margin: 0 }}>
          <IconTarget size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          考核节点与 DDL
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
            {subjectIds.length} 门 · {leaves.length} 个 DDL（待交 {upcoming.length}）
          </span>
        </div>
        <span className="link" style={{ fontSize: 12 }} onClick={() => setShowAll(v => !v)}>
          {showAll ? '只看待交' : `看全部 ${leaves.length} 条`}
        </span>
      </div>

      {/* 近期 DDL 清单 */}
      {shown.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '12px 0' }}>本学期 DDL 已全部过期。</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {shown.map(n => {
            const d = daysTo(n.due_date);
            const cls = d < 0 ? 'p-gray' : d <= 3 ? 'p-red' : d <= 7 ? 'p-amber' : 'p-blue';
            return (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                padding: '8px 10px', borderRadius: 6,
                background: 'var(--color-background-secondary)',
                borderLeft: `3px solid ${d < 0 ? 'var(--color-border)' : d <= 3 ? 'var(--color-danger)' : 'var(--color-primary)'}`,
                opacity: d < 0 ? 0.55 : 1,
              }}>
                <span className={`pill ${cls}`} style={{ fontSize: 10, minWidth: 60, textAlign: 'center' }}>
                  {d < 0 ? '已过期' : d === 0 ? '今天' : `${d} 天后`}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 74 }}>{nameOf(n.program_subject_id)}</span>
                <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 180 }}>{n.title}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                  {n.due_date} {hhmm(n.due_time) || '23:59'}
                </span>
                {n.date_source === 'unverified' && (
                  <span className="pill p-amber" style={{ fontSize: 10 }}
                    title={`该科默认日期按 ${intakeLabel(meta.find(x => x.id === n.program_subject_id)?.node_dates_intake)} 录入，该生属于 ${intakeLabel(n.intake_start)}，尚未单独设置本批次日期`}>日期待核</span>
                )}
                {n.date_source === 'intake' && <span className="pill p-blue" style={{ fontSize: 10 }}>{intakeLabel(n.intake_start)}</span>}
                {n.note && n.note.includes('⚠️') && (
                  <IconAlertTriangle size={14} style={{ color: '#854F0B' }} title={n.note} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 按科目的权重结构 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {subjectIds.map((sid: any) => {
          const subjNodes = mine.filter(n => n.program_subject_id === sid);
          const tops = subjNodes.filter(n => !n.parent_id);
          if (tops.length === 0) return null;
          const sum = tops.reduce((a, n) => a + (Number(n.weight_percent) || 0), 0);
          const m = meta.find(x => x.id === sid);
          return (
            <div key={sid} style={{ border: '1px solid var(--color-border-tertiary)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>
                  {nameOf(sid)}
                  {termOf(sid) && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 6 }}>{termOf(sid)}</span>}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  过线 {m?.pass_mark ?? 50} · 权重合计 {sum}%{Math.round(sum) === 100 ? ' ✓' : ' ⚠️'}
                </span>
              </div>
              {subjNodes.some(n => n.date_source === 'unverified') && (
                <div style={{ fontSize: 12, color: '#854F0B', marginBottom: 8 }}>
                  ⚠️ 本科节点日期按 {intakeLabel(m?.node_dates_intake)} 录入，该生属于 {intakeLabel(subjNodes[0]?.intake_start)}；标「日期待核」的节点尚未设置本批次日期，DDL 仅供参考。
                </div>
              )}
              {m?.description && (
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>{m.description}</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tops.map(t => {
                  const kids = subjNodes.filter(k => k.parent_id === t.id)
                    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
                  return (
                    <div key={t.id}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '5px 0', fontSize: 13 }}>
                        <span style={{ fontWeight: 500 }}>{t.title}</span>
                        {t.is_major && <span className="pill p-red" style={{ fontSize: 10 }}>主要</span>}
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                          {t.weight_percent != null ? `${t.weight_percent}%` : '—'} · {typeLabel(t.milestone_type)}
                          {t.mode === 'secure' ? ' · 线下' : ''}
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          {t.due_date} {hhmm(t.due_time) || ''}
                        </span>
                      </div>
                      {kids.map(k => (
                        <div key={k.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '3px 0 3px 20px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          <span>↳ {k.title}</span>
                          <span>{k.weight_percent != null ? `${k.weight_percent}%（占父）` : '不计权重'}</span>
                          <span style={{ marginLeft: 'auto' }}>{k.due_date} {hhmm(k.due_time) || ''}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
