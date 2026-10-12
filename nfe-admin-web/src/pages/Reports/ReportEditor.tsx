import { useState } from 'react';
import { Modal, InputNumber, message } from 'antd';
import { IconPlus, IconTrash, IconFileDownload, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { ReportRecord, ReportContent, ReportSubject, ReportNode } from '../../store/useReportStore';
import { emptyContent, syncNodeNotes, loadDocxMeta } from '../../store/useReportStore';
import { useAuthStore } from '../../store/useAuthStore';
import {
  summarizeSubject, cnOf, fmtDate, downloadReportDocx, cohortShort, cohortText, targetBenchmark,
  rateStatus, LIGHT_LABEL, KIND_CN, NIGHT_KIND_CN, nightSummary, type Light,
} from '../../lib/reportDocx';

// 导出：抬头要学号/项目，现查
export async function exportReport(r: ReportRecord) {
  try {
    const meta = await loadDocxMeta(r.student_id, r.student?.full_name || '学生');
    await downloadReportDocx(r, meta);
  } catch (e: any) {
    message.error(e?.message || '导出失败');
  }
}

const LIGHT_CSS: Record<Light, string> = {
  green: 'var(--color-success)', yellow: 'var(--color-warning, #b26b00)', red: 'var(--color-danger)', gray: 'var(--color-text-tertiary)',
};

// 报告编辑器：自动预填的部分只读，学管补「逐项说明」与「综合评价」
export function ReportEditor({ report, onCancel, onSave }: {
  report: ReportRecord;
  onCancel: () => void;
  onSave: (patch: { content: ReportContent; period_start: string | null; period_end: string | null }) => Promise<void>;
}) {
  const original = { ...emptyContent(), ...report.content };
  const [c, setC] = useState<ReportContent>(original);
  const [start, setStart] = useState(report.period_start || '');
  const [end, setEnd] = useState(report.period_end || '');
  const [saving, setSaving] = useState(false);
  const isAcademic = report.report_type === 'monthly';

  const save = async () => {
    setSaving(true);
    try {
      // 逐项说明回写源表（只写改过的），下期报告和同批同学自动带出
      if (isAcademic) await syncNodeNotes(original, c, useAuthStore.getState().user?.id ?? null);
      await onSave({ content: c, period_start: start || null, period_end: end || null });
    } catch (e: any) {
      message.error(e?.message || '保存失败');
    } finally { setSaving(false); }
  };

  return (
    <Modal title={`编辑报告 · ${report.student?.full_name || ''}`} open onCancel={onCancel} width={820}
      footer={[
        <button key="x" className="btn" onClick={() => exportReport({ ...report, content: c, period_start: start || null, period_end: end || null })}>
          <IconFileDownload size={14} style={{ marginRight: 4 }} />导出 Word</button>,
        <button key="c" className="btn" onClick={onCancel}>取消</button>,
        <button key="s" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>,
      ]}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 12, maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
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
        <ReportBody c={c} setC={setC} isAcademic={isAcademic} />
      </div>
    </Modal>
  );
}

// 报告预览（只读）
export function ReportPreview({ report, onClose }: { report: ReportRecord; onClose: () => void }) {
  const c = { ...emptyContent(), ...report.content };
  const isAcademic = report.report_type === 'monthly';
  const period = report.period_start && report.period_end ? `${report.period_start} 至 ${report.period_end}` : '—';
  return (
    <Modal title="报告预览" open onCancel={onClose} width={820}
      footer={[
        <button key="d" className="btn" onClick={() => exportReport(report)}><IconFileDownload size={14} style={{ marginRight: 4 }} />导出 Word</button>,
        <button key="c" className="btn btn-primary" onClick={onClose}>关闭</button>,
      ]}>
      <div style={{ padding: '8px 4px', maxHeight: '72vh', overflowY: 'auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 4 }}>{report.title || (isAcademic ? '学术月报' : '出勤双周报')}</h2>
        <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, marginBottom: 16 }}>
          {report.student?.full_name} · 报告周期 {period}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <ReportBody c={c} isAcademic={isAcademic} />
        </div>
      </div>
    </Modal>
  );
}

// —— 报告正文：编辑器与预览共用；setC 为空即只读 ——
function ReportBody({ c, setC, isAcademic }: { c: ReportContent; setC?: React.Dispatch<React.SetStateAction<ReportContent>>; isAcademic: boolean }) {
  const ro = !setC;
  return (
    <>
      <Block title="📌 预警提示（自动）">
        {c.alerts && c.alerts.length
          ? <div style={{ border: '1px solid var(--color-danger)', background: 'rgba(226,75,74,0.06)', padding: '8px 10px', borderRadius: 6, fontSize: 13 }}>{c.alerts.join('；')}</div>
          : <div style={{ fontSize: 13, color: 'var(--color-success)' }}>本期无预警事项。</div>}
      </Block>

      {isAcademic ? <AcademicBody c={c} setC={setC} /> : <AttendanceBody c={c} setC={setC} />}

      <Block title="综合评价">
        {ro ? <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{c.comment || '—'}</div> : (
          <textarea className="input" rows={4} style={{ width: '100%' }} value={c.comment}
            onChange={e => setC!(p => ({ ...p, comment: e.target.value }))} placeholder="本期整体表现、进步与不足、后续安排、希望家长配合的事项…" />
        )}
      </Block>
    </>
  );
}

// ───────── 学术报告 ─────────
function AcademicBody({ c, setC }: { c: ReportContent; setC?: React.Dispatch<React.SetStateAction<ReportContent>> }) {
  const subs = c.subjects || [];
  const setNode = (si: number, ni: number, patch: Partial<ReportNode>) => setC?.(p => {
    const subjects = [...(p.subjects || [])];
    const nodes = [...subjects[si].nodes];
    nodes[ni] = { ...nodes[ni], ...patch };
    subjects[si] = { ...subjects[si], nodes };
    return { ...p, subjects };
  });
  const bm = targetBenchmark(c);
  const order: Record<Light, number> = { red: 0, yellow: 1, green: 2, gray: 3 };

  return (
    <>
      <Block title="一、本期概览">
        {subs.length ? (
          <Tbl head={['科目', '已出均分', '过线', '状态', '说明']} center={[1, 2, 3]} rows={subs.map(sub => {
            const s = summarizeSubject(sub);
            return [sub.name, s.avg == null ? '—' : `${s.avg}%`, `${sub.passMark}%`,
              <b style={{ color: LIGHT_CSS[s.light] }}>{LIGHT_LABEL[s.light]}</b>, s.verdict];
          })} />
        ) : <Muted>本期暂无成绩</Muted>}
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6 }}>
          {c.attendance?.official_rate != null && <>学校出勤率 {c.attendance.official_rate}%（{rateStatus(c.attendance.official_rate).label}）　</>}
          {c.upcoming && <>未来 4 周 {c.upcoming.length} 项考核</>}
        </div>
      </Block>

      <Block title="二、各科成绩与分析">
        {!subs.length && <Muted>本期暂无成绩</Muted>}
        {subs.map((sub, si) => (
          <div key={si} style={{ marginBottom: 18 }}>
            <SubjectTable sub={sub} />
            {sub.nodes.map((n, ni) => n.score == null ? null : (
              <NodeNotes key={ni} n={n} intake={sub.intake} onChange={setC ? patch => setNode(si, ni, patch) : undefined} />
            ))}
          </div>
        ))}
      </Block>

      {subs.length > 0 && (
        <Block title="三、目标差距分析">
          <Tbl head={['科目', '过线', '已获得', '剩余权重', '后续需均分', '状态']} center={[1, 2, 3, 4, 5]}
            rows={subs.map(sub => ({ sub, s: summarizeSubject(sub) }))
              .sort((a, b) => order[a.s.light] - order[b.s.light] || (b.s.requiredAvg ?? 0) - (a.s.requiredAvg ?? 0))
              .map(({ sub, s }) => [sub.name, `${sub.passMark}%`, `${s.earned}%`, `${s.remaining}%`, s.need,
                <b style={{ color: LIGHT_CSS[s.light] }}>{LIGHT_LABEL[s.light]}</b>])} />
          <div style={{ marginTop: 12 }}>
            {bm.title ? (
              <>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{bm.title}</div>
                <Tbl head={['项目', '情况']} rows={bm.lines.map(l => [<b>{l.label}</b>,
                  <span style={{ whiteSpace: 'pre-wrap', color: l.tone === 'bad' ? 'var(--color-danger)' : l.tone === 'warn' ? LIGHT_CSS.yellow : l.tone === 'good' ? 'var(--color-success)' : undefined }}>{l.value}</span>])} />
              </>
            ) : <Muted>未录目标院校/专业，Word 中不显示升学对标（学生档案「编辑」里选择目标专业）</Muted>}
          </div>
        </Block>
      )}

      {c.upcoming && (
        <Block title="四、考核日历（未来 4 周）">
          {c.upcoming.length ? <Tbl head={['日期', '科目', '考核项目', '占比', '类型', '晚自习备考']} center={[0, 3, 4]}
            rows={c.upcoming.map(u => [fmtDate(u.date), u.subject, u.title, u.weight > 0 ? `${u.weight}%` : '—', u.kind ? (KIND_CN[u.kind] || u.kind) : '—', u.prep?.join('、') || '—'])} />
            : <Muted>未来 4 周暂无已排期的考核</Muted>}
        </Block>
      )}

      <Block title="五、辅导与晚自习">
        {c.night_sessions && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>晚自习课程</div>
            {c.night_sessions.length ? (
              <>
                <div style={{ fontSize: 13, marginBottom: 6 }}>{nightSummary(c.night_sessions)}</div>
                <Tbl head={['日期', '科目', '类型', '内容', '老师', '当晚出勤']} center={[0, 2, 5]}
                  rows={c.night_sessions.map(x => [`${fmtDate(x.date)} ${x.time}`, x.subject.replace(/ \(English for Academic Purposes\)/, ''), NIGHT_KIND_CN[x.kind] || x.kind,
                    <>{x.topic}{x.exam && <div style={{ color: 'var(--color-primary)' }}>→ {x.exam}</div>}</>, x.teacher || '—',
                    <span style={{ color: x.attended === '缺勤' ? 'var(--color-danger)' : x.attended === '出勤' ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}>{x.attended}</span>])} />
              </>
            ) : <Muted>本期暂无与所选科目相关的晚自习课程</Muted>}
          </div>
        )}
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>一对一辅导</div>
        {c.sessions ? (c.sessions.length ? (
          <Tbl head={['日期', '科目', '时长', '授课内容与重难点', '提醒 / 作业', '资料']} center={[0, 2]}
            rows={c.sessions.map(x => [fmtDate(x.date), x.subject, x.status === '已上' ? `${x.hours}h` : <span style={{ color: 'var(--color-danger)' }}>缺勤</span>,
              x.content || x.feedback || '—', [x.reminders, x.homework && `作业：${x.homework}`].filter(Boolean).join('；') || '—', x.material || '—'])} />
        ) : <Muted>本期暂无一对一辅导记录（辅导老师销课时填写的「授课内容」「重要提醒」会出现在这里）</Muted>)
          : (c.tutoring_feedback || []).length
            ? (c.tutoring_feedback || []).map((f, i) => <div key={i} style={{ fontSize: 13 }}>{f.date} {f.subject}：{f.feedback}</div>)
            : <Muted>本期暂无辅导课记录</Muted>}
      </Block>

      {(c.rate_history || c.leaves || c.night_checks) && (
        <>
          <div style={{ fontWeight: 600, fontSize: 14, borderLeft: '3px solid var(--color-primary)', paddingLeft: 8 }}>六、出勤与纪律</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 11 }}>
            <AttendanceBody c={c} setC={setC} nested />
          </div>
        </>
      )}
    </>
  );
}

// 单个已出分节点的说明：同批对比（自动）+ 考察重点/试卷特点（全批共用）+ 改进指导/学生反思（本人）
function NodeNotes({ n, intake, onChange }: { n: ReportNode; intake?: string | null; onChange?: (p: Partial<ReportNode>) => void }) {
  const filled = [n.exam_focus, n.paper_features, n.advice, n.reflection].filter(x => x && x.trim()).length;
  const [open, setOpen] = useState(false);
  const ct = cohortText(n);
  if (!onChange && !filled && !ct) return null;
  const ro = !onChange;
  const field = (label: string, key: 'exam_focus' | 'paper_features' | 'advice' | 'reflection', ph: string, disabled?: string) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>{label}{disabled && <span style={{ color: 'var(--color-danger)' }}>　{disabled}</span>}</div>
      {ro ? <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{n[key] || '—'}</div>
        : <textarea className="input" rows={2} style={{ width: '100%' }} placeholder={ph} disabled={!!disabled}
          value={n[key] || ''} onChange={e => onChange!({ [key]: e.target.value })} />}
    </div>
  );
  return (
    <div style={{ borderLeft: '2px solid var(--color-border-secondary)', margin: '6px 0 6px 4px', paddingLeft: 10 }}>
      <div style={{ fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setOpen(o => !o)}>
        {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        <b>{n.title}</b>
        <span style={{ color: 'var(--color-text-tertiary)' }}>（{n.score}%）</span>
        <span style={{ fontSize: 12, color: filled ? 'var(--color-success)' : 'var(--color-text-tertiary)', marginLeft: 6 }}>
          {filled ? `已填 ${filled}/4 项说明` : '未填说明'}
        </span>
      </div>
      {open && (
        <div style={{ padding: '6px 0 4px 18px' }}>
          {ct && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>层次与差距：{ct}</div>}
          {field('考察重点（同批共用）', 'exam_focus', '本次考试考察的知识点 / 能力', intake ? undefined : '该科无批次信息，无法保存')}
          {field('试卷特点（同批共用）', 'paper_features', '题型、难度、题量、与往次相比的变化', intake ? undefined : '该科无批次信息，无法保存')}
          {field('改进指导（辅导老师）', 'advice', '发挥不理想的原因、针对性措施与建议', n.grade_id ? undefined : '子项加权算出的总分，仅存本报告')}
          {field('学生反思', 'reflection', '学生本人的自我反馈（可代录原话）', n.grade_id ? undefined : '子项加权算出的总分，仅存本报告')}
        </div>
      )}
    </div>
  );
}

// ───────── 出勤报告 ─────────
// nested：并入学术报告「六、出勤与纪律」时，小节不带序号
function AttendanceBody({ c, setC, nested }: { c: ReportContent; setC?: React.Dispatch<React.SetStateAction<ReportContent>>; nested?: boolean }) {
  const ro = !setC;
  const T = (n: string, t: string) => (nested ? t : `${n}、${t}`);
  const setAtt = (k: keyof ReportContent['attendance'], v: number | null) =>
    setC?.(p => ({ ...p, attendance: { ...p.attendance, [k]: v as any } }));
  const a = c.attendance;
  const hist = c.rate_history || [];
  const nsTotal = a.present + a.absent + a.leave + (a.late ?? 0);
  return (
    <>
      <Block title={T('一', '学校口径出勤率')}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 8 }}>
          <Field label="当前学校出勤率(%)">
            {ro ? <span>{a.official_rate ?? '—'}</span>
              : <InputNumber min={0} max={100} style={{ width: 110 }} value={a.official_rate ?? undefined} onChange={v => setAtt('official_rate', (v as number) ?? null)} />}
          </Field>
          {a.official_rate != null && <span style={{ fontSize: 13, color: rateCss(a.official_rate) }}>{rateStatus(a.official_rate).label}</span>}
        </div>
        {hist.length ? <Tbl head={['采集日期', '出勤率', '较上次', '状态', '措施 / 说明']} center={[0, 1, 2, 3]}
          rows={hist.map((h, i) => {
            const d = i ? Math.round((h.rate - hist[i - 1].rate) * 10) / 10 : null;
            return [<span style={{ color: h.in_period ? undefined : 'var(--color-text-tertiary)' }}>{fmtDate(h.date)}</span>,
              `${h.rate}%`, d == null ? '—' : `${d > 0 ? '↑' : d < 0 ? '↓' : '→'} ${Math.abs(d)}`, rateStatus(h.rate).label, h.note || '—'];
          })} />
          : <Muted>{c.rate_history ? '暂无出勤率历史记录' : '旧版报告未含出勤率历史，重新生成可补上'}</Muted>}
      </Block>

      <Block title={T('二', '晚自习情况')}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          {(['present', 'late', 'leave', 'absent'] as const).map(k => (
            <Field key={k} label={{ present: '在场', late: '迟到', leave: '请假', absent: '缺席' }[k]}>
              {ro ? <span>{a[k] ?? 0}</span>
                : <InputNumber min={0} style={{ width: 80 }} value={a[k] ?? 0} onChange={v => setAtt(k, (v as number) ?? 0)} />}
            </Field>
          ))}
          <Field label="出勤率"><span>{a.rate != null ? `${a.rate}%` : '—'}（共 {nsTotal} 次）</span></Field>
        </div>
        {(c.night_checks || []).length
          ? <Tbl head={['日期', '状态', '备注']} center={[0, 1]} rows={(c.night_checks || []).map(x => [fmtDate(x.date), x.status, x.note || '—'])} />
          : <Muted>本期无迟到 / 请假 / 缺席记录</Muted>}
      </Block>

      <Block title={T('三', '请假情况')}>
        {c.leaves ? (c.leaves.length
          ? <Tbl head={['类型', '起止', '时长', '事由', '审批', '证明']} center={[0, 2, 4, 5]}
            rows={c.leaves.map(l => [l.type, `${l.start} ~ ${l.end}`, l.duration, l.reason || '—', `${l.status}${l.approver ? ` · ${l.approver}` : ''}`, l.has_proof ? '已提交' : '—'])} />
          : <Muted>本期无请假记录</Muted>) : <Muted>旧版报告未含请假明细，重新生成可补上</Muted>}
      </Block>

      <Block title={T('四', '警告与违规')} action={ro ? undefined : <AddBtn onClick={() => setC!(p => ({ ...p, violations: [...p.violations, { type: '', date: '', note: '' }] }))} />}>
        {(c.warnings || []).map((w, i) => (
          <div key={i} style={{ fontSize: 13, color: 'var(--color-danger)' }}>{fmtDate(w.date)} {w.source}警告信（{w.level} 级）{w.category}</div>
        ))}
        {!c.violations.length && !(c.warnings || []).length && <Muted>本期无警告信与违规记录</Muted>}
        {c.violations.map((v, i) => ro
          ? <div key={i} style={{ fontSize: 13 }}>{v.date} {v.type} {v.note}</div>
          : (
            <Row key={i} onDel={() => setC!(p => ({ ...p, violations: p.violations.filter((_, j) => j !== i) }))}>
              <input className="input" placeholder="类型" value={v.type} onChange={e => setC!(p => { const x = [...p.violations]; x[i] = { ...x[i], type: e.target.value }; return { ...p, violations: x }; })} />
              <input className="input" placeholder="日期" value={v.date} onChange={e => setC!(p => { const x = [...p.violations]; x[i] = { ...x[i], date: e.target.value }; return { ...p, violations: x }; })} />
              <input className="input" placeholder="说明" value={v.note} onChange={e => setC!(p => { const x = [...p.violations]; x[i] = { ...x[i], note: e.target.value }; return { ...p, violations: x }; })} />
            </Row>
          ))}
      </Block>
    </>
  );
}

const rateCss = (v: number) => (v >= 97 ? 'var(--color-success)' : v >= 95 ? 'var(--color-warning, #b26b00)' : 'var(--color-danger)');

// —— 小组件 ——
function Block({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14, borderLeft: '3px solid var(--color-primary)', paddingLeft: 8 }}>{title}</div>{action}
      </div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>{label}</div>{children}</div>;
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
function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '4px 0' }}>{children}</div>;
}

const th: React.CSSProperties = {
  padding: '6px 8px', background: 'var(--color-bg-tertiary)', fontWeight: 600,
  fontSize: 12, textAlign: 'left', border: '1px solid var(--color-border-tertiary)',
};
const td: React.CSSProperties = { padding: '6px 8px', fontSize: 12, border: '1px solid var(--color-border-tertiary)' };

function Tbl({ head, rows, center = [] }: { head: string[]; rows: React.ReactNode[][]; center?: number[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
        <thead><tr>{head.map((h, i) => <th key={i} style={{ ...th, textAlign: center.includes(i) ? 'center' : 'left' }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((x, j) => <td key={j} style={{ ...td, textAlign: center.includes(j) ? 'center' : 'left' }}>{x}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

// 科目表 —— 与导出 Word 同版式、同口径（summarizeSubject 来自 reportDocx）
function SubjectTable({ sub }: { sub: ReportSubject }) {
  const s = summarizeSubject(sub);
  const cn = cnOf(sub.name);
  return (
    <>
      <div style={{ fontWeight: 600, margin: '4px 0' }}>{cn ? `${sub.name}（${cn}）` : sub.name}<span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)', fontSize: 12 }}>　过线 {sub.passMark}%</span></div>
      <Tbl head={['评估项目', '占比', '得分', '日期', '同批对比']} center={[1, 2, 3]} rows={[
        ...sub.nodes.map(n => {
          const pending = n.score == null;
          const low = !pending && n.weight > 0 && (n.score as number) < sub.passMark;
          return [n.title,
            <span style={{ color: n.weight > 0 ? undefined : 'var(--color-danger)' }}>{n.weight > 0 ? `${n.weight}%` : '待确认'}</span>,
            <span style={{ fontWeight: low ? 700 : 400, color: low ? 'var(--color-danger)' : pending ? 'var(--color-text-tertiary)' : undefined }}>{pending ? '待出' : `${n.score}%`}</span>,
            fmtDate(n.date),
            <span style={{ color: 'var(--color-text-tertiary)' }}>{cohortShort(n)}</span>];
        }),
        [<b>已出成绩加权小结</b>, <b>{s.gradedWeight}%</b>, <b>{s.avg == null ? '—' : `${s.avg}%`}</b>, `过线 ${sub.passMark}`, `剩余 ${s.remaining}% 需均分：${s.need}`],
      ]} />
    </>
  );
}
