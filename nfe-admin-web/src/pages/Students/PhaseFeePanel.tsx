import { useEffect, useState, useCallback } from 'react';
import { Modal, message } from 'antd';
import { IconTimeline, IconPlus, IconPencil, IconTrash, IconCircleCheck, IconCircle, IconArrowUp } from '@tabler/icons-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useStudentStore } from '../../store/useStudentStore';
import { useFeeStore, FEE_TYPE_LABELS, FEE_TYPES, type FeeType } from '../../store/useFeeStore';
import { derivePhaseStatus } from '../../lib/phaseStatus';

interface Phase {
  id: number;
  program_id: number | null;
  source: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  programs?: { name: string; duration_months: number | null } | null;
}

const blankForm = { program_id: '', source: '', start_date: '', end_date: '', status: 'active' };

// 各项目官方开学季（月-日），按项目名匹配。点快捷按钮即按所选年份生成入学日期。
const PROGRAM_INTAKES: Record<string, { label: string; md: string }[]> = {
  '预科-Standard': [{ label: '2月', md: '02-02' }, { label: '7月', md: '07-20' }],
  '预科-Accelerated': [{ label: '2月', md: '02-02' }, { label: '9月', md: '09-07' }],
  '预科-Fast-track': [{ label: '4月', md: '04-28' }, { label: '10月', md: '10-05' }],
};

export default function PhaseFeePanel({ studentId, legacyNote }: { studentId: string; legacyNote?: string | null }) {
  const { programs, fetchPrograms } = useStudentStore();
  const { fees, fetchFees, addFee, togglePaid, deleteFee } = useFeeStore();
  const user = useAuthStore(s => s.user);

  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null); // null = 新增阶段
  const [form, setForm] = useState<Record<string, any>>(blankForm);
  const [saving, setSaving] = useState(false);

  const fetchPhases = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('student_enrollments')
      .select('*, programs(name, duration_months)')
      .eq('student_id', studentId)
      .order('start_date', { ascending: false });
    setPhases((data as any) || []);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetchPhases(); fetchFees(studentId); fetchPrograms(); }, [studentId, fetchPhases, fetchFees, fetchPrograms]);

  const computeEnd = (start: string, programId: number | string) => {
    if (!start) return '';
    const prog = programs.find(p => p.id === Number(programId));
    if (!prog?.duration_months) return '';
    const d = new Date(start); d.setMonth(d.getMonth() + prog.duration_months);
    return d.toISOString().slice(0, 10);
  };

  const onFormChange = (patch: Record<string, any>) => {
    setForm(prev => {
      const next = { ...prev, ...patch };
      if ('program_id' in patch || 'start_date' in patch) {
        const auto = computeEnd(next.start_date, next.program_id);
        if (auto) next.end_date = auto;
      }
      return next;
    });
  };

  const openAdd = () => { setEditId(null); setForm(blankForm); setModalOpen(true); };
  const openEdit = (ph: Phase) => {
    setEditId(ph.id);
    setForm({ program_id: ph.program_id || '', source: ph.source || '', start_date: ph.start_date || '', end_date: ph.end_date || '', status: ph.status || 'active' });
    setModalOpen(true);
  };

  const savePhase = async () => {
    if (!form.program_id) { message.warning('请选择学习阶段'); return; }
    setSaving(true);
    const payload: any = {
      program_id: Number(form.program_id),
      source: form.source || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
    };
    let err;
    if (editId) {
      ({ error: err } = await supabase.from('student_enrollments').update(payload).eq('id', editId) as any);
    } else {
      // 新增阶段：把当前在读的旧阶段标记为已完成，再插入新阶段
      await supabase.from('student_enrollments').update({ status: 'completed' } as any).eq('student_id', studentId).eq('status', 'active');
      ({ error: err } = await supabase.from('student_enrollments').insert({ ...payload, student_id: studentId, enrolled_by: user?.id ?? null }) as any);
    }
    setSaving(false);
    if (err) { message.error('保存失败：' + err.message); return; }
    message.success(editId ? '阶段已更新' : '已升入新阶段');
    setModalOpen(false);
    fetchPhases();
  };

  const feesOf = (enrollmentId: number) => fees.filter(f => f.enrollment_id === enrollmentId);
  const availableTypes = (enrollmentId: number): FeeType[] => {
    const used = new Set(feesOf(enrollmentId).map(f => f.fee_type));
    return FEE_TYPES.filter(t => !used.has(t));
  };

  const handleAddService = async (enrollmentId: number, t: FeeType) => {
    const ok = await addFee(enrollmentId, studentId, t);
    if (!ok) message.error('添加失败');
  };

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}><IconTimeline size={16} />阶段与服务费用（全流程）</div>
        <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={openAdd}>
          <IconArrowUp size={14} style={{ marginRight: 2 }} />升入新阶段
        </button>
      </div>

      {legacyNote && (
        <div style={{ fontSize: 12, color: '#854F0B', background: '#FFF8EB', border: '0.5px solid #FAC775', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
          历史缴费备注（待结构化）：<b>{legacyNote}</b>　—　请据此把各阶段服务的缴费登记到下方
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>加载中…</div>
      ) : phases.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '12px 0' }}>暂无报名阶段，点「升入新阶段」创建第一段</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {phases.map(ph => {
            const st = derivePhaseStatus(ph);
            const phaseFees = feesOf(ph.id);
            const addable = availableTypes(ph.id);
            return (
              <div key={ph.id} style={{ border: '1px solid var(--color-border-tertiary)', borderRadius: 10, overflow: 'hidden' }}>
                {/* 阶段头 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-background-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>{ph.programs?.name || '未设阶段'}</span>
                    <span className={`pill ${st.cls}`}>{st.label}</span>
                    {ph.source && <span className="pill p-gray">{ph.source === 'green_channel' ? '绿通' : '散客'}</span>}
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{ph.start_date || '—'} 至 {ph.end_date || '—'}</span>
                  </div>
                  <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => openEdit(ph)}><IconPencil size={12} style={{ marginRight: 2 }} />编辑</button>
                </div>

                {/* 该阶段的服务费用 */}
                <div style={{ padding: '8px 14px' }}>
                  {phaseFees.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '4px 0 8px' }}>尚未登记服务</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
                      {phaseFees.map(f => (
                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                          <span style={{ fontSize: 13, fontWeight: 500, width: 60 }}>{FEE_TYPE_LABELS[f.fee_type]}</span>
                          <span onClick={() => togglePaid(f.id, !f.is_paid)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', flex: 1 }}>
                            {f.is_paid
                              ? <><IconCircleCheck size={15} style={{ color: 'var(--color-success)' }} /><span className="pill p-green">已缴</span></>
                              : <><IconCircle size={15} style={{ color: 'var(--color-text-tertiary)' }} /><span className="pill p-amber">未缴</span></>}
                            {f.paid_date && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{f.paid_date}</span>}
                          </span>
                          <button className="btn" style={{ padding: '2px 6px', background: 'transparent', border: 'none' }} onClick={() => deleteFee(f.id)} title="删除"><IconTrash size={13} color="var(--color-danger)" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* 添加服务 */}
                  {addable.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', alignSelf: 'center' }}>添加服务：</span>
                      {addable.map(t => (
                        <button key={t} className="btn" style={{ padding: '2px 10px', fontSize: 12 }} onClick={() => handleAddService(ph.id, t)}>
                          <IconPlus size={12} style={{ marginRight: 2 }} />{FEE_TYPE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 新增/编辑阶段 */}
      <Modal title={editId ? '编辑阶段' : '升入新阶段'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={savePhase} okText={saving ? '保存中…' : '保存'} confirmLoading={saving} width={520}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">学习阶段</label>
            <select className="input" value={form.program_id} onChange={e => onFormChange({ program_id: e.target.value })}>
              <option value="">请选择</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}{p.duration_months ? `（${p.duration_months}个月）` : ''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">商务来源</label>
            <select className="input" value={form.source} onChange={e => onFormChange({ source: e.target.value })}>
              <option value="">未设置</option>
              <option value="green_channel">绿通</option>
              <option value="agent">散客</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">在读状态</label>
            <select className="input" value={form.status} onChange={e => onFormChange({ status: e.target.value })}>
              <option value="active">按日期自动（待入学/在读/已完成）</option>
              <option value="completed">强制标记已完成</option>
              <option value="withdrawn">退学</option>
              <option value="suspended">暂停</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">入学日期</label>
            <input className="input" type="date" value={form.start_date} onChange={e => onFormChange({ start_date: e.target.value })} />
            {(() => {
              const progName = programs.find(p => p.id === Number(form.program_id))?.name;
              const intakes = progName ? PROGRAM_INTAKES[progName] : null;
              if (!intakes) return null;
              const year = (form.start_date && /^\d{4}/.test(form.start_date)) ? form.start_date.slice(0, 4) : String(new Date().getFullYear());
              return (
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>开学季：</span>
                  {intakes.map(it => (
                    <button key={it.md} type="button" className="btn" style={{ padding: '2px 10px', fontSize: 12 }}
                      onClick={() => onFormChange({ start_date: `${year}-${it.md}` })}>
                      {it.label}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
          <div className="form-group">
            <label className="form-label">预计结束</label>
            <input className="input" type="date" value={form.end_date} onChange={e => onFormChange({ end_date: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: -4 }}>
            选阶段或改入学日期时，「预计结束」按学制自动算出，可手动调整。{!editId && '新增阶段会把当前"在读"的旧阶段自动标记为已完成。'}
          </div>
        </div>
      </Modal>
    </div>
  );
}
