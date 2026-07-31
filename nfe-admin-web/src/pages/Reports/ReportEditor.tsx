import { useState } from 'react';
import { Modal, InputNumber } from 'antd';
import { IconPlus, IconTrash, IconFileDownload } from '@tabler/icons-react';
import type { ReportRecord, ReportContent, ReportSubject } from '../../store/useReportStore';
import { emptyContent } from '../../store/useReportStore';
import { exportReportDoc } from '../../lib/reportExport';
import { summarizeSubject, cnOf, fmtDate, downloadAcademicDocx } from '../../lib/reportDocx';

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
  const isAcademic = report.report_type === 'monthly';

  return (
    <Modal title={`编辑报告 · ${report.student?.full_name || ''}`} open onCancel={onCancel} onOk={save}
      okText={saving ? '保存中…' : '保存'} confirmLoading={saving} width={680}
      footer={[
        <button key="x" className="btn" onClick={() => {
          const r = { ...report, content: c };
          // 学术月报走真 .docx 表格版式；出勤双周报仍用原导出
          if (isAcademic) downloadAcademicDocx(r, { studentName: report.student?.full_name || '学生' });
          else exportReportDoc(r);
        }}><IconFileDownload size={14} style={{ marginRight: 4 }} />导出 Word</button>,
        <button key="c" className="btn" onClick={onCancel}>取消</button>,
        <button key="s" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>,
      ]}>
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

        {/* 预警提示区（自动，只读） */}
        <Block title="📌 预警提示（自动）">
          {c.alerts && c.alerts.length
            ? <div style={{ border: '1px solid var(--color-danger)', background: 'rgba(226,75,74,0.06)', padding: '8px 10px', borderRadius: 6, fontSize: 13 }}>{c.alerts.join('；')}</div>
            : <div style={{ fontSize: 13, color: 'var(--color-success)' }}>本期表现正常。</div>}
        </Block>

        {isAcademic ? (
          <>
            {/* 学术：各科加权总评（只读汇总） */}
            <Block title="科目成绩（自动汇总，与导出 Word 一致）">
              {(c.subjects && c.subjects.length)
                ? c.subjects.map((s, i) => <SubjectTable key={i} sub={s} />)
                : <Empty />}
            </Block>
            {/* 学术：辅导反馈（只读） */}
            <Block title="辅导课反馈（本期）">
              {(c.tutoring_feedback && c.tutoring_feedback.length) ? c.tutoring_feedback.map((f, i) => (
                <div key={i} style={{ fontSize: 13, padding: '3px 0' }}>{f.date} {f.subject}：{f.feedback}</div>
              )) : <Empty />}
            </Block>
          </>
        ) : (
          <>
        {/* 出勤 */}
        <Block title="出勤情况">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Field label="官方出勤率(%)"><InputNumber min={0} max={100} style={{ width: 110 }} value={c.attendance.official_rate ?? undefined} onChange={v => setAtt('official_rate', (v as number) ?? null)} /></Field>
            <Field label="内部出勤率(%)"><InputNumber min={0} max={100} style={{ width: 110 }} value={c.attendance.rate ?? undefined} onChange={v => setAtt('rate', (v as number) ?? null)} /></Field>
            <Field label="在场"><InputNumber min={0} style={{ width: 80 }} value={c.attendance.present} onChange={v => setAtt('present', (v as number) ?? 0)} /></Field>
            <Field label="缺席"><InputNumber min={0} style={{ width: 80 }} value={c.attendance.absent} onChange={v => setAtt('absent', (v as number) ?? 0)} /></Field>
            <Field label="请假"><InputNumber min={0} style={{ width: 80 }} value={c.attendance.leave} onChange={v => setAtt('leave', (v as number) ?? 0)} /></Field>
          </div>
        </Block>
          </>
        )}

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
  const isAcademic = report.report_type === 'monthly';
  const period = report.period_start && report.period_end ? `${report.period_start} 至 ${report.period_end}` : '—';
  return (
    <Modal title="报告预览" open onCancel={onClose} width={680}
      footer={[
        <button key="d" className="btn" onClick={() => exportReportDoc(report)}><IconFileDownload size={14} style={{ marginRight: 4 }} />导出 Word</button>,
        <button key="c" className="btn btn-primary" onClick={onClose}>关闭</button>,
      ]}>
      <div style={{ padding: '8px 4px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 4 }}>{report.title || (isAcademic ? '学术月报' : '出勤双周报')}</h2>
        <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, marginBottom: 16 }}>
          {report.student?.full_name} · 报告周期 {period}
        </div>
        <PvSection title="📌 预警提示">
          {c.alerts && c.alerts.length
            ? <span style={{ color: 'var(--color-danger)' }}>{c.alerts.join('；')}</span>
            : <span style={{ color: 'var(--color-success)' }}>本期表现正常</span>}
        </PvSection>

        {isAcademic ? (
          <>
            <PvSection title="科目成绩">
              {c.subjects && c.subjects.length
                ? c.subjects.map((s, i) => <SubjectTable key={i} sub={s} />)
                : '本期暂无成绩'}
            </PvSection>
            <PvSection title="辅导课反馈">
              {c.tutoring_feedback && c.tutoring_feedback.length ? c.tutoring_feedback.map((f, i) => <div key={i}>{f.date} {f.subject}：{f.feedback}</div>) : '本期暂无辅导反馈'}
            </PvSection>
          </>
        ) : (
          <>
            <PvSection title="出勤情况">
              官方出勤率 {c.attendance.official_rate != null ? `${c.attendance.official_rate}%` : '—'}（要求 ≥95%）　|　内部 {c.attendance.rate != null ? `${c.attendance.rate}%` : '—'}　|　在场 {c.attendance.present}　缺席 {c.attendance.absent}　请假 {c.attendance.leave}
            </PvSection>
            <PvSection title="违规情况">
              {c.violations.length ? c.violations.map((v, i) => <div key={i}>{v.date} {v.type} {v.note}</div>) : '本周期无违规记录'}
            </PvSection>
          </>
        )}
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
// 预览用科目表 —— 与导出 Word 同版式、同口径（summarizeSubject 来自 reportDocx）
function SubjectTable({ sub }: { sub: ReportSubject }) {
  const s = summarizeSubject(sub);
  const cn = cnOf(sub.name);
  const th: React.CSSProperties = {
    padding: '6px 8px', background: 'var(--color-bg-tertiary)', fontWeight: 600,
    fontSize: 12, textAlign: 'left', border: '1px solid var(--color-border-tertiary)',
  };
  const td: React.CSSProperties = {
    padding: '6px 8px', fontSize: 12, border: '1px solid var(--color-border-tertiary)',
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{cn ? `${sub.name}（${cn}）` : sub.name}</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr>
              <th style={th}>评估项</th>
              <th style={{ ...th, textAlign: 'center', width: 64 }}>占比</th>
              <th style={{ ...th, textAlign: 'center', width: 80 }}>得分</th>
              <th style={{ ...th, textAlign: 'center', width: 92 }}>记录时间</th>
              <th style={{ ...th, width: 140 }}>措施</th>
            </tr>
          </thead>
          <tbody>
            {sub.nodes.map((n, i) => {
              const pending = n.score == null;
              const low = !pending && n.weight > 0 && (n.score as number) < sub.passMark;
              return (
                <tr key={i}>
                  <td style={td}>{n.title}</td>
                  <td style={{ ...td, textAlign: 'center', color: n.weight > 0 ? undefined : 'var(--color-danger)' }}>
                    {n.weight > 0 ? `${n.weight}%` : '待确认'}
                  </td>
                  <td style={{
                    ...td, textAlign: 'center', fontWeight: low ? 700 : 400,
                    color: low ? 'var(--color-danger)' : pending ? 'var(--color-text-tertiary)' : undefined,
                  }}>
                    {pending ? '待录' : `${n.score}%`}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>{fmtDate(n.date)}</td>
                  <td style={{ ...td, color: 'var(--color-text-tertiary)' }}>—</td>
                </tr>
              );
            })}
            <tr style={{ background: 'var(--color-bg-secondary)' }}>
              <td style={{ ...td, fontWeight: 600 }}>已出成绩加权小结</td>
              <td style={{ ...td, textAlign: 'center', fontWeight: 600 }}>{s.gradedWeight}%</td>
              <td style={{ ...td, textAlign: 'center', fontWeight: 600 }}>{s.avg == null ? '—' : `${s.avg}%`}</td>
              <td style={{ ...td, textAlign: 'center' }}>过线 {sub.passMark}</td>
              <td style={td}>剩余 {s.remaining}% 需均分：{s.need}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PvSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 600, fontSize: 13, borderLeft: '3px solid var(--color-primary)', paddingLeft: 8, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, paddingLeft: 11 }}>{children}</div>
    </div>
  );
}
