// 考核节点配置（按科目）—— 名称/类型/权重%/学期-周/日期/模式/是否主要/父节点(子项)
import { useState, useEffect } from 'react';
import { useAcademicStore } from '../../store/useAcademicStore';
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

const blank = { milestone_type: 'exam', title: '', due_date: '', weight_percent: undefined as number | undefined, term_no: undefined as number | undefined, week_no: undefined as number | undefined, mode: 'secure', is_major: false, parent_id: undefined as number | undefined };

export default function MilestoneManagement() {
  const { milestones, programs, programSubjects, fetchMilestones, fetchProgramsAndSubjects, createMilestone, updateMilestone, deleteMilestone, updateProgramSubject, isLoading } = useAcademicStore();

  const [programId, setProgramId] = useState<number | undefined>();
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...blank });
  const [passMark, setPassMark] = useState<number | undefined>();

  useEffect(() => { fetchMilestones(); fetchProgramsAndSubjects(); }, [fetchMilestones, fetchProgramsAndSubjects]);
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

  const openAdd = (parentId?: number) => {
    setEditId(null);
    setForm({ ...blank, parent_id: parentId });
    setOpen(true);
  };
  const openEdit = (m: any) => {
    setEditId(m.id);
    setForm({
      milestone_type: m.milestone_type, title: m.title, due_date: m.due_date || '',
      weight_percent: m.weight_percent ?? undefined, term_no: m.term_no ?? undefined, week_no: m.week_no ?? undefined,
      mode: m.mode || 'secure', is_major: !!m.is_major, parent_id: m.parent_id ?? undefined,
    });
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
      weight_percent: form.weight_percent ?? null,
      term_no: form.term_no ?? null,
      week_no: form.week_no ?? null,
      mode: form.mode || null,
      is_major: form.is_major,
      parent_id: form.parent_id ?? null,
    };
    const ok = editId ? await updateMilestone(editId, payload) : await createMilestone(payload);
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

  const renderRow = (m: any, isChild = false) => (
    <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
      <td style={{ padding: '10px 8px', paddingLeft: isChild ? 28 : 8, fontWeight: isChild ? 400 : 500 }}>
        {isChild && <span style={{ color: 'var(--color-text-tertiary)' }}>↳ </span>}{m.title}
        {m.is_major && <span className="pill p-red" style={{ marginLeft: 6, fontSize: 10 }}>主要</span>}
      </td>
      <td style={{ padding: '10px 8px' }}>{typeLabel(m.milestone_type)}</td>
      <td style={{ padding: '10px 8px' }}>{m.weight_percent != null ? `${m.weight_percent}%` : '—'}</td>
      <td style={{ padding: '10px 8px' }}>{m.term_no ? `T${m.term_no}` : ''}{m.week_no ? ` W${m.week_no}` : ''}{!m.term_no && !m.week_no ? '—' : ''}</td>
      <td style={{ padding: '10px 8px' }}>{m.due_date || '—'}</td>
      <td style={{ padding: '10px 8px' }}>{modeLabel(m.mode)}</td>
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
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              <th style={{ padding: '12px 8px' }}>节点名称</th><th style={{ padding: '12px 8px' }}>类型</th>
              <th style={{ padding: '12px 8px' }}>权重</th><th style={{ padding: '12px 8px' }}>学期/周</th>
              <th style={{ padding: '12px 8px' }}>日期</th><th style={{ padding: '12px 8px' }}>模式</th>
              <th style={{ padding: '12px 8px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {topNodes.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>该科暂无考核节点，点「新增节点」配置。</td></tr>
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
        </div>
      </Modal>
    </div>
  );
}
