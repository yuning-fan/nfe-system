import { useState } from 'react';
import { Modal, InputNumber, message } from 'antd';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { ReportRecord, ReportContent } from '../../store/useReportStore';
import { emptyContent } from '../../store/useReportStore';

// 双周学术报告编辑器
export function ReportEditor({ report, onCancel, onSave }: {
  report: ReportRecord;
  onCancel: () => void;
  onSave: (patch: { content: ReportContent; period_start: string | null; period_end: string | null }) => Promise<void>;
}) {
  const [c, setC] = useState<ReportContent>({ ...emptyContent(), ...report.content });
  const [start, setStart] = useState(report.period_start || '');
  const [end, setEnd] = useState(report.period_end || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try { await onSave({ content: c, period_start: start || null, period_end: end || null }); }
    finally { setSaving(false); }
  };

  const setAtt = (k: keyof ReportContent['attendance'], v: number | null) =>
    setC(p => ({ ...p, attendance: { ...p.attendance, [k]: v as any } }));

  return (
    <Modal title={`编辑报告 · ${report.student?.full_name || ''}`} open onCancel={onCancel} onOk={save}
      okText={saving ? '保存中…' : '保存'} confirmLoading={saving} width={680}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12, maxHeight: '68vh', overflowY: 'auto' }}>
        {/* 周期 */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">周期开始</label>
            <input type="date" className="input" style={{ width: '100%' }} value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">周期结束</label>
            <input type="date" className="input" style={{ width: '100%' }} value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        </div>

        {/* 出勤 */}
        <Block title="出勤情况">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Field label="出勤率(%)"><InputNumber min={0} max={100} style={{ width: 100 }} value={c.attendance.rate ?? undefined} onChange={v => setAtt('rate', (v as number) ?? null)} /></Field>
            <Field label="在场"><InputNumber min={0} style={{ width: 80 }} value={c.attendance.present} onChange={v => setAtt('present', (v as number) ?? 0)} /></Field>
            <Field label="缺席"><InputNumber min={0} style={{ width: 80 }} value={c.attendance.absent} onChange={v => setAtt('absent', (v as number) ?? 0)} /></Field>
            <Field label="请假"><InputNumber min={0} style={{ width: 80 }} value={c.attendance.leave} onChange={v => setAtt('leave', (v as number) ?? 0)} /></Field>
          </div>
        </Block>

        {/* 成绩 */}
        <Block title="成绩" action={<AddBtn onClick={() => setC(p => ({ ...p, grades: [...p.grades, { subject: '', score: '', note: '' }] }))} />}>
          {c.grades.length === 0 && <Empty />}
          {c.grades.map((g, i) => (
            <Row key={i} onDel={() => setC(p => ({ ...p, grades: p.grades.filter((_, j) => j !== i) }))}>
              <input className="input" placeholder="科目" value={g.subject} onChange={e => setC(p => { const a = [...p.grades]; a[i] = { ...a[i], subject: e.target.value }; return { ...p, grades: a }; })} />
              <input className="input" placeholder="成绩" value={g.score} onChange={e => setC(p => { const a = [...p.grades]; a[i] = { ...a[i], score: e.target.value }; return { ...p, grades: a }; })} />
              <input className="input" placeholder="备注/考试" value={g.note} onChange={e => setC(p => { const a = [...p.grades]; a[i] = { ...a[i], note: e.target.value }; return { ...p, grades: a }; })} />
            </Row>
          ))}
        </Block>

        {/* 辅导课情况 */}
        <Block title="辅导课情况">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Field label="课次"><InputNumber min={0} style={{ width: 90 }} value={c.tutoring.sessions} onChange={v => setC(p => ({ ...p, tutoring: { ...p.tutoring, sessions: (v as number) ?? 0 } }))} /></Field>
            <Field label="课时"><InputNumber min={0} step={0.5} style={{ width: 90 }} value={c.tutoring.hours} onChange={v => setC(p => ({ ...p, tutoring: { ...p.tutoring, hours: (v as number) ?? 0 } }))} /></Field>
            <Field label="说明" grow><input className="input" style={{ width: '100%' }} value={c.tutoring.note} onChange={e => setC(p => ({ ...p, tutoring: { ...p.tutoring, note: e.target.value } }))} /></Field>
          </div>
        </Block>

        {/* 违规 */}
        <Block title="违规情况" action={<AddBtn onClick={() => setC(p => ({ ...p, violations: [...p.violations, { type: '', date: '', note: '' }] }))} />}>
          {c.violations.length === 0 && <Empty />}
          {c.violations.map((v, i) => (
            <Row key={i} onDel={() => setC(p => ({ ...p, violations: p.violations.filter((_, j) => j !== i) }))}>
              <input className="input" placeholder="类型" value={v.type} onChange={e => setC(p => { const a = [...p.violations]; a[i] = { ...a[i], type: e.target.value }; return { ...p, violations: a }; })} />
              <input className="input" placeholder="日期" value={v.date} onChange={e => setC(p => { const a = [...p.violations]; a[i] = { ...a[i], date: e.target.value }; return { ...p, violations: a }; })} />
              <input className="input" placeholder="说明" value={v.note} onChange={e => setC(p => { const a = [...p.violations]; a[i] = { ...a[i], note: e.target.value }; return { ...p, violations: a }; })} />
            </Row>
          ))}
        </Block>

        {/* 综合评语 */}
        <Block title="老师综合评价">
          <textarea className="input" rows={4} style={{ width: '100%' }} value={c.comment}
            onChange={e => setC(p => ({ ...p, comment: e.target.value }))} placeholder="对本周期学习表现、进步与建议的综合评价…" />
        </Block>
      </div>
    </Modal>
  );
}

// 报告预览（格式化只读，可打印导出）
export function ReportPreview({ report, onClose }: { report: ReportRecord; onClose: () => void }) {
  const c = { ...emptyContent(), ...report.content };
  const period = report.period_start && report.period_end ? `${report.period_start} 至 ${report.period_end}` : '—';
  const print = () => { message.info('使用浏览器打印/另存为 PDF'); window.print(); };
  return (
    <Modal title="报告预览" open onCancel={onClose} width={680}
      footer={[<button key="p" className="btn" onClick={print}>打印 / 导出PDF</button>, <button key="c" className="btn btn-primary" onClick={onClose}>关闭</button>]}>
      <div style={{ padding: '8px 4px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 4 }}>{report.title || '双周学术报告'}</h2>
        <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, marginBottom: 16 }}>
          {report.student?.full_name} · 报告周期 {period}
        </div>
        <PvSection title="出勤情况">
          出勤率 {c.attendance.rate != null ? `${c.attendance.rate}%` : '—'}　|　在场 {c.attendance.present}　缺席 {c.attendance.absent}　请假 {c.attendance.leave}
        </PvSection>
        <PvSection title="成绩">
          {c.grades.length ? (
            <table className="tbl" style={{ width: '100%' }}><tbody>
              {c.grades.map((g, i) => <tr key={i}><td style={{ padding: '4px 8px' }}>{g.subject || '—'}</td><td style={{ padding: '4px 8px', fontWeight: 600 }}>{g.score || '—'}</td><td style={{ padding: '4px 8px', color: 'var(--color-text-tertiary)' }}>{g.note}</td></tr>)}
            </tbody></table>
          ) : '本周期暂无成绩记录'}
        </PvSection>
        <PvSection title="辅导课情况">
          课次 {c.tutoring.sessions}　课时 {c.tutoring.hours}h{c.tutoring.note ? `　·　${c.tutoring.note}` : ''}
        </PvSection>
        <PvSection title="违规情况">
          {c.violations.length ? c.violations.map((v, i) => <div key={i}>{v.date} {v.type} {v.note}</div>) : '本周期无违规记录'}
        </PvSection>
        <PvSection title="老师综合评价">
          {c.comment || '—'}
        </PvSection>
      </div>
    </Modal>
  );
}

// —— 小组件 ——
function Block({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>{action}
      </div>
      {children}
    </div>
  );
}
function Field({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return <div style={{ flex: grow ? 1 : undefined }}><div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>{label}</div>{children}</div>;
}
function Row({ children, onDel }: { children: React.ReactNode; onDel: () => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr auto', gap: 8, marginBottom: 8 }}>
      {children}
      <button className="btn" onClick={onDel} style={{ padding: '4px 8px', minHeight: 0, color: 'var(--color-danger)' }}><IconTrash size={14} /></button>
    </div>
  );
}
function AddBtn({ onClick }: { onClick: () => void }) {
  return <button className="btn" onClick={onClick} style={{ padding: '2px 10px', fontSize: 12, minHeight: 24 }}><IconPlus size={12} /> 添加</button>;
}
function Empty() { return <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '4px 0' }}>暂无,点「添加」</div>; }
function PvSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 600, fontSize: 13, borderLeft: '3px solid var(--color-primary)', paddingLeft: 8, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, paddingLeft: 11 }}>{children}</div>
    </div>
  );
}
