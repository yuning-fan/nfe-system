// 学习跟进（真功能）—— 巡查/辅导共用：作业核查 / 晚自习跟进 / 带背考察 / 个辅记录 / 重难点梳理
// 两种录入：批量模式（晚自习/带背/作业，像点名一样全员过一遍，只提交动过的行）+ 单条详细录入。
// "待跟进"点已跟进时需填处理结果，追加留痕。
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { message, Modal, Select, Input, AutoComplete } from 'antd';
import { IconLoader2, IconPlus, IconTrash, IconCheck, IconUsers, IconChevronRight, IconChevronDown } from '@tabler/icons-react';
import { Fragment } from 'react';
import { Section, pill } from '../ui';
import StudentSelect, { useStudentRoster } from '../../components/common/StudentSelect';

const db = supabase as any;

export const FOLLOW_UP_CATEGORIES: { value: string; label: string; hint: string }[] = [
  { value: 'homework_check', label: '作业核查', hint: '督促任务完成、批改作业、总结存在的问题' },
  { value: 'night_study', label: '晚自习跟进', hint: '晚自习学习情况：有效监督、有效检测；差生做好记录并反馈' },
  { value: 'recitation', label: '带背考察', hint: '语言基础较弱学生的带背与考察' },
  { value: 'mini_tutoring', label: '个辅记录', hint: '小老师额外个辅：备课、讲授内容、针对薄弱环节的提升（不进排课、不扣课时）' },
  { value: 'key_points', label: '重难点梳理', hint: '结合自身学习经历梳理各科重难点、学习进度' },
];

const CAT_LABEL: Record<string, string> = Object.fromEntries(FOLLOW_UP_CATEGORIES.map(c => [c.value, c.label]));
const CAT_PILL: Record<string, string> = {
  homework_check: 'p-blue', night_study: 'p-amber', recitation: 'p-purple', mini_tutoring: 'p-green', key_points: 'p-gray',
};

// 快捷结果选项（negative → 自动勾"待跟进"）
const QUICK_RESULTS: Record<string, { label: string; negative?: boolean }[]> = {
  homework_check: [{ label: '完成' }, { label: '部分完成', negative: true }, { label: '未完成', negative: true }],
  night_study: [{ label: '认真' }, { label: '一般' }, { label: '较差', negative: true }],
  recitation: [{ label: '通过' }, { label: '未通过', negative: true }],
};
const BATCH_CATEGORIES = ['night_study', 'recitation', 'homework_check'];

interface FollowUp {
  id: number;
  student_id: string;
  recorder_id: string | null;
  category: string;
  subject: string | null;
  content: string;
  result: string | null;
  needs_followup: boolean;
  created_at: string;
  student?: { full_name: string } | Array<{ full_name: string }>;
  recorder?: { full_name: string } | Array<{ full_name: string }>;
}

interface BatchRow { result: string; negative: boolean; note: string; needs: boolean }

const one = (p: any) => (Array.isArray(p) ? p[0] : p);
const nameOf = (p: FollowUp['student']) => one(p)?.full_name || '—';
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const blankForm = { student_id: '', category: 'homework_check', subject: '', content: '', result: '', needs_followup: false };

export function StudyFollowUps() {
  const operatorId = useAuthStore(s => s.user?.id ?? null);
  // URL 参数：?student=<id> 预选学生、?tab=pending 直达待跟进、?batch=1 直接进批量模式
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<FollowUp[]>([]);
  const students = useStudentRoster();
  const [loading, setLoading] = useState(true);

  // 列表筛选
  const [tab, setTab] = useState<string>(searchParams.get('tab') || 'all');
  const [fStudent, setFStudent] = useState<string | undefined>(searchParams.get('student') || undefined);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // 单条弹窗
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...blankForm });
  const [saving, setSaving] = useState(false);
  const [subjectOpts, setSubjectOpts] = useState<string[]>([]);

  // 批量模式
  const [batchOpen, setBatchOpen] = useState(searchParams.get('batch') === '1');
  const [batchCat, setBatchCat] = useState('night_study');
  const [batchSubject, setBatchSubject] = useState('');
  const [batchContent, setBatchContent] = useState('');
  const [batchRows, setBatchRows] = useState<Record<string, BatchRow>>({});
  const [onlyMarked, setOnlyMarked] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);

  // 待跟进处理弹窗
  const [resolving, setResolving] = useState<FollowUp | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: fu } = await db.from('study_follow_ups')
      .select('*, student:profiles!study_follow_ups_student_id_fkey(full_name), recorder:profiles!study_follow_ups_recorder_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(500);
    setRows((fu || []) as FollowUp[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // 单条弹窗：选中学生后拉他的课表科目做下拉候选
  useEffect(() => {
    if (!form.student_id) { setSubjectOpts([]); return; }
    (async () => {
      const { data } = await db.from('school_timetable').select('program_subjects(subject_name)').eq('student_id', form.student_id);
      const subs = Array.from(new Set(((data || []) as any[]).map(r => one(r.program_subjects)?.subject_name).filter(Boolean))) as string[];
      setSubjectOpts(subs);
    })();
  }, [form.student_id]);

  // ── 列表数据整形：筛选 + 按日期分组 ──
  const filtered = rows.filter(r =>
    (tab === 'all' ? true : tab === 'pending' ? r.needs_followup : r.category === tab) &&
    (!fStudent || r.student_id === fStudent)
  );
  const pendingCount = rows.filter(r => r.needs_followup).length;
  const byDate: [string, FollowUp[]][] = [];
  for (const r of filtered) {
    const d = r.created_at.slice(0, 10);
    const last = byDate[byDate.length - 1];
    if (last && last[0] === d) last[1].push(r);
    else byDate.push([d, [r]]);
  }
  // 默认展开最近 3 天
  useEffect(() => {
    if (rows.length && expandedDates.size === 0) {
      const dates = Array.from(new Set(rows.map(r => r.created_at.slice(0, 10)))).slice(0, 3);
      setExpandedDates(new Set(dates));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
  const toggleDate = (d: string) => setExpandedDates(prev => {
    const next = new Set(prev);
    if (next.has(d)) next.delete(d); else next.add(d);
    return next;
  });

  // ── 单条保存 ──
  const save = async () => {
    if (!form.student_id) { message.warning('请选择学生'); return; }
    if (!form.content.trim()) { message.warning('请填写跟进内容'); return; }
    setSaving(true);
    try {
      const { error } = await db.from('study_follow_ups').insert({
        student_id: form.student_id, recorder_id: operatorId, category: form.category,
        subject: form.subject.trim() || null, content: form.content.trim(),
        result: form.result.trim() || null, needs_followup: form.needs_followup,
      });
      if (error) throw error;
      message.success('已记录');
      setOpen(false); setForm({ ...blankForm });
      load();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // ── 批量模式 ──
  const openBatch = (cat: string) => {
    setBatchCat(cat); setBatchSubject(''); setBatchContent(''); setBatchRows({}); setOnlyMarked(false);
    setBatchOpen(true);
  };
  const setBatch = (id: string, patch: Partial<BatchRow>) =>
    setBatchRows(p => {
      const base: BatchRow = p[id] || { result: '', negative: false, note: '', needs: false };
      return { ...p, [id]: { ...base, ...patch } };
    });
  const pickResult = (id: string, opt: { label: string; negative?: boolean }) => {
    const cur = batchRows[id];
    if (cur?.result === opt.label) { // 再点一次取消
      setBatch(id, { result: '', negative: false, needs: false });
    } else {
      setBatch(id, { result: opt.label, negative: !!opt.negative, needs: !!opt.negative });
    }
  };
  const markedCount = Object.values(batchRows).filter(r => r.result || r.note.trim()).length;

  const saveBatch = async () => {
    const entries = Object.entries(batchRows).filter(([, r]) => r.result || r.note.trim());
    if (entries.length === 0) { message.warning('还没有标记任何学生'); return; }
    setBatchSaving(true);
    try {
      const content = batchContent.trim() || CAT_LABEL[batchCat];
      const payload = entries.map(([sid, r]) => ({
        student_id: sid, recorder_id: operatorId, category: batchCat,
        subject: batchSubject.trim() || null, content,
        result: [r.result, r.note.trim()].filter(Boolean).join('：') || null,
        needs_followup: r.needs,
      }));
      const { error } = await db.from('study_follow_ups').insert(payload);
      if (error) throw error;
      message.success(`已记录 ${payload.length} 名学生的${CAT_LABEL[batchCat]}`);
      setBatchOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setBatchSaving(false);
    }
  };

  // ── 待跟进处理（留痕）──
  const doResolve = async () => {
    if (!resolving) return;
    if (!resolveNote.trim()) { message.warning('请填写处理结果'); return; }
    const newResult = `${resolving.result ? resolving.result + '；' : ''}跟进处理：${resolveNote.trim()}`;
    const { error } = await db.from('study_follow_ups').update({ needs_followup: false, result: newResult }).eq('id', resolving.id);
    if (error) { message.error('操作失败'); return; }
    message.success('已跟进，处理结果已留痕');
    setRows(rs => rs.map(x => x.id === resolving.id ? { ...x, needs_followup: false, result: newResult } : x));
    setResolving(null); setResolveNote('');
  };

  const remove = (r: FollowUp) => {
    Modal.confirm({
      title: '删除跟进记录',
      content: `确定删除「${nameOf(r.student)} · ${CAT_LABEL[r.category] || r.category}」这条记录吗？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        const { error } = await db.from('study_follow_ups').delete().eq('id', r.id);
        if (error) { message.error('删除失败'); return; }
        message.success('已删除');
        setRows(rs => rs.filter(x => x.id !== r.id));
      },
    });
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;

  const curCat = FOLLOW_UP_CATEGORIES.find(c => c.value === tab);
  const batchStudents = onlyMarked ? students.filter(s => batchRows[s.id]?.result || batchRows[s.id]?.note.trim()) : students;

  // ══ 批量录入模式 ══
  if (batchOpen) {
    return (
      <Section
        title={`批量录入 · ${CAT_LABEL[batchCat]}`}
        hint="像点名一样过一遍：点快捷结果或填备注即算标记，没动过的学生不会提交。负面结果自动标「待跟进」，可再点取消。"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setBatchOpen(false)} disabled={batchSaving}>取消</button>
            <button className="btn btn-primary" onClick={saveBatch} disabled={batchSaving}>
              {batchSaving ? <IconLoader2 size={16} className="spinner" /> : `保存（已标记 ${markedCount} 人）`}
            </button>
          </div>
        }
      >
        {/* 公共字段 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {BATCH_CATEGORIES.map(c => (
            <button key={c} className={`btn ${batchCat === c ? 'btn-primary' : ''}`} style={{ padding: '3px 12px', minHeight: 0, fontSize: 12 }}
              onClick={() => { setBatchCat(c); setBatchRows({}); }}>
              {CAT_LABEL[c]}
            </button>
          ))}
          <input className="input" style={{ width: 140, minHeight: 0, padding: '4px 8px' }} placeholder="科目（可空）"
            value={batchSubject} onChange={e => setBatchSubject(e.target.value)} />
          <input className="input" style={{ flex: 1, minWidth: 200, minHeight: 0, padding: '4px 8px' }}
            placeholder={batchCat === 'recitation' ? '本次范围，如：Unit 3 单词带背（应用到所有标记行）' : '本次内容说明（可空，应用到所有标记行）'}
            value={batchContent} onChange={e => setBatchContent(e.target.value)} />
          <button className={`btn ${onlyMarked ? 'btn-primary' : ''}`} style={{ padding: '3px 12px', minHeight: 0, fontSize: 12 }}
            onClick={() => setOnlyMarked(v => !v)}>
            <IconUsers size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />只看已标记
          </button>
        </div>

        <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
          <thead><tr>
            <th style={{ padding: '10px 12px' }}>姓名</th>
            <th style={{ padding: '10px 12px' }}>快捷结果（再点取消）</th>
            <th style={{ padding: '10px 12px' }}>待跟进</th>
            <th style={{ padding: '10px 12px' }}>备注 / 问题</th>
          </tr></thead>
          <tbody>
            {batchStudents.map(s => {
              const r = batchRows[s.id];
              const marked = !!(r?.result || r?.note.trim());
              return (
                <tr key={s.id} style={{ borderTop: '1px solid var(--color-border-tertiary)', background: r?.needs ? 'rgba(239,159,39,0.06)' : marked ? 'rgba(63,164,86,0.05)' : undefined }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                    {s.full_name}
                    {marked && <IconCheck size={13} style={{ marginLeft: 6, verticalAlign: 'middle', color: 'var(--color-success, #3fa456)' }} />}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(QUICK_RESULTS[batchCat] || []).map(opt => (
                        <button key={opt.label} className={`btn ${r?.result === opt.label ? 'btn-primary' : ''}`}
                          style={{
                            padding: '3px 12px', fontSize: 12, minHeight: 0,
                            backgroundColor: r?.result === opt.label && opt.negative ? 'var(--color-danger)' : undefined,
                            borderColor: r?.result === opt.label && opt.negative ? 'var(--color-danger)' : undefined,
                          }}
                          onClick={() => pickResult(s.id, opt)}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <button className={`btn ${r?.needs ? 'btn-primary' : ''}`}
                      style={{ padding: '3px 10px', fontSize: 12, minHeight: 0, backgroundColor: r?.needs ? '#EF9F27' : undefined, borderColor: r?.needs ? '#EF9F27' : undefined }}
                      onClick={() => setBatch(s.id, { needs: !r?.needs })}>
                      待跟进
                    </button>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <input className="input" style={{ width: '100%', minHeight: 0, padding: '4px 8px', fontSize: 12 }}
                      placeholder="问题 / 备注（填了也算标记）"
                      value={r?.note || ''} onChange={e => setBatch(s.id, { note: e.target.value })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
    );
  }

  // ══ 列表模式 ══
  return (
    <>
      <Section
        title="学习跟进"
        hint={curCat?.hint || '作业核查 / 晚自习跟进 / 带背考察 / 个辅记录 / 重难点梳理 · 全员可见'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => openBatch(tab !== 'all' && BATCH_CATEGORIES.includes(tab) ? tab : 'night_study')}>
              <IconUsers size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />批量录入
            </button>
            <button className="btn btn-primary" onClick={() => { setForm({ ...blankForm, category: tab !== 'all' && tab !== 'pending' ? tab : 'homework_check', student_id: fStudent || '' }); setOpen(true); }}>
              <IconPlus size={16} style={{ marginRight: 4 }} />单条录入
            </button>
          </div>
        }
      >
        {/* 筛选行：类别 Tab + 学生 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[{ value: 'all', label: '全部' }, { value: 'pending', label: `待跟进 ${pendingCount}` }, ...FOLLOW_UP_CATEGORIES].map(c => (
            <button key={c.value} className={`btn ${tab === c.value ? 'btn-primary' : ''}`}
              style={{ padding: '3px 12px', minHeight: 0, fontSize: 12 }}
              onClick={() => setTab(c.value)}>
              {c.label}
            </button>
          ))}
          <StudentSelect allowClear placeholder="按学生筛选" style={{ width: 160, marginLeft: 'auto' }}
            value={fStudent} onChange={setFStudent} />
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无记录</div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead><tr>
              <th style={{ padding: '10px 12px' }}>时间</th>
              <th style={{ padding: '10px 12px' }}>学生</th>
              <th style={{ padding: '10px 12px' }}>类别</th>
              <th style={{ padding: '10px 12px' }}>科目</th>
              <th style={{ padding: '10px 12px' }}>内容</th>
              <th style={{ padding: '10px 12px' }}>结果 / 问题</th>
              <th style={{ padding: '10px 12px' }}>记录人</th>
              <th style={{ padding: '10px 12px' }}>操作</th>
            </tr></thead>
            <tbody>
              {byDate.map(([date, list]) => (
                <Fragment key={date}>
                  <tr style={{ borderTop: '1px solid var(--color-border-tertiary)', background: 'var(--color-bg-secondary)', cursor: 'pointer' }} onClick={() => toggleDate(date)}>
                    <td colSpan={8} style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>
                      {expandedDates.has(date) ? <IconChevronDown size={14} style={{ verticalAlign: 'middle' }} /> : <IconChevronRight size={14} style={{ verticalAlign: 'middle' }} />} {date}
                      <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)', marginLeft: 8 }}>{list.length} 条{list.some(x => x.needs_followup) ? ` · 待跟进 ${list.filter(x => x.needs_followup).length}` : ''}</span>
                    </td>
                  </tr>
                  {expandedDates.has(date) && list.map(r => (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--color-border-tertiary)', background: r.needs_followup ? 'rgba(239,159,39,0.06)' : undefined }}>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: 13 }}>{fmtTime(r.created_at)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{nameOf(r.student)}</td>
                      <td style={{ padding: '10px 12px' }}>{pill(CAT_PILL[r.category] || 'p-gray', CAT_LABEL[r.category] || r.category)}</td>
                      <td style={{ padding: '10px 12px' }}>{r.subject || '—'}</td>
                      <td style={{ padding: '10px 12px', maxWidth: 240, color: 'var(--color-text-secondary)' }}>{r.content}</td>
                      <td style={{ padding: '10px 12px', maxWidth: 220 }}>
                        {r.result || '—'}
                        {r.needs_followup && <span className="pill p-amber" style={{ marginLeft: 6 }}>待跟进</span>}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13 }}>{nameOf(r.recorder)}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {r.needs_followup && (
                          <>
                            <span className="link" onClick={() => { setResolving(r); setResolveNote(''); }}>
                              <IconCheck size={13} style={{ verticalAlign: 'middle' }} /> 已跟进
                            </span>
                            {' · '}
                          </>
                        )}
                        <span className="link" style={{ color: 'var(--color-danger)' }} onClick={() => remove(r)}>
                          <IconTrash size={13} style={{ verticalAlign: 'middle' }} /> 删除
                        </span>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* 单条录入弹窗 */}
      <Modal title="单条学习跟进" open={open} onCancel={() => setOpen(false)} onOk={save}
        okText={saving ? '保存中…' : '保存'} confirmLoading={saving} width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          <div>
            <label className="form-label">学生 *</label>
            <StudentSelect style={{ width: '100%' }} placeholder="选择学生"
              value={form.student_id || undefined} onChange={v => setForm(f => ({ ...f, student_id: v, subject: '' }))} />
          </div>
          <div>
            <label className="form-label">类别 *</label>
            <Select style={{ width: '100%' }} value={form.category} onChange={v => setForm(f => ({ ...f, category: v, result: '' }))}
              options={FOLLOW_UP_CATEGORIES.map(c => ({ value: c.value, label: c.label }))} />
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              {FOLLOW_UP_CATEGORIES.find(c => c.value === form.category)?.hint}
            </div>
          </div>
          <div>
            <label className="form-label">科目（可空）</label>
            <AutoComplete style={{ width: '100%' }} placeholder={subjectOpts.length ? '从课表选择或手输' : '如：数学 / 英语 / EAP'}
              value={form.subject} onChange={v => setForm(f => ({ ...f, subject: v }))}
              options={subjectOpts.map(s => ({ value: s }))} allowClear />
          </div>
          <div>
            <label className="form-label">内容 *</label>
            <Input.TextArea rows={3} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder={form.category === 'mini_tutoring' ? '备课与讲授内容、针对的薄弱环节' : form.category === 'recitation' ? '带背范围、考察方式' : '作业情况 / 学习表现 / 跟进内容'} />
          </div>
          <div>
            <label className="form-label">结果 / 存在问题（可空）</label>
            {(QUICK_RESULTS[form.category] || []).length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                {QUICK_RESULTS[form.category].map(opt => (
                  <button key={opt.label} type="button"
                    className={`btn ${form.result.startsWith(opt.label) ? 'btn-primary' : ''}`}
                    style={{ padding: '3px 12px', fontSize: 12, minHeight: 0 }}
                    onClick={() => setForm(f => ({ ...f, result: opt.label, needs_followup: !!opt.negative }))}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <Input.TextArea rows={2} value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
              placeholder="完成度、考察是否通过、发现的问题" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.needs_followup} onChange={e => setForm(f => ({ ...f, needs_followup: e.target.checked }))} />
            标记为待跟进（差生记录 / 未通过考察等需要回头盯的）
          </label>
        </div>
      </Modal>

      {/* 待跟进处理弹窗（留痕） */}
      <Modal title="标记已跟进" open={!!resolving} onCancel={() => setResolving(null)} onOk={doResolve} okText="确认" width={420}>
        {resolving && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {nameOf(resolving.student)} · {CAT_LABEL[resolving.category]} · {resolving.content}
              {resolving.result && <div style={{ marginTop: 4 }}>原结果：{resolving.result}</div>}
            </div>
            <div>
              <label className="form-label">处理结果 *（追加留痕，方便回看后续）</label>
              <Input.TextArea rows={2} value={resolveNote} onChange={e => setResolveNote(e.target.value)}
                placeholder="如：已重新考察通过 / 作业已补交 / 已与家长沟通" autoFocus />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
