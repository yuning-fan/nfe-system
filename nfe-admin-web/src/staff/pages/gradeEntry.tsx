// 巡查 · 成绩登记（晚自习用）
//
// 两种模式共用一份上下文与一个「保存」按钮：
//   · 按学生：学生拿着卷子过来，点开他 → 列出他选的科目里的节点 → 逐个填
//   · 按节点：刚考完一门，选科目+节点 → 列出选了这门课的学生 → 一屏填完
// 切换模式不会丢未保存的改动（草稿是按 学生|节点 存的，与模式无关）。
// 口径见 lib/gradeEntry.ts：名单=预科在读、只能录本人选的科目、父节点不可录、缺考=0分。
import { useCallback, useEffect, useMemo, useState } from 'react';
import { message, Select } from 'antd';
import { IconLoader2, IconAlertTriangle, IconDeviceFloppy } from '@tabler/icons-react';
import { Section } from '../ui';
import {
  fetchGradeEntryContext, saveGrades, gradeKey, GRADE_STATUS_LABEL, subjectLabel,
  type GradeEntryContext, type GradeDraft, type NodeInfo,
} from '../../lib/gradeEntry';

type Draft = { score: string; status: string };

export function PatrolGrades() {
  const [ctx, setCtx] = useState<GradeEntryContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const [mode, setMode] = useState<'student' | 'node'>('student');
  const [search, setSearch] = useState('');
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [onlyPending, setOnlyPending] = useState(true);
  const [programId, setProgramId] = useState<number | undefined>();   // 同名科目分属不同项目，先按项目收窄
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [nodeId, setNodeId] = useState<number | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    const c = await fetchGradeEntryContext();
    setCtx(c);
    setDrafts({});
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // ---- 草稿读写 ----
  const cellOf = (studentId: string, nodeId: number): Draft => {
    const k = gradeKey(studentId, nodeId);
    if (drafts[k]) return drafts[k];
    const g = ctx?.grades[k];
    return { score: g?.score == null ? '' : String(g.score), status: g?.status || 'graded' };
  };
  const setCell = (studentId: string, nodeId: number, patch: Partial<Draft>) => {
    const k = gradeKey(studentId, nodeId);
    setDrafts(d => ({ ...d, [k]: { ...cellOf(studentId, nodeId), ...patch } }));
  };
  const toggleMissed = (studentId: string, nodeId: number) => {
    const cur = cellOf(studentId, nodeId);
    if (cur.status === 'missed') setCell(studentId, nodeId, { status: 'graded', score: '' });
    else setCell(studentId, nodeId, { status: 'missed', score: '0' });
  };

  // 真正有变化的草稿（与库里已有值不同）
  const dirty = useMemo(() => {
    if (!ctx) return [] as GradeDraft[];
    const out: GradeDraft[] = [];
    for (const [k, d] of Object.entries(drafts)) {
      const [studentId, nodeIdStr] = k.split('|');
      const nid = Number(nodeIdStr);
      const node = ctx.nodesById[nid];
      if (!node || node.subjectId == null) continue;
      const score = d.score.trim() === '' ? null : Number(d.score);
      if (score == null || !Number.isFinite(score)) continue;      // 空着的不算改动
      const g = ctx.grades[k];
      if (g && g.score === score && (g.status || 'graded') === d.status) continue;
      out.push({ studentId, nodeId: nid, subjectId: node.subjectId, score, status: d.status });
    }
    return out;
  }, [drafts, ctx]);

  const invalid = dirty.filter(d => d.score < 0 || d.score > 100);

  const doSave = async () => {
    if (invalid.length) { message.warning('分数需在 0–100 之间，请检查标红的输入'); return; }
    if (!dirty.length) return;
    setSaving(true);
    const res = await saveGrades(dirty);
    setSaving(false);
    if (!res.ok) { message.error(res.error || '保存失败'); return; }
    const students = new Set(dirty.map(d => d.studentId)).size;
    message.success(`已保存 ${res.saved} 条成绩（${students} 名学生），总评与风险分已重算`);
    await load();
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} />
    </div>;
  }
  if (!ctx) return <div style={{ padding: 24 }}>加载失败</div>;

  const nodesFor = (sid: number): NodeInfo[] => ctx.enterableBySubject[sid] || [];
  const recordedCount = (studentId: string) => {
    const ids = ctx.subjectIdsOf[studentId] || [];
    let total = 0, done = 0;
    for (const s of ids) for (const n of nodesFor(s)) {
      total++;
      if (ctx.grades[gradeKey(studentId, n.id)]) done++;
    }
    return { done, total };
  };
  const scoreColor = (score: number, subjId: number | null) => {
    const pass = subjId != null ? (ctx.subjects[subjId]?.passMark ?? 50) : 50;
    return score >= pass ? 'var(--color-success)' : 'var(--color-danger)';
  };

  const shownStudents = ctx.students.filter(s => !search.trim() || s.name.includes(search.trim()));
  const subjectIdsWithNodes = Object.keys(ctx.enterableBySubject).map(Number).filter(id => ctx.subjects[id]);
  // 项目下拉：只列有可录节点的项目，带月数（预科-Standard 12 个月 / Accelerated 5 个月）
  const programOptions = Array.from(new Set(subjectIdsWithNodes.map(id => ctx.subjects[id].programId)))
    .filter((pid): pid is number => pid != null)
    .map(pid => {
      const sample = subjectIdsWithNodes.map(id => ctx.subjects[id]).find(s => s.programId === pid)!;
      return {
        value: pid,
        label: `${sample.programName}${sample.programMonths ? `（${sample.programMonths}个月）` : ''}`,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'zh'));
  const subjectOptions = subjectIdsWithNodes
    .filter(id => programId == null || ctx.subjects[id].programId === programId)
    .sort((a, b) => subjectLabel(ctx.subjects[a]).localeCompare(subjectLabel(ctx.subjects[b]), 'zh'))
    .map(id => ({ value: id, label: `${subjectLabel(ctx.subjects[id])} · ${nodesFor(id).length} 个节点` }));
  const nodeOptions = subjectId
    ? nodesFor(subjectId).map(n => ({
        value: n.id,
        label: `${n.parentTitle ? `${n.parentTitle} › ` : ''}${n.title}${n.dueDate ? ` · ${n.dueDate}` : ''}`,
      }))
    : [];
  const nodeStudents = subjectId
    ? ctx.students.filter(s => (ctx.subjectIdsOf[s.id] || []).includes(subjectId))
    : [];

  const scoreInput = (studentId: string, node: NodeInfo) => {
    const cell = cellOf(studentId, node.id);
    const num = cell.score.trim() === '' ? null : Number(cell.score);
    const bad = num != null && (!Number.isFinite(num) || num < 0 || num > 100);
    const saved = ctx.grades[gradeKey(studentId, node.id)];
    const changed = !!drafts[gradeKey(studentId, node.id)] &&
      dirty.some(d => d.studentId === studentId && d.nodeId === node.id);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          className="input" type="number" min={0} max={100} step={0.5} placeholder="分数"
          value={cell.score}
          onChange={e => setCell(studentId, node.id, { score: e.target.value, status: cell.status === 'missed' ? 'graded' : cell.status })}
          style={{
            width: 78, minHeight: 0, padding: '4px 8px', fontSize: 13,
            borderColor: bad ? 'var(--color-danger)' : changed ? 'var(--color-primary)' : undefined,
          }}
        />
        <button className={`btn ${cell.status === 'missed' ? 'btn-primary' : ''}`}
          onClick={() => toggleMissed(studentId, node.id)}
          style={{
            padding: '3px 10px', fontSize: 12, minHeight: 0,
            backgroundColor: cell.status === 'missed' ? 'var(--color-danger)' : undefined,
            borderColor: cell.status === 'missed' ? 'var(--color-danger)' : undefined,
          }}>缺考</button>
        {saved && (
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            已录 <span style={{ color: saved.score == null ? undefined : scoreColor(saved.score, node.subjectId) }}>
              {saved.score ?? '—'}
            </span>
            {saved.status !== 'graded' ? `（${GRADE_STATUS_LABEL[saved.status] || saved.status}）` : ''}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      {ctx.errors.length > 0 && (
        <div style={{
          border: '1px solid #F5C97F', background: '#FFF5E6', color: '#A05000',
          borderRadius: 6, padding: '8px 12px', fontSize: 12, marginBottom: 14,
        }}>
          <IconAlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          部分数据读取失败，名单或节点可能不全：{ctx.errors.join('；')}
        </div>
      )}

      <Section
        title="成绩登记"
        hint={`名单=预科在读 ${ctx.students.length} 人 · 只能录学生本人选的科目 · 缺考按 0 分计入总评 · 已录的可直接改`}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className={`btn ${mode === 'student' ? 'btn-primary' : ''}`} onClick={() => setMode('student')}
                style={{ padding: '3px 12px', fontSize: 12, minHeight: 0 }}>按学生</button>
              <button className={`btn ${mode === 'node' ? 'btn-primary' : ''}`} onClick={() => setMode('node')}
                style={{ padding: '3px 12px', fontSize: 12, minHeight: 0 }}>按节点</button>
            </div>
            <button className="btn btn-primary" disabled={saving || dirty.length === 0} onClick={doSave}>
              {saving ? <IconLoader2 size={16} className="spinner" />
                : <><IconDeviceFloppy size={15} style={{ marginRight: 4, verticalAlign: 'middle' }} />保存 {dirty.length} 处</>}
            </button>
          </div>
        }
      >
        {invalid.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 10 }}>
            有 {invalid.length} 处分数超出 0–100，保存前请修正。
          </div>
        )}

        {/* ========== 按学生 ========== */}
        {mode === 'student' && (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <input className="input" placeholder="搜学生姓名" value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: 200, minHeight: 0, padding: '4px 10px' }} />
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <input type="checkbox" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} />
                只看未录节点
              </label>
            </div>

            {shownStudents.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>没有匹配的学生</div>
            ) : shownStudents.map(s => {
              const { done, total } = recordedCount(s.id);
              const isOpen = openStudent === s.id;
              return (
                <div key={s.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                  <div onClick={() => setOpenStudent(isOpen ? null : s.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', cursor: 'pointer' }}>
                    <span style={{ fontWeight: 500, fontSize: 13, width: 110 }}>{s.name}</span>
                    <span className={`pill ${done === total && total > 0 ? 'p-green' : done > 0 ? 'p-amber' : 'p-gray'}`}>
                      已录 {done}/{total}
                    </span>
                    {ctx.missingSelection[s.id] && (
                      <span className="pill p-red" title="该生没有选课记录，无法列出考核节点">未登记选课</span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      {isOpen ? '收起' : '展开录分'}
                    </span>
                  </div>

                  {isOpen && (
                    <div style={{ padding: '4px 0 14px 12px' }}>
                      {ctx.missingSelection[s.id] ? (
                        <div style={{ fontSize: 12, color: '#A05000' }}>
                          该生在 student_subject_selections 里没有选课记录，请先在「学业跟进」补登选课，否则无法确定他要录哪些科目。
                        </div>
                      ) : (
                        (ctx.subjectIdsOf[s.id] || []).map(sid => {
                          const all = nodesFor(sid);
                          const list = onlyPending ? all.filter(n => !ctx.grades[gradeKey(s.id, n.id)]) : all;
                          if (!list.length) return null;
                          return (
                            <div key={sid} style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                                {subjectLabel(ctx.subjects[sid])}
                                <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
                                  过线 {ctx.subjects[sid]?.passMark}
                                </span>
                              </div>
                              {list.map(n => (
                                <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                                  <span style={{ fontSize: 13, flex: 1, minWidth: 0 }}>
                                    {n.parentTitle && (
                                      <span style={{ color: 'var(--color-text-tertiary)' }}>{n.parentTitle} › </span>
                                    )}
                                    {n.title}
                                    {n.parentTitle && n.weight != null && (
                                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
                                        占父项 {n.weight}%
                                      </span>
                                    )}
                                    {n.isMajor && <span className="pill p-purple" style={{ marginLeft: 6, fontSize: 10 }}>大考</span>}
                                  </span>
                                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', width: 86 }}>{n.dueDate || '—'}</span>
                                  {scoreInput(s.id, n)}
                                </div>
                              ))}
                            </div>
                          );
                        })
                      )}
                      {!ctx.missingSelection[s.id] && onlyPending && done === total && total > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                          该生所有节点都已录分。取消「只看未录节点」可修改已录的分数。
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ========== 按节点 ========== */}
        {mode === 'node' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <Select allowClear style={{ width: 230 }} placeholder="项目（5个月 / 12个月）"
                value={programId} options={programOptions}
                onChange={v => { setProgramId(v); setSubjectId(undefined); setNodeId(undefined); }} />
              <Select showSearch optionFilterProp="label" style={{ width: 340 }} placeholder="选择科目"
                value={subjectId} options={subjectOptions}
                onChange={v => { setSubjectId(v); setNodeId(undefined); }} />
              <Select showSearch optionFilterProp="label" style={{ width: 320 }} placeholder="选择考核节点"
                value={nodeId} options={nodeOptions} disabled={!subjectId} onChange={setNodeId} />
            </div>

            {!subjectId || !nodeId ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                先选科目和考核节点，下面会列出选了这门课的学生
              </div>
            ) : nodeStudents.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                没有学生选了这门课（或选课未登记）
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
                  {subjectLabel(ctx.subjects[subjectId])} ·{' '}
                  {ctx.nodesById[nodeId]?.parentTitle ? `${ctx.nodesById[nodeId]?.parentTitle} › ` : ''}
                  {ctx.nodesById[nodeId]?.title} · 应录 {nodeStudents.length} 人 ·
                  已录 {nodeStudents.filter(s => ctx.grades[gradeKey(s.id, nodeId)]).length} 人 ·
                  过线 {ctx.subjects[subjectId]?.passMark}
                </div>
                <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
                  <thead><tr>
                    <th style={{ padding: '8px 12px' }}>学生</th>
                    <th style={{ padding: '8px 12px' }}>分数</th>
                  </tr></thead>
                  <tbody>
                    {nodeStudents.map(s => (
                      <tr key={s.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                        <td style={{ padding: '6px 12px', fontWeight: 500, fontSize: 13, width: 140 }}>{s.name}</td>
                        <td style={{ padding: '6px 12px' }}>{scoreInput(s.id, ctx.nodesById[nodeId])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </Section>
    </>
  );
}
