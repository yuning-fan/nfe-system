// 晚自习排课（学业管理 → 晚自习排课）：Gris / 学管按周排课，导出《晚自习各老师工作安排》Word。
// 排进来的课会出现在：学生学术报告「晚自习课程」、巡查点名页「今晚课程」。
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Select, AutoComplete, message } from 'antd';
import {
  IconMoonStars, IconChevronLeft, IconChevronRight, IconPlus, IconCopy, IconFileDownload,
  IconTrash, IconLoader2, IconPencil,
} from '@tabler/icons-react';
import { supabase } from '../../lib/supabase';
import { nzToday } from '../../lib/nzDate';
import {
  ROOMS, KIND_LABEL, KIND_PILL, addDays, mondayOf, weekdayOf, md, hm, defaultWeekTitle,
  loadWeek, saveWeek, saveSession, deleteSession, copyFromPrevWeek, loadTeacherOptions, exportWeekDocx,
  type NightWeek, type NightSession, type NightSessionInput, type TeacherTask, type RoomNote,
} from '../../lib/nightStudy';

interface SubjectOpt { id: number; name: string; program: string; }
interface NodeOpt { id: number; title: string; parent_id: number | null; program_subject_id: number | null; due_date: string | null; weight_percent: number | null; }

const emptySession = (date: string, room: string | null): NightSessionInput => ({
  session_date: date, start_time: '18:00', end_time: '19:00', room, kind: 'exam_prep',
  subject: null, program_subject_id: null, milestone_id: null,
  teacher_name: null, teacher_id: null, assistants: null, topic: '', notes: null,
});

export default function NightStudyPlanner() {
  const [monday, setMonday] = useState(() => mondayOf(nzToday()));
  const [week, setWeek] = useState<NightWeek | null>(null);
  const [sessions, setSessions] = useState<NightSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<SubjectOpt[]>([]);
  const [nodes, setNodes] = useState<NodeOpt[]>([]);
  const [teachers, setTeachers] = useState<{ name: string; id: string | null }[]>([]);
  const [editing, setEditing] = useState<{ id?: number; v: NightSessionInput } | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await loadWeek(monday);
      setWeek(r.week); setSessions(r.sessions);
    } catch (e: any) { message.error(e.message || '加载失败'); }
    finally { setLoading(false); }
  }, [monday]);
  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    (async () => {
      const [{ data: subs }, { data: ns }, t] = await Promise.all([
        supabase.from('program_subjects').select('id, subject_name, programs(name)').order('subject_name'),
        supabase.from('academic_milestones').select('id, title, parent_id, program_subject_id, due_date, weight_percent').order('due_date'),
        loadTeacherOptions(),
      ]);
      setSubjects((subs || []).map((s: any) => ({ id: s.id, name: s.subject_name, program: (Array.isArray(s.programs) ? s.programs[0] : s.programs)?.name || '' })));
      setNodes((ns || []) as NodeOpt[]);
      setTeachers(t);
    })();
  }, []);

  const roomNotes = (week?.room_plan as unknown as RoomNote[]) || [];
  // 显示周一到周四；周五及以后有课/有备注才显示
  const days = useMemo(() => {
    const base = [0, 1, 2, 3].map(i => addDays(monday, i));
    const extra = [4, 5, 6].map(i => addDays(monday, i))
      .filter(d => sessions.some(s => s.session_date === d) || roomNotes.some(n => n.date === d));
    return [...base, ...extra];
  }, [monday, sessions, roomNotes]);

  const onCopy = () => {
    Modal.confirm({
      title: '复制上周安排',
      content: sessions.length
        ? `本周已有 ${sessions.length} 节课，复制会在此基础上追加上周的全部课程（日期 +7 天）。确定吗？`
        : '把上周的全部课程和教室安排复制到本周（日期 +7 天），之后再逐节修改。考试清单和老师任务不复制。',
      onOk: async () => {
        try { const n = await copyFromPrevWeek(monday); message.success(n ? `已复制 ${n} 节课` : '上周没有可复制的课程'); reload(); }
        catch (e: any) { message.error(e.message || '复制失败'); }
      },
    });
  };

  const setRoomNote = async (date: string, room: string, text: string) => {
    const list = [...roomNotes];
    const i = list.findIndex(n => n.date === date);
    const cur: any = i >= 0 ? { ...list[i] } : { date };
    cur[`r${room}`] = text || null;
    if (i >= 0) list[i] = cur; else list.push(cur);
    list.sort((a, b) => a.date.localeCompare(b.date));
    try { await saveWeek(monday, { room_plan: list as any }); reload(); }
    catch (e: any) { message.error(e.message || '保存失败'); }
  };

  const today = nzToday();
  const hint = (t: string) => <span style={{ color: 'var(--color-text-tertiary)' }}>{t}</span>;

  return (
    <div className="tabpage active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>
            <IconMoonStars size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />晚自习排课
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
            按周排晚自习课程与答疑。排进来的课会出现在学生学术报告的「晚自习课程」，以及巡查点名页的「今晚课程」。
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={onCopy}><IconCopy size={15} style={{ marginRight: 4 }} />复制上周</button>
          <button className="btn" onClick={() => exportWeekDocx(monday, week, sessions).catch(e => message.error(e.message || '导出失败'))}>
            <IconFileDownload size={15} style={{ marginRight: 4 }} />导出 Word</button>
          <button className="btn btn-primary" onClick={() => setEditing({ v: emptySession(today >= monday && today <= addDays(monday, 6) ? today : monday, '106') })}>
            <IconPlus size={15} style={{ marginRight: 4 }} />新增一节</button>
        </div>
      </div>

      {/* 周切换 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <button className="btn" onClick={() => setMonday(addDays(monday, -7))}><IconChevronLeft size={16} /></button>
        <div style={{ fontWeight: 600, fontSize: 15, minWidth: 220, textAlign: 'center' }}>
          {week?.title || defaultWeekTitle(monday)}
        </div>
        <button className="btn" onClick={() => setMonday(addDays(monday, 7))}><IconChevronRight size={16} /></button>
        {monday !== mondayOf(today) && <button className="btn" onClick={() => setMonday(mondayOf(today))}>回到本周</button>}
        {loading && <IconLoader2 className="spinner" size={18} />}
      </div>

      {/* 周计划 */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>本周计划</div>
          <button className="btn" style={{ padding: '2px 10px', minHeight: 26, fontSize: 12 }} onClick={() => setPlanOpen(true)}>
            <IconPencil size={13} style={{ marginRight: 4 }} />编辑</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, fontSize: 13 }}>
          <div><div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>考试清单</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{week?.exam_notes || hint('未填写')}</div></div>
          <div><div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>老师任务（不落到具体晚上的，如群内答疑）</div>
            {((week?.teacher_tasks as unknown as TeacherTask[]) || []).length
              ? ((week?.teacher_tasks as unknown as TeacherTask[]) || []).map((t, i) => <div key={i}><b>{t.teacher}</b>　{t.time}：{t.task}</div>)
              : hint('未填写')}</div>
          <div><div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>通用任务 / 学管任务</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{week?.general_tasks || hint('未填写')}</div></div>
        </div>
      </div>

      {/* 课表：日期 × 教室 */}
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl" style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead><tr>
            <th style={{ width: 110, padding: '10px 12px', textAlign: 'left' }}>日期</th>
            {ROOMS.map(r => <th key={r} style={{ padding: '10px 12px', textAlign: 'left' }}>{r}{r === '106' ? '（上课 / 讨论）' : r === '110' ? '（静音自习）' : ''}</th>)}
            <th style={{ padding: '10px 12px', textAlign: 'left' }}>未定教室 / 线上</th>
          </tr></thead>
          <tbody>
            {days.map(d => {
              const note: any = roomNotes.find(n => n.date === d) || {};
              const isToday = d === today;
              return (
                <tr key={d} style={{ borderTop: '1px solid var(--color-border-tertiary)', background: isToday ? 'var(--color-bg-secondary)' : undefined }}>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600 }}>{md(d)} {weekdayOf(d)}</div>
                    {isToday && <span className="pill p-blue" style={{ fontSize: 11 }}>今天</span>}
                    {note.note && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{note.note}</div>}
                  </td>
                  {[...ROOMS, null].map(r => (
                    <td key={r ?? 'none'} style={{ padding: 8, verticalAlign: 'top' }}>
                      {sessions.filter(s => s.session_date === d && (r ? s.room === r : !s.room || !ROOMS.includes(s.room as any))).map(s => (
                        <SessionCard key={s.id} s={s} nodes={nodes}
                          onClick={() => { const { id, created_at: _c, week_id: _w, ...v } = s; setEditing({ id, v }); }} />
                      ))}
                      {r && <RoomNoteInput value={note[`r${r}`] || ''} onSave={t => setRoomNote(d, r, t)} />}
                      <button className="btn" style={{ padding: '0 8px', minHeight: 22, fontSize: 11, marginTop: 4, opacity: 0.7 }}
                        onClick={() => setEditing({ v: emptySession(d, r) })}><IconPlus size={11} /> 排课</button>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <SessionModal init={editing} subjects={subjects} nodes={nodes} teachers={teachers}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
      {planOpen && (
        <WeekPlanModal monday={monday} week={week} teachers={teachers.map(t => t.name)}
          onClose={() => setPlanOpen(false)} onSaved={() => { setPlanOpen(false); reload(); }} />
      )}
    </div>
  );
}

function SessionCard({ s, nodes, onClick }: { s: NightSession; nodes: NodeOpt[]; onClick: () => void }) {
  const node = nodes.find(n => n.id === s.milestone_id);
  return (
    <div onClick={onClick} style={{
      border: '1px solid var(--color-border-secondary)', borderRadius: 6, padding: '6px 8px', marginBottom: 6,
      cursor: 'pointer', background: 'var(--color-bg-primary)', fontSize: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
        <b>{hm(s.start_time) || '时间未定'}{s.end_time ? `–${hm(s.end_time)}` : ''}</b>
        <span className={`pill ${KIND_PILL[s.kind] || 'p-gray'}`} style={{ fontSize: 10 }}>{KIND_LABEL[s.kind] || s.kind}</span>
      </div>
      <div style={{ fontWeight: 600, marginTop: 2 }}>{s.subject?.replace(/ \(English for Academic Purposes\)/, '') || '（不限科目）'}{s.teacher_name && <span style={{ fontWeight: 400 }}> · {s.teacher_name}</span>}</div>
      <div style={{ color: 'var(--color-text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{s.topic}</div>
      {node && <div style={{ color: 'var(--color-primary)', marginTop: 2 }}>→ {node.title}</div>}
    </div>
  );
}

// 教室用途备注（如「19:00 起转静音」），失焦保存
function RoomNoteInput({ value, onSave }: { value: string; onSave: (t: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input className="input" value={v} placeholder="教室用途备注" onChange={e => setV(e.target.value)}
      onBlur={() => { if (v !== value) onSave(v.trim()); }}
      style={{ width: '100%', fontSize: 11, padding: '2px 6px', minHeight: 24, color: 'var(--color-text-secondary)' }} />
  );
}

// 表单项：必须定义在组件外，否则每次渲染都是新组件类型，输入框会掉焦点
function L({ t, children, span }: { t: string; children: React.ReactNode; span?: boolean }) {
  return <div style={{ gridColumn: span ? '1 / -1' : undefined }}><label className="form-label">{t}</label>{children}</div>;
}

function SessionModal({ init, subjects, nodes, teachers, onClose, onSaved }: {
  init: { id?: number; v: NightSessionInput }; subjects: SubjectOpt[]; nodes: NodeOpt[];
  teachers: { name: string; id: string | null }[]; onClose: () => void; onSaved: () => void;
}) {
  const [v, setV] = useState<NightSessionInput>({ ...init.v, start_time: hm(init.v.start_time) || null, end_time: hm(init.v.end_time) || null });
  const [saving, setSaving] = useState(false);
  const set = (p: Partial<NightSessionInput>) => setV(x => ({ ...x, ...p }));

  // 科目按项目分组；考核节点只列该科的，子项带父节点名
  const subjOptions = useMemo(() => {
    const groups = new Map<string, SubjectOpt[]>();
    subjects.forEach(s => groups.set(s.program, [...(groups.get(s.program) || []), s]));
    return [...groups].map(([program, list]) => ({ label: program || '未归属项目', options: list.map(s => ({ value: s.id, label: s.name })) }));
  }, [subjects]);
  const nodeOptions = useMemo(() => nodes.filter(n => n.program_subject_id === v.program_subject_id).map(n => {
    const parent = n.parent_id ? nodes.find(p => p.id === n.parent_id) : null;
    return { value: n.id, label: `${parent ? `${parent.title} › ` : ''}${n.title}${n.weight_percent ? `（${n.weight_percent}%）` : ''}${n.due_date ? ` · ${md(n.due_date)}` : ''}` };
  }), [nodes, v.program_subject_id]);

  const save = async () => {
    if (!v.session_date) { message.warning('请选择日期'); return; }
    if (!v.topic?.trim()) { message.warning('请填写内容'); return; }
    const t = teachers.find(x => x.name.toLowerCase() === (v.teacher_name || '').trim().toLowerCase());
    setSaving(true);
    try {
      await saveSession({
        ...v, topic: v.topic.trim(), teacher_name: v.teacher_name?.trim() || null, teacher_id: t?.id ?? null,
        start_time: v.start_time || null, end_time: v.end_time || null,
      }, init.id);
      message.success('已保存'); onSaved();
    } catch (e: any) { message.error(e.message || '保存失败'); }
    finally { setSaving(false); }
  };
  const del = () => Modal.confirm({
    title: '删除这节课？', okButtonProps: { danger: true },
    onOk: async () => { try { await deleteSession(init.id!); message.success('已删除'); onSaved(); } catch (e: any) { message.error(e.message || '删除失败'); } },
  });

  return (
    <Modal open title={init.id ? '编辑晚自习课程' : '新增晚自习课程'} onCancel={onClose} width={620}
      footer={[
        init.id ? <button key="d" className="btn" style={{ color: 'var(--color-danger)', float: 'left' }} onClick={del}><IconTrash size={14} /> 删除</button> : null,
        <button key="c" className="btn" onClick={onClose}>取消</button>,
        <button key="s" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</button>,
      ]}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
        <L t="日期"><input type="date" className="input" style={{ width: '100%' }} value={v.session_date} onChange={e => set({ session_date: e.target.value })} /></L>
        <L t="教室">
          <Select style={{ width: '100%' }} value={v.room ?? ''} onChange={x => set({ room: x || null })}
            options={[...ROOMS.map(r => ({ value: r, label: r })), { value: '', label: '未定 / 线上' }]} />
        </L>
        <L t="开始"><input type="time" className="input" style={{ width: '100%' }} value={v.start_time || ''} onChange={e => set({ start_time: e.target.value || null })} /></L>
        <L t="结束"><input type="time" className="input" style={{ width: '100%' }} value={v.end_time || ''} onChange={e => set({ end_time: e.target.value || null })} /></L>
        <L t="类型">
          <Select style={{ width: '100%' }} value={v.kind} onChange={x => set({ kind: x })}
            options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))} />
        </L>
        <L t="科目（可空：跨科答疑 / 事务）">
          <Select style={{ width: '100%' }} allowClear showSearch optionFilterProp="label" value={v.program_subject_id ?? undefined}
            options={subjOptions} placeholder="选择科目"
            onChange={(id?: number) => set({ program_subject_id: id ?? null, subject: subjects.find(s => s.id === id)?.name ?? null, milestone_id: null })} />
        </L>
        <L t="针对的考核（选了会出现在学生报告的考核日历上）" span>
          <Select style={{ width: '100%' }} allowClear showSearch optionFilterProp="label" value={v.milestone_id ?? undefined}
            disabled={!v.program_subject_id} placeholder={v.program_subject_id ? '选择考核项目' : '先选科目'}
            options={nodeOptions} onChange={(id?: number) => set({ milestone_id: id ?? null })} />
        </L>
        <L t="授课老师">
          <AutoComplete style={{ width: '100%' }} value={v.teacher_name || ''} placeholder="选择或直接输入名字"
            options={teachers.map(t => ({ value: t.name, label: t.id ? t.name : `${t.name}（无账号）` }))}
            filterOption={(input, o) => String(o?.value || '').toLowerCase().includes(input.toLowerCase())}
            onChange={x => set({ teacher_name: x || null })} />
        </L>
        <L t="助教 / 值班"><input className="input" style={{ width: '100%' }} value={v.assistants || ''} onChange={e => set({ assistants: e.target.value || null })} /></L>
        <L t="内容（讲什么）" span>
          <textarea className="input" rows={3} style={{ width: '100%' }} value={v.topic} placeholder="如：统计 CT2（7.5%）考前大课：讲重难点，强调考什么"
            onChange={e => set({ topic: e.target.value })} />
        </L>
        <L t="备注" span><input className="input" style={{ width: '100%' }} value={v.notes || ''} placeholder="如：其余时间值班答疑；28 人" onChange={e => set({ notes: e.target.value || null })} /></L>
      </div>
    </Modal>
  );
}

function WeekPlanModal({ monday, week, teachers, onClose, onSaved }: {
  monday: string; week: NightWeek | null; teachers: string[]; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState(week?.title || defaultWeekTitle(monday));
  const [exam, setExam] = useState(week?.exam_notes || '');
  const [general, setGeneral] = useState(week?.general_tasks || '');
  const [tasks, setTasks] = useState<TeacherTask[]>(((week?.teacher_tasks as unknown as TeacherTask[]) || []).map(t => ({ ...t })));
  const [saving, setSaving] = useState(false);
  const setTask = (i: number, p: Partial<TeacherTask>) => setTasks(ts => ts.map((t, j) => (j === i ? { ...t, ...p } : t)));

  const save = async () => {
    setSaving(true);
    try {
      await saveWeek(monday, {
        title: title.trim() || defaultWeekTitle(monday), exam_notes: exam.trim() || null, general_tasks: general.trim() || null,
        teacher_tasks: tasks.filter(t => t.teacher.trim() && t.task.trim()) as any,
      });
      message.success('周计划已保存'); onSaved();
    } catch (e: any) { message.error(e.message || '保存失败'); }
    finally { setSaving(false); }
  };
  return (
    <Modal open title={`编辑周计划 · ${md(monday)}–${md(addDays(monday, 4))}`} onCancel={onClose} onOk={save} okText="保存" confirmLoading={saving} width={720}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8, maxHeight: '65vh', overflowY: 'auto' }}>
        <div><label className="form-label">标题</label><input className="input" style={{ width: '100%' }} value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div><label className="form-label">考试清单（本周 / 下周）</label>
          <textarea className="input" rows={4} style={{ width: '100%' }} value={exam} onChange={e => setExam(e.target.value)}
            placeholder={'本周考试：统计 Common Test 2（7.5%）……\n下周考试：……'} /></div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label">老师任务（不落到具体晚上的，如群内答疑、整理资料）</label>
            <button className="btn" style={{ padding: '0 10px', minHeight: 24, fontSize: 12 }} onClick={() => setTasks(ts => [...ts, { teacher: '', time: '本周', task: '' }])}>
              <IconPlus size={12} /> 添加</button>
          </div>
          {tasks.map((t, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '130px 110px 1fr auto', gap: 8, marginBottom: 6 }}>
              <AutoComplete value={t.teacher} options={teachers.map(n => ({ value: n }))} placeholder="老师" onChange={x => setTask(i, { teacher: x })} />
              <input className="input" value={t.time} placeholder="时间" onChange={e => setTask(i, { time: e.target.value })} />
              <input className="input" value={t.task} placeholder="任务" onChange={e => setTask(i, { task: e.target.value })} />
              <button className="btn" style={{ padding: '4px 8px', minHeight: 0, color: 'var(--color-danger)' }} onClick={() => setTasks(ts => ts.filter((_, j) => j !== i))}><IconTrash size={14} /></button>
            </div>
          ))}
        </div>
        <div><label className="form-label">通用任务 / 学管任务</label>
          <textarea className="input" rows={5} style={{ width: '100%' }} value={general} onChange={e => setGeneral(e.target.value)}
            placeholder="周一至周四同步下下周空闲时间给 Gris；资料整理上传 NFE 内部资料库……" /></div>
      </div>
    </Modal>
  );
}
