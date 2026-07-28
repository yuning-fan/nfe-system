// 学生档案 · 学业 tab 成绩单卡：按科目展示考核节点得分 + 加权总评 + 过线 + 提分趋势
import { computeSubject, computeRequirement } from '../../lib/gradeCalc';

export default function GradebookCard({ student }: { student: any }) {
  const grades: any[] = student.grade_records || [];
  const nodes: any[] = student.assessment_nodes || [];
  const subjectsMeta: any[] = student.program_subjects_meta || [];

  // 学生有成绩的科目
  const subjectIds = Array.from(new Set(grades.map(g => g.program_subject_id).filter(Boolean)));

  if (subjectIds.length === 0) {
    return (
      <div className="card">
        <div className="card-title">成绩单</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '20px 0', textAlign: 'center' }}>暂无成绩记录</div>
      </div>
    );
  }

  const scoreOf = (nodeId: number) => {
    const g = grades.find(x => x.milestone_id === nodeId);
    return g ? Number(g.score) : null;
  };

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 12 }}>成绩单</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {subjectIds.map((sid: any) => {
          const meta = subjectsMeta.find(s => s.id === sid);
          const passMark = meta?.pass_mark ?? 50;
          const subjectNodes = nodes.filter(n => n.program_subject_id === sid);
          const r = computeSubject(subjectNodes, scoreOf, passMark);
          const req = computeRequirement(r, passMark);
          // 趋势：该科已录成绩按日期
          const trend = grades
            .filter(g => g.program_subject_id === sid && g.recorded_at)
            .sort((a, b) => (a.recorded_at || '').localeCompare(b.recorded_at || ''))
            .map(g => Number(g.score));

          return (
            <div key={sid} style={{ border: '1px solid var(--color-border-tertiary)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontWeight: 600 }}>{meta?.subject_name || '科目'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span>总评 <b style={{ fontSize: 16 }}>{r.total != null ? r.total : `${r.earnedPoints}*`}</b> / 过线 {passMark}</span>
                  {r.total == null
                    ? <span className="pill p-amber">进行中 已评{Math.round(r.gradedWeight)}%</span>
                    : r.pass ? <span className="pill p-green">已过线 ✓</span> : <span className="pill p-red">未过线</span>}
                </span>
              </div>

              {/* 达标预测：剩余考核还需拿到多少平均分 */}
              {req.status !== 'done' && (
                <div style={{ marginBottom: 8, fontSize: 12 }}>
                  {req.status === 'achievable' && (
                    <span className={req.requiredAvg! > 85 ? 'pill p-red' : req.requiredAvg! > 70 ? 'pill p-amber' : 'pill p-green'}>
                      剩余 {req.remainingWeight}% 需均分 ≥ <b>{req.requiredAvg}</b> 才能过线
                    </span>
                  )}
                  {req.status === 'secured' && (
                    <span className="pill p-green">已锁定过线（剩余 {req.remainingWeight}% 即使为0也达标）</span>
                  )}
                  {req.status === 'impossible' && (
                    <span className="pill p-red">
                      ⚠️ 剩余 {req.remainingWeight}% 即使全满分也无法过线（尚差 {req.gapPoints} 分）
                    </span>
                  )}
                </div>
              )}

              {/* 节点得分 */}
              <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
                <tbody>
                  {r.rows.map(row => {
                    const top = row.node as any;
                    const hasKids = row.children.length > 0;
                    return [
                      <tr key={top.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                        <td style={{ padding: '6px 8px' }}>{top.title} <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>({row.weight}%)</span></td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', width: 70 }}>
                          {hasKids ? (row.score == null ? '—' : Math.round(row.score * 10) / 10) : (row.score == null ? <span style={{ color: 'var(--color-text-tertiary)' }}>待录</span> : row.score)}
                        </td>
                      </tr>,
                      ...row.children.map(c => {
                        const cn = c.node as any;
                        return (
                          <tr key={cn.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                            <td style={{ padding: '6px 8px 6px 24px', color: 'var(--color-text-secondary)', fontSize: 13 }}>↳ {cn.title} <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>({c.weight}%占父)</span></td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{c.score == null ? <span style={{ color: 'var(--color-text-tertiary)' }}>待录</span> : c.score}</td>
                          </tr>
                        );
                      }),
                    ];
                  })}
                </tbody>
              </table>

              {trend.length > 1 && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  提分趋势：{trend.join(' → ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
