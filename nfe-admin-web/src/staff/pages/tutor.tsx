// 辅导老师 · 详情页（上课记录已接真功能：销课/缺勤/请假/反馈/申请调课；其余仍为静态壳）
import { useEffect, useState, useCallback } from 'react';
import { message, Modal, Select, Input } from 'antd';
import { IconLoader2 } from '@tabler/icons-react';
import { Section, Table, riskPill, pill, primaryBtn, previewNote } from '../ui';
import { useAuthStore } from '../../store/useAuthStore';
import { useScheduleStore, type Schedule, type CompleteOutcome } from '../../store/useScheduleStore';

export function TutorStudents() {
  const card = (initial: string, name: string, meta: string, level: 'red' | 'yellow' | 'green', stats: [string, string][]) => (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div className="avatar-sm">{initial}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{meta}</div>
        </div>
        {riskPill(level)}
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        {stats.map(([l, v]) => (
          <div key={l}><span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{l} </span><b style={{ fontSize: 13 }}>{v}</b></div>
        ))}
      </div>
    </div>
  );
  return (
    <Section title="我的学生" hint="名下学生 · 只读学习档案">
      {card('林', '林思远', 'MAGS · Y13 · 数学', 'yellow', [['本周课时', '2 节'], ['上次成绩', 'B+（英语写作）'], ['课时余量', '16 课时'], ['学习状态', '需关注']])}
      {card('王', '王明宇', 'Avondale College · Y11 · 数学', 'green', [['本周课时', '3 节'], ['上次成绩', 'A（代数单测）'], ['课时余量', '22 课时'], ['学习状态', '进步明显']])}
      {card('张', '张晓明', 'Avondale College · Y12 · 物理', 'red', [['本周课时', '1 节'], ['上次成绩', '42/100'], ['课时余量', '4 课时'], ['学习状态', '需重点干预']])}
    </Section>
  );
}

export function TutorSchedule() {
  return (
    <Section title="我的课表" hint="本周排课 · 2026 年第 23 周" action={primaryBtn('申请调课')}>
      <Table
        cols={['时段', '周一', '周二', '周三', '周四', '周五']}
        rows={[
          ['09:00', '张晓明 物理 60min', '', '张晓明 物理 待确认', '', ''],
          ['14:00', '', '林思远 数学 60min', '', '林思远 数学 60min', ''],
          ['16:00', '王明宇 数学 60min', '', '王明宇 数学 60min', '', '王明宇 数学 60min'],
        ]}
      />
      {previewNote()}
    </Section>
  );
}

// ── 上课记录（真功能）────────────────────────────────
const STATUS_PILL: Record<string, [string, string]> = {
  scheduled: ['p-blue', '待上课'],
  rescheduling: ['p-amber', '调课中'],
  completed: ['p-green', '已完成'],
  absent: ['p-red', '无故缺勤'],
  leave: ['p-amber', '请假'],
  cancelled: ['p-gray', '已取消'],
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function TutorRecords() {
  const tutorId = useAuthStore(s => s.user?.id ?? null);
  const { mySchedules, fetchMySchedules, completeSchedule, requestReschedule, isLoading } = useScheduleStore();

  // 销课弹窗
  const [settle, setSettle] = useState<Schedule | null>(null);
  const [outcome, setOutcome] = useState<CompleteOutcome>('present');
  const [fbPublic, setFbPublic] = useState('');
  const [fbInternal, setFbInternal] = useState('');
  const [homework, setHomework] = useState('');

  // 调课弹窗
  const [resch, setResch] = useState<Schedule | null>(null);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(() => { if (tutorId) fetchMySchedules(tutorId); }, [tutorId, fetchMySchedules]);
  useEffect(() => { load(); }, [load]);

  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const canSettle = (s: Schedule) => new Date(s.start_time) <= endOfToday; // 只能销今天及以前的课

  const todo = mySchedules.filter(s => s.status === 'scheduled' || s.status === 'rescheduling');
  const done = mySchedules.filter(s => ['completed', 'absent', 'leave', 'cancelled'].includes(s.status));

  const openSettle = (s: Schedule) => {
    setSettle(s); setOutcome('present');
    setFbPublic(s.feedback_public || ''); setFbInternal(s.feedback_internal || ''); setHomework(s.homework_content || '');
  };

  const doSettle = async () => {
    if (!settle) return;
    if (outcome === 'present' && !fbPublic.trim()) { message.warning('出席请至少填写公开反馈'); return; }
    const ok = await completeSchedule(settle.id, { outcome, feedback_public: fbPublic, feedback_internal: fbInternal, homework_content: homework });
    if (ok) {
      message.success(outcome === 'present' ? '已销课，课时已扣减' : outcome === 'absent' ? '已记缺勤：扣课时 + 风险分已更新' : '已记请假：不扣课时');
      setSettle(null);
    } else message.error('操作失败');
  };

  const openResch = (s: Schedule) => {
    setResch(s); setNewStart(toLocalInput(s.start_time)); setNewEnd(toLocalInput(s.end_time)); setReason('');
  };
  const doResch = async () => {
    if (!resch) return;
    if (!reason.trim()) { message.warning('请填写调课原因'); return; }
    const ok = await requestReschedule(resch.id, new Date(newStart).toISOString(), new Date(newEnd).toISOString(), reason.trim());
    if (ok) { message.success('调课申请已提交，等待学管/admin 审批'); setResch(null); }
    else message.error('提交失败');
  };

  if (isLoading && mySchedules.length === 0) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;
  }

  return (
    <>
      <Section title="待销课" hint="上完课后销课：出席 / 缺勤 / 请假，并填写反馈。只能给今天及以前的课销课。">
        {todo.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无待销课</div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead><tr>
              <th style={{ padding: '10px 12px' }}>学生</th><th style={{ padding: '10px 12px' }}>科目</th>
              <th style={{ padding: '10px 12px' }}>时间</th><th style={{ padding: '10px 12px' }}>状态</th>
              <th style={{ padding: '10px 12px' }}>操作</th>
            </tr></thead>
            <tbody>
              {todo.map(s => (
                <tr key={s.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{s.student?.full_name || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{s.subject_label || s.course?.name || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{fmt(s.start_time)}–{fmt(s.end_time).slice(-5)}</td>
                  <td style={{ padding: '10px 12px' }}>{pill(STATUS_PILL[s.status]?.[0] || 'p-gray', STATUS_PILL[s.status]?.[1] || s.status)}</td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    {s.status === 'rescheduling' ? (
                      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>调课待审批</span>
                    ) : (
                      <>
                        <span className="link" style={{ color: canSettle(s) ? 'var(--color-primary)' : 'var(--color-text-tertiary)', pointerEvents: canSettle(s) ? 'auto' : 'none' }}
                          onClick={() => canSettle(s) && openSettle(s)}>销课</span>
                        {' · '}
                        <span className="link" onClick={() => openResch(s)}>申请调课</span>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="已上课记录" hint="近期已销课 / 缺勤 / 请假 / 取消">
        {done.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无记录</div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead><tr>
              <th style={{ padding: '10px 12px' }}>学生</th><th style={{ padding: '10px 12px' }}>科目</th>
              <th style={{ padding: '10px 12px' }}>时间</th><th style={{ padding: '10px 12px' }}>结果</th>
              <th style={{ padding: '10px 12px' }}>公开反馈</th>
            </tr></thead>
            <tbody>
              {done.map(s => (
                <tr key={s.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{s.student?.full_name || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{s.subject_label || s.course?.name || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{fmt(s.start_time)}</td>
                  <td style={{ padding: '10px 12px' }}>{pill(STATUS_PILL[s.status]?.[0] || 'p-gray', STATUS_PILL[s.status]?.[1] || s.status)}</td>
                  <td style={{ padding: '10px 12px', maxWidth: 260, color: 'var(--color-text-secondary)' }}>{s.feedback_public || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* 销课弹窗 */}
      <Modal title="销课 / 上课记录" open={!!settle} onCancel={() => setSettle(null)} onOk={doSettle}
        okText={isLoading ? '提交中…' : '提交'} confirmLoading={isLoading} width={480}>
        {settle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <div style={{ fontSize: 13 }}>{settle.student?.full_name} · {settle.subject_label || settle.course?.name} · {fmt(settle.start_time)}</div>
            <div>
              <label className="form-label">本节结果</label>
              <Select style={{ width: '100%' }} value={outcome} onChange={v => setOutcome(v)}
                options={[
                  { label: '出席（扣课时）', value: 'present' },
                  { label: '无故缺勤（扣课时 + 风险 −8）', value: 'absent' },
                  { label: '请假（不扣课时、不扣风险）', value: 'leave' },
                ]} />
            </div>
            {outcome !== 'leave' && (
              <>
                <div>
                  <label className="form-label">公开反馈{outcome === 'present' ? ' *' : '（可空）'}</label>
                  <Input.TextArea rows={2} value={fbPublic} onChange={e => setFbPublic(e.target.value)} placeholder="家长可见：课堂表现、掌握情况" />
                </div>
                <div>
                  <label className="form-label">内部备注（仅内部可见）</label>
                  <Input.TextArea rows={2} value={fbInternal} onChange={e => setFbInternal(e.target.value)} placeholder="仅机构内部，不对家长" />
                </div>
                <div>
                  <label className="form-label">作业</label>
                  <Input value={homework} onChange={e => setHomework(e.target.value)} placeholder="布置的作业" />
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* 调课弹窗 */}
      <Modal title="申请调课" open={!!resch} onCancel={() => setResch(null)} onOk={doResch}
        okText="提交申请" confirmLoading={isLoading} width={420}>
        {resch && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <div style={{ fontSize: 13 }}>{resch.student?.full_name} · 原时间 {fmt(resch.start_time)}</div>
            <div>
              <label className="form-label">新开始时间</label>
              <input className="input" type="datetime-local" style={{ width: '100%' }} value={newStart} onChange={e => setNewStart(e.target.value)} />
            </div>
            <div>
              <label className="form-label">新结束时间</label>
              <input className="input" type="datetime-local" style={{ width: '100%' }} value={newEnd} onChange={e => setNewEnd(e.target.value)} />
            </div>
            <div>
              <label className="form-label">调课原因 *</label>
              <Input.TextArea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="说明调课原因" />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
