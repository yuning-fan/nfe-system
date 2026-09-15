// 考核节点配置（按科目）—— 名称/类型/权重%/学期-周/日期/模式/是否主要/父节点(子项)
import { useState, useEffect } from 'react';
import { useAcademicStore } from '../../store/useAcademicStore';
import { supabase } from '../../lib/supabase';
import { intakeLabel } from '../../lib/intakeDates';
import { IconTarget, IconPlus, IconTrash, IconPencil, IconDeviceFloppy } from '@tabler/icons-react';
import { Modal, message, Select, Input, InputNumber } from 'antd';

const TYPE_OPTS = [
  { label: '考试 Exam', value: 'exam' },
  { label: '作业/论文 Assignment', value: 'assignment' },
  { label: '报告 Report', value: 'report_due' },
];
const typeLabel = (t: string) => TYPE_OPTS.find(o => o.value === t)?.label.split(' ')[0] || t;
const MODE_OPTS = [
  { label: 'Secure 监考', value: 'secure' },
  { label: 'Non-secure 开放', value: 'non_secure' },
  { label: 'Hybrid 混合', value: 'hybrid' },
];
const modeLabel = (m?: string | null) => MODE_OPTS.find(o => o.value === m)?.label.split(' ')[0] || '—';

const blank = { milestone_type: 'exam', title: '', due_date: '', due_time: '', weight_percent: undefined as number | undefined, term_no: undefined as number | undefined, week_no: undefined as number | undefined, mode: 'secure', is_major: false, parent_id: undefined as number | undefined, note: '' };
// 截止时间留空按 23:59 理解；库里存 time，展示时截掉秒
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');

export default function MilestoneManagement() {
  const { milestones, programs, programSubjects, fetchMilestones, fetchProgramsAndSubjects, createMilestone, updateMilestone, deleteMilestone, updateProgramSubject, intakeDates, fetchIntakeDates, saveIntakeDates, isLoading } = useAcademicStore();

  const [programId, setProgramId] = useState<number | undefined>();
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [passMark, setPassMark] = useState<number | undefined>();
  // 该科在读学生的入学批次；弹窗里按批次单独设置的日期（key = intake_start）
  const [cohorts, setCohorts] = useState<{ start: string; names: string[] }[]>([]);
  const [intakeForm, setIntakeForm] = useState<Record<string, { due_date: string; due_time: string }>>({});

  useEffect(() => { fetchMilestones(); fetchProgramsAndSubjects(); fetchIntakeDates(); }, [fetchMilestones, fetchProgramsAndSubjects, fetchIntakeDates]);
  // 选课 → 报名 start_date 归并出该科在读批次（退课 / 已完成 / 退学不算）
  useEffect(() => {
    if (!subjectId) { setCohorts([]); return; }
    (async () => {
      const { data } = await (supabase as any).from('student_subject_selections')
        .select('status, student_enrollments!student_subject_selections_enrollment_id_fkey!inner(start_date, status, profiles!student_enrollments_student_id_fkey(full_name))')
        .eq('program_subject_id', subjectId);
      const map = new Map<string, string[]>();
      for (const x of (data || []) as any[]) {
        if (x.status === 'dropped') continue;
        const en = Array.isArray(x.student_enrollments) ? x.student_enrollments[0] : x.student_enrollments;
        if (!en?.start_date || en.status === 'withdrawn' || en.status === 'completed') continue;
        const p = Array.isArray(en.profiles) ? en.profiles[0] : en.profiles;
        const arr = map.get(en.start_date) || [];
        if (p?.full_name) arr.push(p.full_name);
        map.set(en.start_date, arr);
      }
      setCohorts(Array.from(map, ([start, names]) => ({ start, names })).sort((a, b) => a.start.localeCompare(b.start)));
    })();
  }, [subjectId]);
  useEffect(() => {
    if (!programId && programs.length) setProgramId(programs[0].id);
  }, [programs, programId]);

  const subjectsOfProgram = programSubjects.filter(s => s.program_id === programId);
  useEffect(() => {
    // 切项目后，把科目重置为该项目第一门
    if (programId && (!subjectId || !subjectsOfProgram.find(s => s.id === subjectId))) {
      setSubjectId(subjectsOfProgram[0]?.id);
    }
  }, [programId, subjectsOfProgram, subjectId]);
  useEffect(() => {
    const s = programSubjects.find(p => p.id === subjectId);
    setPassMark(s?.pass_mark ?? 50);
  }, [subjectId, programSubjects]);

  const subjectNodes = milestones.filter(m => m.program_subject_id === subjectId);
  const topNodes = subjectNodes.filter(m => !m.parent_id);
  const childrenOf = (pid: number) => subjectNodes.filter(m => m.parent_id === pid);
  const topWeightSum = topNodes.reduce((s, n) => s + (Number(n.weight_percent) || 0), 0);
  const baseIntake = programSubjects.find(p => p.id === subjectId)?.node_dates_intake ?? null;
  const otherCohorts = cohorts.filter(c => c.start !== baseIntake);
  // 弹窗要列的批次：在读的非默认批次 ∪ 该节点已有单独日期的批次（否则保存时会把后者静默删掉）
  const modalIntakes = editId
    ? Array.from(new Set([...otherCohorts.map(c => c.start), ...intakeDates.filter(x => x.milestone_id === editId).map(x => x.intake_start)])).sort()
    : [];

  const openAdd = (parentId?: number) => {
    setEditId(null);
    setForm({ ...blank, parent_id: parentId });
    setIntakeForm({});
    setOpen(true);
  };
  const openEdit = (m: any) => {
    setEditId(m.id);
    setForm({
      milestone_type: m.milestone_type, title: m.title, due_date: m.due_date || '', due_time: hhmm(m.due_time),
      weight_percent: m.weight_percent ?? undefined, term_no: m.term_no ?? undefined, week_no: m.week_no ?? undefined,
      mode: m.mode || 'secure', is_major: !!m.is_major, parent_id: m.parent_id ?? undefined, note: m.note || '',
    });
    setIntakeForm(Object.fromEntries(intakeDates.filter(x => x.milestone_id === m.id)
      .map(x => [x.intake_start, { due_date: x.due_date, due_time: hhmm(x.due_time) }])));
    setOpen(true);
  };

  const save = async () => {
    if (!subjectId) { message.warning('请先选择科目'); return; }
    if (!form.title.trim()) { message.warning('请填写节点名称'); return; }
    const payload: any = {
      program_subject_id: subjectId,
      milestone_type: form.milestone_type,
      title: form.title.trim(),
      due_date: form.due_date || null,
      due_time: form.due_time || null,
      weight_percent: form.weight_percent ?? null,
      term_no: form.term_no ?? null,
      week_no: form.week_no ?? null,
      mode: form.mode || null,
      is_major: form.is_major,
      parent_id: form.parent_id ?? null,
      note: form.note.trim() || null,
    };
    const ok = editId ? await updateMilestone(editId, payload) : await createMilestone(payload);
    if (ok && editId) {
      const rows = Object.entries(intakeForm).map(([intake_start, v]) => ({ intake_start, due_date: v.due_date, due_time: v.due_time || null }));
      if (!(await saveIntakeDates(editId, rows))) { message.error('节点已保存，但批次日期保存失败'); return; }
    }
    if (ok) { message.success(editId ? '已更新' : '已新增'); setOpen(false); }
    else message.error('保存失败');
  };

  const del = (m: any) => {
    Modal.confirm({
      title: '删除考核节点', content: `删除「${m.title}」？子项与关联成绩也会受影响。`, okType: 'danger',
      onOk: async () => { (await deleteMilestone(m.id)) ? message.success('已删除') : message.error('删除失败'); },
    });
  };

  const savePassMark = async () => {
    if (!subjectId || passMark == null) return;
    const ok = await updateProgramSubject(subjectId, { pass_mark: passMark } as any);
    message[ok ? 'success' : 'error'](ok ? '过线分已保存' : '保存失败');
  };

  const saveBaseIntake = async (v?: string) => {
    if (!subjectId) return;
    const ok = await updateProgramSubject(subjectId, { node_dates_intake: v ?? null });
    message[ok ? 'success' : 'error'](ok ? '已保存默认日期对应批次' : '保存失败');
  };

  const renderRow = (m: any, isChild = false) => (
    <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
      <td style={{ padding: '10px 8px', paddingLeft: isChild ? 28 : 8, fontWeight: isChild ? 400 : 500 }}>
        {isChild && <span style={{ color: 'var(--color-text-tertiary)' }}>↳ </span>}{m.title}
        {m.is_major && <span className="pill p-red" style={{ marginLeft: 6, fontSize: 10 }}>主要</span>}
      </td>
      <td style={{ padding: '10px 8px' }}>{typeLabel(m.milestone_type)}</td>
      <td style={{ padding: '10px 8px' }}>{m.weight_percent != null ? `${m.weight_percent}%` : '—'}</td>
      <td style={{ padding: '10px 8px' }}>{m.term_no ? `T${m.term_no}` : ''}{m.week_no ? ` W${m.week_no}` : ''}{!m.term_no && !m.week_no ? '—' : ''}</td>
      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
        {m.due_date || '—'}
        {m.due_time && <span style={{ color: 'var(--color-text-secondary)', marginLeft: 4 }}>{hhmm(m.due_time)}</span>}
        {intakeDates.filter(x => x.milestone_id === m.id).map(x => (
          <div key={x.intake_start} style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            {intakeLabel(x.intake_start)}：{x.due_date}{x.due_time ? ` ${hhmm(x.due_time)}` : ''}
          </div>
        ))}
      </td>
      <td style={{ padding: '10px 8px' }}>{modeLabel(m.mode)}</td>
      <td style={{ padding: '10px 8px', maxWidth: 260, fontSize: 12, color: 'var(--color-text-secondary)' }} title={m.note || ''}>
        {m.note ? (m.note.length > 40 ? m.note.slice(0, 40) + '…' : m.note) : '—'}
      </td>
      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
        {!isChild && <span className="link" style={{ marginRight: 10 }} onClick={() => openAdd(m.id)}><IconPlus size={13} style={{ verticalAlign: 'middle' }} />子项</span>}
        <span className="link" style={{ marginRight: 10 }} onClick={() => openEdit(m)}><IconPencil size={13} style={{ verticalAlign: 'middle' }} />编辑</span>
        <span className="link" style={{ color: 'var(--color-danger)' }} onClick={() => del(m)}><IconTrash size={13} style={{ verticalAlign: 'middle' }} />删除</span>
      </td>
    </tr>
  );

  return (
    <div className="tabpage active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}><IconTarget size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> 考核节点配置</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>按科目配置各考核节点与权重；项目类可加子项（如 Summary 下的 Quiz/Outline/Final）。成绩按权重加权算总评。</p>
        </div>
        <button className="btn btn-primary" onClick={() => openAdd()} disabled={!subjectId}><IconPlus size={16} style={{ marginRight: 4 }} /> 新增节点</button>
      </div>

      {/* 科目选择 + 过线分 + 权重合计 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <Select style={{ width: 200 }} placeholder="选择项目" value={programId} onChange={setProgramId}
          options={programs.map(p => ({ label: p.name, value: p.id }))} showSearch optionFilterProp="label" />
        <Select style={{ width: 220 }} placeholder="选择科目" value={subjectId} onChange={setSubjectId}
          options={subjectsOfProgram.map(s => ({ label: s.subject_name, value: s.id }))} showSearch optionFilterProp="label" />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>过线分</span>
          <InputNumber min={0} max={100} value={passMark} onChange={v => setPassMark(v ?? undefined)} style={{ width: 90 }} />
          <button className="btn" onClick={savePassMark}><IconDeviceFloppy size={14} style={{ marginRight: 4 }} />保存</button>
        </span>
        <span style={{ fontSize: 12, color: Math.round(topWeightSum) === 100 ? 'var(--color-success)' : 'var(--color-danger)' }}>
          顶层权重合计 {topWeightSum}%{Math.round(topWeightSum) === 100 ? ' ✓' : '（应=100%）'}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>默认日期对应</span>
          <Select allowClear style={{ width: 150 }} placeholder="不区分批次" value={baseIntake || undefined} onChange={saveBaseIntake}
            options={Array.from(new Set([...cohorts.map(c => c.start), ...(baseIntake ? [baseIntake] : [])])).sort().map(d => ({ label: intakeLabel(d), value: d }))} />
        </span>
      </div>

      {baseIntake && otherCohorts.length > 0 && (
        <div style={{ fontSize: 12, color: '#854F0B', marginBottom: 10 }}>
          该科还有 {otherCohorts.map(c => `${intakeLabel(c.start)}（${c.names.join('、')}）`).join('、')} 在读。表中日期按 {intakeLabel(baseIntake)}；
          其他批次请点「编辑」单独设置，未设置的在 DDL 里显示「日期待核」。
        </div>
      )}
      {!baseIntake && cohorts.length > 1 && (
        <div style={{ fontSize: 12, color: '#854F0B', marginBottom: 10 }}>
          该科有 {cohorts.length} 个入学批次在读（{cohorts.map(c => intakeLabel(c.start)).join('、')}），建议先在「默认日期对应」选定表中日期属于哪个批次。
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              <th style={{ padding: '12px 8px' }}>节点名称</th><th style={{ padding: '12px 8px' }}>类型</th>
              <th style={{ padding: '12px 8px' }}>权重</th><th style={{ padding: '12px 8px' }}>学期/周</th>
              <th style={{ padding: '12px 8px' }}>日期/时间</th><th style={{ padding: '12px 8px' }}>模式</th>
              <th style={{ padding: '12px 8px' }}>备注</th><th style={{ padding: '12px 8px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {topNodes.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>该科暂无考核节点，点「新增节点」配置。</td></tr>
            ) : topNodes.map(top => [renderRow(top), ...childrenOf(top.id).map(c => renderRow(c, true))])}
          </tbody>
        </table>
      </div>

      <Modal title={editId ? '编辑考核节点' : (form.parent_id ? '新增子项' : '新增考核节点')} open={open} onCancel={() => setOpen(false)} onOk={save} confirmLoading={isLoading} width={520}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          <div>
            <label className="form-label">节点名称 *</label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="如 Common Test 1 / Final Report" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">类型</label>
              <Select style={{ width: '100%' }} value={form.milestone_type} onChange={v => setForm(f => ({ ...f, milestone_type: v }))} options={TYPE_OPTS} />
            </div>
            <div style={{ width: 130 }}>
              <label className="form-label">权重 %{form.parent_id ? '（占父项）' : '（占总评）'}</label>
              <InputNumber min={0} max={100} value={form.weight_percent} onChange={v => setForm(f => ({ ...f, weight_percent: v ?? undefined }))} style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 90 }}><label className="form-label">学期</label><InputNumber min={1} max={6} value={form.term_no} onChange={v => setForm(f => ({ ...f, term_no: v ?? undefined }))} style={{ width: '100%' }} /></div>
            <div style={{ width: 90 }}><label className="form-label">周</label><InputNumber min={1} max={20} value={form.week_no} onChange={v => setForm(f => ({ ...f, week_no: v ?? undefined }))} style={{ width: '100%' }} /></div>
            <div style={{ flex: 1 }}><label className="form-label">日期</label><input className="input" type="date" style={{ width: '100%' }} value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            <div style={{ width: 110 }}><label className="form-label">截止时间</label><input className="input" type="time" style={{ width: '100%' }} value={form.due_time} onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))} placeholder="23:59" /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">模式</label>
              <Select style={{ width: '100%' }} value={form.mode} onChange={v => setForm(f => ({ ...f, mode: v }))} options={MODE_OPTS} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">父节点（建子项时选）</label>
              <Select allowClear style={{ width: '100%' }} value={form.parent_id} onChange={v => setForm(f => ({ ...f, parent_id: v ?? undefined }))} placeholder="无（顶层节点）"
                options={topNodes.filter(t => t.id !== editId).map(t => ({ label: t.title, value: t.id }))} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, paddingBottom: 6 }}>
              <input type="checkbox" checked={form.is_major} onChange={e => setForm(f => ({ ...f, is_major: e.target.checked }))} /> 主要考核
            </label>
          </div>
          <div>
            <label className="form-label">备注</label>
            <Input.TextArea rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="提交形式 / 大纲待确认事项，如「Canvas 上传；⚠️ 是否 in-class 待确认」" />
          </div>
          {modalIntakes.length > 0 && (
            <div>
              <label className="form-label">按入学批次单独设置日期（留空 = 沿用上面的日期{baseIntake ? `，即 ${intakeLabel(baseIntake)}` : ''}）</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {modalIntakes.map(start => {
                  const names = cohorts.find(c => c.start === start)?.names || [];
                  return (
                    <div key={start} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ width: 150, fontSize: 12 }} title={names.join('、')}>{intakeLabel(start)}{names.length ? `（${names.length}人）` : '（无在读）'}</span>
                      <input className="input" type="date" style={{ flex: 1 }} value={intakeForm[start]?.due_date || ''}
                        onChange={e => setIntakeForm(f => ({ ...f, [start]: { due_date: e.target.value, due_time: f[start]?.due_time || '' } }))} />
                      <input className="input" type="time" style={{ width: 110 }} value={intakeForm[start]?.due_time || ''}
                        onChange={e => setIntakeForm(f => ({ ...f, [start]: { due_date: f[start]?.due_date || '', due_time: e.target.value } }))} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {!editId && cohorts.length > 1 && (
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>该科有多个入学批次在读，新增后点「编辑」可按批次单独设置日期。</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
