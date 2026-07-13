// 成绩录入 —— 按学生+科目逐节点录分，自动算加权总评 + 是否过线；下方保留全部成绩流水。
import { useState, useEffect } from 'react';
import { useAcademicStore } from '../../store/useAcademicStore';
import { useStudentStore } from '../../store/useStudentStore';
import { IconReportAnalytics } from '@tabler/icons-react';
import { Modal, message, Select, InputNumber, Input } from 'antd';
import StudentSelect from '../../components/common/StudentSelect';
import { computeSubject } from '../../lib/gradeCalc';

const STATUS_OPTS = [
  { label: '正常', value: 'graded' },
  { label: '缺考(0)', value: 'missed' },
  { label: '补考(-10%)', value: 'makeup' },
];

export default function GradeRecordsManagement() {
  const { gradeRecords, milestones, programs, programSubjects, fetchGradeRecords, fetchProgramsAndSubjects, fetchMilestones, addGradeRecord, updateGradeRecord, deleteGradeRecord, isLoading } = useAcademicStore();
  const { students, fetchStudents } = useStudentStore();

  const [studentId, setStudentId] = useState<string | undefined>();
  const [programId, setProgramId] = useState<number | undefined>();
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const subjectsOfProgram = programSubjects.filter(s => s.program_id === programId);

  // 录分弹窗
  const [open, setOpen] = useState(false);
  const [node, setNode] = useState<any>(null);
  const [recordId, setRecordId] = useState<number | null>(null);
  const [form, setForm] = useState({ score: undefined as number | undefined, status: 'graded', note: '' });

  useEffect(() => {
    fetchGradeRecords(); fetchStudents(); fetchProgramsAndSubjects(); fetchMilestones();
  }, [fetchGradeRecords, fetchStudents, fetchProgramsAndSubjects, fetchMilestones]);

  const subject = programSubjects.find(p => p.id === subjectId);
  const passMark = subject?.pass_mark ?? 50;
  const nodes = milestones.filter(m => m.program_subject_id === subjectId);
  const gradeOf = (nodeId: number) => gradeRecords.find((r: any) => r.student_id === studentId && r.milestone_id === nodeId);
  const result = computeSubject(nodes as any, (id) => gradeOf(id)?.score ?? null, passMark);

  const openEntry = (n: any) => {
    const g = gradeOf(n.id);
    setNode(n); setRecordId(g?.id ?? null);
    setForm({ score: g?.score ?? undefined, status: g?.status ?? 'graded', note: g?.note ?? '' });
    setOpen(true);
  };

  const save = async () => {
    if (!studentId || !node) return;
    if (form.score == null) { message.warning('请填写分数'); return; }
    const payload: any = {
      student_id: studentId, program_subject_id: subjectId, milestone_id: node.id,
      score: form.score, score_type: 'final', status: form.status, note: form.note || null,
    };
    const ok = recordId ? await updateGradeRecord(recordId, payload) : await addGradeRecord(payload);
    if (ok) { message.success('已保存，风险分已更新'); setOpen(false); }
    else message.error('保存失败');
  };

  const del = (n: any) => {
    const g = gradeOf(n.id);
    if (!g) return;
    Modal.confirm({
      title: '删除该节点成绩', content: `删除「${n.title}」的成绩？总评与风险分会重算。`, okType: 'danger',
      onOk: async () => { (await deleteGradeRecord(g.id, studentId!)) ? message.success('已删除') : message.error('删除失败'); },
    });
  };

  const scorePill = (s: number | null) => s == null
    ? <span className="pill p-gray">待录</span>
    : <span className={`pill ${s >= passMark ? 'p-green' : 'p-red'}`}>{s}</span>;

  return (
    <div className="tabpage active">
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}><IconReportAnalytics size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> 成绩录入与总评</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>选学生+科目，逐个考核节点录分；系统按权重自动算总评、判断是否过线。</p>
      </div>

      {/* 选择 + 总评条 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <StudentSelect style={{ width: 200 }} placeholder="选择学生" value={studentId} onChange={setStudentId}
          options={students.map((s: any) => ({ label: s.profiles?.full_name || '—', value: s.student_id }))} />
        <Select showSearch optionFilterProp="label" style={{ width: 180 }} placeholder="选择项目" value={programId}
          onChange={v => { setProgramId(v); setSubjectId(undefined); }}
          options={programs.map(p => ({ label: p.name, value: p.id }))} />
        <Select showSearch optionFilterProp="label" style={{ width: 200 }} placeholder="选择科目" value={subjectId} onChange={setSubjectId}
          options={subjectsOfProgram.map(s => ({ label: s.subject_name, value: s.id }))} disabled={!programId} />
      </div>

      {studentId && subjectId && (
        <>
          <div className="card" style={{ marginBottom: 14, display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>加权总评</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{result.total != null ? result.total : `${result.earnedPoints}*`}</div></div>
            <div><div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>过线线</div><div style={{ fontSize: 16 }}>{passMark}</div></div>
            <div><div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>状态</div>
              <div>{result.total == null
                ? <span className="pill p-amber">进行中 · 已评{Math.round(result.gradedWeight)}%</span>
                : result.pass ? <span className="pill p-green">已过线 ✓</span> : <span className="pill p-red">未过线</span>}</div></div>
            <div style={{ fontSize: 12, color: Math.round(result.topWeightSum) === 100 ? 'var(--color-text-tertiary)' : 'var(--color-danger)' }}>
              顶层权重合计 {result.topWeightSum}%{Math.round(result.topWeightSum) === 100 ? '' : '（节点权重未配满 100%）'}
              {result.total == null && <span>　带 * 为已得加权分（未录完）</span>}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                  <th style={{ padding: '12px 8px' }}>考核节点</th><th style={{ padding: '12px 8px' }}>权重</th>
                  <th style={{ padding: '12px 8px' }}>日期</th><th style={{ padding: '12px 8px' }}>得分</th>
                  <th style={{ padding: '12px 8px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {nodes.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>该科还没配考核节点，请先到「考核节点」配置。</td></tr>
                ) : result.rows.map(row => {
                  const top = row.node as any;
                  const hasChildren = row.children.length > 0;
                  return [
                    <tr key={top.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 14, background: hasChildren ? 'var(--color-bg-secondary)' : undefined }}>
                      <td style={{ padding: '10px 8px', fontWeight: 500 }}>{top.title}</td>
                      <td style={{ padding: '10px 8px' }}>{row.weight}%</td>
                      <td style={{ padding: '10px 8px' }}>{top.due_date || '—'}</td>
                      <td style={{ padding: '10px 8px' }}>{hasChildren ? (row.score == null ? <span className="pill p-gray">子项待录</span> : scorePill(Math.round(row.score * 10) / 10)) : scorePill(row.score)}</td>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        {hasChildren ? <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>按子项汇总</span> : (
                          <>
                            <span className="link" style={{ marginRight: 10 }} onClick={() => openEntry(top)}>{gradeOf(top.id) ? '改分' : '录分'}</span>
                            {gradeOf(top.id) && <span className="link" style={{ color: 'var(--color-danger)' }} onClick={() => del(top)}>删</span>}
                          </>
                        )}
                      </td>
                    </tr>,
                    ...row.children.map(c => {
                      const cn = c.node as any;
                      return (
                        <tr key={cn.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                          <td style={{ padding: '10px 8px', paddingLeft: 28, color: 'var(--color-text-secondary)' }}>↳ {cn.title}</td>
                          <td style={{ padding: '10px 8px' }}>{c.weight}%<span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}> 占父</span></td>
                          <td style={{ padding: '10px 8px' }}>{cn.due_date || '—'}</td>
                          <td style={{ padding: '10px 8px' }}>{scorePill(c.score)}</td>
                          <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                            <span className="link" style={{ marginRight: 10 }} onClick={() => openEntry(cn)}>{gradeOf(cn.id) ? '改分' : '录分'}</span>
                            {gradeOf(cn.id) && <span className="link" style={{ color: 'var(--color-danger)' }} onClick={() => del(cn)}>删</span>}
                          </td>
                        </tr>
                      );
                    }),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 全部成绩流水（全局浏览） */}
      <div style={{ marginTop: 24 }}>
        <div className="card-title" style={{ marginBottom: 10 }}>全部成绩记录</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                <th style={{ padding: '12px 8px' }}>学生</th><th style={{ padding: '12px 8px' }}>科目/课程</th>
                <th style={{ padding: '12px 8px' }}>考核节点</th><th style={{ padding: '12px 8px' }}>分数</th>
                <th style={{ padding: '12px 8px' }}>状态</th><th style={{ padding: '12px 8px' }}>时间</th>
              </tr>
            </thead>
            <tbody>
              {gradeRecords.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                  <td style={{ padding: '10px 8px', fontWeight: 500 }}>{r.profiles?.full_name || '—'}</td>
                  <td style={{ padding: '10px 8px' }}>{r.program_subjects?.subject_name || r.courses?.name || '—'}</td>
                  <td style={{ padding: '10px 8px' }}>{r.academic_milestones?.title || '—'}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>{r.score}</td>
                  <td style={{ padding: '10px 8px' }}>{STATUS_OPTS.find(o => o.value === (r.status || 'graded'))?.label || '—'}</td>
                  <td style={{ padding: '10px 8px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{r.recorded_at ? new Date(r.recorded_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
              {gradeRecords.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-tertiary)' }}>暂无成绩记录</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal title={`${node?.title || ''} · 录分`} open={open} onCancel={() => setOpen(false)} onOk={save} confirmLoading={isLoading} width={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">分数 *（0–100，填最终分）</label>
              <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} value={form.score} onChange={v => setForm(f => ({ ...f, score: v ?? undefined }))} />
            </div>
            <div style={{ width: 140 }}>
              <label className="form-label">状态</label>
              <Select style={{ width: '100%' }} value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={STATUS_OPTS} />
            </div>
          </div>
          <div>
            <label className="form-label">备注（可选，如迟交-10、补考）</label>
            <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>规则（迟交/缺考/补考）请人工算好后填最终分；状态/备注仅作标记。</div>
        </div>
      </Modal>
    </div>
  );
}
