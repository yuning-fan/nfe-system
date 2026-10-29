// 晚自习排课：周计划（night_study_weeks）+ 每节课（night_study_sessions）的读写与 Word 导出
// 一周以周一为键；节次按日期落周，week_id 只做归属，不参与查询（按日期区间取，跨周改日期也不会丢）。
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, ShadingType, BorderStyle,
} from 'docx';
import { supabase } from './supabase';
import type { Database } from '../types/database.types';
import { cnOf } from './subjectNames';

export type NightWeek = Database['public']['Tables']['night_study_weeks']['Row'];
export type NightSession = Database['public']['Tables']['night_study_sessions']['Row'];
export type NightSessionInput = Omit<NightSession, 'id' | 'created_at' | 'week_id'>;
export interface TeacherTask { teacher: string; time: string; task: string; }
export interface RoomNote { date: string; r106?: string | null; r109?: string | null; r110?: string | null; note?: string | null; }

export const ROOMS = ['106', '109', '110'] as const;
export const KIND_LABEL: Record<string, string> = {
  exam_prep: '考前课', review: '复习', qa: '答疑', workshop: '写作/批改', intro: '课程导论', admin: '事务',
};
export const KIND_PILL: Record<string, string> = {
  exam_prep: 'p-red', review: 'p-amber', qa: 'p-blue', workshop: 'p-green', intro: 'p-gray', admin: 'p-gray',
};
const WEEKDAY = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// —— 日期工具（按本地日期字符串运算，不经 UTC，避免跨日偏移）——
const pad = (n: number) => String(n).padStart(2, '0');
const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (s: string, n: number) => { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + n); return toStr(d); };
export const mondayOf = (s: string) => { const d = new Date(`${s}T00:00:00`); const w = d.getDay(); return addDays(s, w === 0 ? -6 : 1 - w); };
export const weekdayOf = (s: string) => WEEKDAY[new Date(`${s}T00:00:00`).getDay()];
export const md = (s: string) => `${Number(s.slice(5, 7))}.${Number(s.slice(8, 10))}`;
export const hm = (t?: string | null) => (t ? t.slice(0, 5) : '');
export const defaultWeekTitle = (monday: string) => `${md(monday)} – ${md(addDays(monday, 4))} 晚自习各老师工作安排`;

export async function loadWeek(monday: string) {
  const sunday = addDays(monday, 6);
  const [{ data: week, error: wErr }, { data: sessions, error: sErr }] = await Promise.all([
    supabase.from('night_study_weeks').select('*').eq('week_start', monday).maybeSingle(),
    supabase.from('night_study_sessions').select('*')
      .gte('session_date', monday).lte('session_date', sunday)
      .order('session_date').order('start_time', { nullsFirst: true }),
  ]);
  if (wErr) throw wErr;
  if (sErr) throw sErr;
  return { week: week as NightWeek | null, sessions: (sessions || []) as NightSession[] };
}

// 周计划不存在则建（排第一节课时自动建，标题用默认）
export async function ensureWeek(monday: string): Promise<NightWeek> {
  const { data: hit } = await supabase.from('night_study_weeks').select('*').eq('week_start', monday).maybeSingle();
  if (hit) return hit as NightWeek;
  const { data, error } = await supabase.from('night_study_weeks')
    .insert({ week_start: monday, week_end: addDays(monday, 6), title: defaultWeekTitle(monday) })
    .select('*').single();
  if (error) throw error;
  return data as NightWeek;
}

export async function saveWeek(monday: string, patch: Partial<Pick<NightWeek, 'title' | 'exam_notes' | 'general_tasks' | 'teacher_tasks' | 'room_plan'>>) {
  const w = await ensureWeek(monday);
  const { error } = await supabase.from('night_study_weeks').update(patch).eq('id', w.id);
  if (error) throw error;
}

export async function saveSession(input: NightSessionInput, id?: number) {
  const w = await ensureWeek(mondayOf(input.session_date));
  const row = { ...input, week_id: w.id };
  const { error } = id
    ? await supabase.from('night_study_sessions').update(row).eq('id', id)
    : await supabase.from('night_study_sessions').insert(row);
  if (error) throw error;
}

export async function deleteSession(id: number) {
  const { error } = await supabase.from('night_study_sessions').delete().eq('id', id);
  if (error) throw error;
}

// 复制上周：节次整体 +7 天，教室安排同步平移；考试清单与老师任务每周不同，不复制
export async function copyFromPrevWeek(monday: string): Promise<number> {
  const prev = addDays(monday, -7);
  const { week, sessions } = await loadWeek(prev);
  const w = await ensureWeek(monday);
  if (sessions.length) {
    const rows = sessions.map(({ id: _i, created_at: _c, week_id: _w, ...s }) => ({
      ...s, session_date: addDays(s.session_date, 7), week_id: w.id,
    }));
    const { error } = await supabase.from('night_study_sessions').insert(rows);
    if (error) throw error;
  }
  const rp = ((week?.room_plan as unknown as RoomNote[]) || []).map(r => ({ ...r, date: addDays(r.date, 7) }));
  if (rp.length) await saveWeek(monday, { room_plan: rp as any });
  return sessions.length;
}

// 老师下拉：有账号的员工 + 历史上出现过的无账号老师名
export async function loadTeacherOptions(): Promise<{ name: string; id: string | null }[]> {
  const [{ data: staff }, { data: used }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').neq('role', 'student').order('full_name'),
    supabase.from('night_study_sessions').select('teacher_name').is('teacher_id', null).not('teacher_name', 'is', null),
  ]);
  const out = new Map<string, string | null>();
  for (const s of staff || []) if (s.full_name && s.full_name !== 'admin') out.set(s.full_name, s.id);
  for (const u of used || []) if (u.teacher_name && ![...out.keys()].some(k => k.toLowerCase() === u.teacher_name!.toLowerCase())) out.set(u.teacher_name, null);
  return [...out].map(([name, id]) => ({ name, id }));
}

// 小课选学生：选了该科（未退课）的学生。分两步查，避免 enrollments→profiles 嵌套的外键歧义
export async function loadSubjectStudents(subjectId: number): Promise<{ id: string; name: string }[]> {
  const { data: sels, error } = await supabase.from('student_subject_selections')
    .select('status, student_enrollments!student_subject_selections_enrollment_id_fkey!inner(student_id)')
    .eq('program_subject_id', subjectId).neq('status', 'dropped');
  if (error) throw error;
  const ids = [...new Set((sels || []).map((x: any) => (Array.isArray(x.student_enrollments) ? x.student_enrollments[0] : x.student_enrollments)?.student_id).filter(Boolean))] as string[];
  if (!ids.length) return [];
  const { data: ps, error: pErr } = await supabase.from('profiles').select('id, full_name').in('id', ids).order('full_name');
  if (pErr) throw pErr;
  return (ps || []).map(p => ({ id: p.id, name: p.full_name || '' }));
}

// ───────────── Word 导出（版式对齐 Gris 现行的《晚自习各老师工作安排》）─────────────
const FONT = '微软雅黑';
const run = (t: string, o: any = {}) => new TextRun({ text: t, font: FONT, size: 20, ...o });
const border = { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' };
const borders = { top: border, bottom: border, left: border, right: border };
function cell(text: string, w: number, head = false) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA }, borders,
    shading: head ? { type: ShadingType.CLEAR, fill: 'D9E2F3', color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: (text || '').split('\n').map(l => new Paragraph({ children: [run(l, { bold: head })] })),
  });
}
function table(cols: number[], head: string[], rows: string[][]) {
  return new Table({
    columnWidths: cols, width: { size: cols.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    rows: [new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, cols[i], true)) }),
      ...rows.map(r => new TableRow({ children: r.map((x, i) => cell(x, cols[i])) }))],
  });
}
const h = (t: string) => new Paragraph({ spacing: { before: 280, after: 100 }, children: [run(t, { bold: true, size: 24 })] });
const para = (t: string) => new Paragraph({ spacing: { after: 60 }, children: [run(t)] });
const dur = (s: NightSession) => {
  if (!s.start_time || !s.end_time) return '';
  const [a, b] = [s.start_time, s.end_time].map(x => Number(x.slice(0, 2)) * 60 + Number(x.slice(3, 5)));
  const m = b - a;
  return m > 0 ? ` ${m % 60 ? (m / 60).toFixed(1) : m / 60}h` : '';
};

// Word 里科目写中文（与 Gris 原文一致）：Physics → 物理；EAP 保持 EAP
const subjCn = (name?: string | null) => (name ? (/^EAP/i.test(name) ? 'EAP' : cnOf(name) || name) : '');

export function sessionLine(s: NightSession) {
  const kind = s.kind === 'exam_prep' || s.kind === 'review' || s.kind === 'intro' ? '' : KIND_LABEL[s.kind] || '';
  return `${hm(s.start_time)} ${subjCn(s.subject)}${kind}${s.teacher_name ? ` · ${s.teacher_name}` : ''}`.replace(/\s+/g, ' ').trim();
}

export async function exportWeekDocx(monday: string, week: NightWeek | null, sessions: NightSession[]) {
  const title = week?.title || defaultWeekTitle(monday);
  const children: any[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [run(title, { bold: true, size: 30 })] }),
  ];
  if (week?.exam_notes) week.exam_notes.split('\n').forEach(l => children.push(para(l)));

  // 按老师分组：当晚的课 + 不落到具体晚上的任务（群内答疑等）
  const tasks = (week?.teacher_tasks as unknown as TeacherTask[]) || [];
  const teachers = [...new Set([...sessions.map(s => s.teacher_name).filter(Boolean) as string[], ...tasks.map(t => t.teacher)])];
  for (const t of teachers) {
    const subj = [...new Set(sessions.filter(s => s.teacher_name === t && s.subject).map(s => subjCn(s.subject)))];
    children.push(h(subj.length ? `${t}（${subj.join('、')}）` : t));
    const rows: string[][] = [
      ...sessions.filter(s => s.teacher_name === t).map(s => [
        `${weekdayOf(s.session_date)} ${hm(s.start_time)} ${subjCn(s.subject)}${KIND_LABEL[s.kind] || ''}${dur(s)}`.replace(/\s+/g, ' ').trim(),
        [s.topic, s.notes].filter(Boolean).join('\n'),
      ]),
      ...tasks.filter(x => x.teacher === t).map(x => [x.time, x.task]),
    ];
    children.push(table([2600, 6426], ['时间', '任务'], rows));
  }
  if (week?.general_tasks) {
    children.push(h('所有老师本周通用任务'));
    week.general_tasks.split('\n').forEach(l => children.push(para(l)));
  }

  // 课表：日期 × 教室
  const notes = (week?.room_plan as unknown as RoomNote[]) || [];
  const days = [...new Set([...sessions.map(s => s.session_date), ...notes.map(n => n.date)])].sort();
  if (days.length) {
    children.push(h(`${md(monday)}–${md(addDays(monday, 4))} 课表安排`));
    children.push(para('时间为 18:00–20:30，地点在奥大国际学院 1 楼。'));
    const roomText = (d: string, r: string) => {
      const lines = sessions.filter(s => s.session_date === d && s.room === r).map(sessionLine);
      const n = notes.find(x => x.date === d) as any;
      if (n?.[`r${r}`]) lines.push(n[`r${r}`]);
      return lines.join('\n') || '—';
    };
    children.push(table([1600, 3000, 2213, 2213], ['日期', '106（上课 / 讨论）', '109', '110（静音自习）'],
      days.map(d => [`${md(d)} / ${weekdayOf(d)}`, roomText(d, '106'), roomText(d, '109'), roomText(d, '110')])));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [{ properties: { page: { margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 } } }, children }],
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${title}.docx`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
