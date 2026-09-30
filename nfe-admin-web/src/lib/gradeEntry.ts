// 成绩快速录入的数据层 —— 巡查老师在晚自习批量登记用
//
// 两种模式共用这一份上下文：按学生（学生拿卷子过来）/ 按节点（刚考完一门，全班一起录）。
//
// 几个口径，改之前先看清：
//  · 名单 = 预科在读学生（与晚自习点名同源 lib/prepStudents.ts），不是全部学生。
//  · 每个学生只能录**他选了的科目**（student_subject_selections）。各科选课人数差别很大
//    （EAP 38 人 / Mathematics 3 人），拿全员名单录分是错的。
//  · **有子项的父节点不可录分**：computeSubject 里父 Project 的分数由子项加权算出，
//    往父节点写分不会进总评，只会误导人。
//  · 缺考存成 score=0 + status='missed'：computeSubject 只读 score、不读 status，
//    所以不写 0 的话「缺考」不会被算成 0 分。
//  · 写入走 upsert(student_id,milestone_id)，依赖 migration 20260930120000 的唯一索引；
//    风险分按「涉及的学生」各重算一次，而不是每条记录重算一次。

import { supabase } from './supabase';
import { fetchPrepActiveStudents, type PrepStudent } from './prepStudents';
import { recomputeRisk } from './riskEngine';
import { useAuthStore } from '../store/useAuthStore';

const db = supabase as any;

export const GRADE_STATUS_LABEL: Record<string, string> = {
  graded: '正常', missed: '缺考', makeup: '补考',
};

export interface SubjectInfo {
  id: number; name: string; passMark: number;
  programId: number | null; programName: string | null; programMonths: number | null;
}

/** 同一个科目名在不同项目下各有一份（Chemistry/EAP/Physics… 在 Standard 12 月和 Accelerated 5 月各一套），
 *  所以科目在界面上必须带项目，否则两个下拉项长得一模一样、根本分不清。 */
export function subjectLabel(s: SubjectInfo | undefined): string {
  if (!s) return '—';
  if (!s.programName) return s.name;
  return `${s.name} · ${s.programName}${s.programMonths ? `（${s.programMonths}个月）` : ''}`;
}

export interface NodeInfo {
  id: number;
  subjectId: number | null;
  title: string;
  dueDate: string | null;
  weight: number | null;
  parentId: number | null;
  /** 父节点标题。子项标题常常脱离父节点认不出来（如「SIC Part 1」「Part 3 第 1 轮…」），界面要带上 */
  parentTitle: string | null;
  isMajor: boolean;
  hasChildren: boolean;      // 有子项 → 不可直接录分
}

export interface GradeCell { id: number; score: number | null; status: string; note: string | null }

export interface GradeEntryContext {
  students: PrepStudent[];
  subjects: Record<number, SubjectInfo>;
  nodesById: Record<number, NodeInfo>;
  /** 可录分节点（已排除有子项的父节点），按科目分组 */
  enterableBySubject: Record<number, NodeInfo[]>;
  /** 学生 → 选了的科目 id，按科目名排序 */
  subjectIdsOf: Record<string, number[]>;
  /** 学生 → 选课记录缺失（界面要提示，不能静默少显示节点） */
  missingSelection: Record<string, boolean>;
  grades: Record<string, GradeCell>;          // key = `${studentId}|${nodeId}`
  errors: string[];
}

export const gradeKey = (studentId: string, nodeId: number) => `${studentId}|${nodeId}`;

export async function fetchGradeEntryContext(): Promise<GradeEntryContext> {
  const [students, subjRes, progRes, nodeRes, selRes, enrRes, grRes] = await Promise.all([
    fetchPrepActiveStudents(),
    db.from('program_subjects').select('id, subject_name, pass_mark, program_id'),
    db.from('programs').select('id, name, duration_months'),
    db.from('academic_milestones').select('id, program_subject_id, title, due_date, weight_percent, parent_id, is_major'),
    db.from('student_subject_selections').select('enrollment_id, program_subject_id, status'),
    db.from('student_enrollments').select('id, student_id'),
    db.from('grade_records').select('id, student_id, milestone_id, score, status, note'),
  ]);

  const errors: string[] = [];
  ([['科目', subjRes], ['项目', progRes], ['考核节点', nodeRes], ['选课', selRes], ['报名', enrRes], ['成绩', grRes]] as [string, any][])
    .forEach(([label, r]) => { if (r?.error) errors.push(`${label}：${r.error.message || '读取失败'}`); });
  const rows = (r: any): any[] => (r && !r.error && Array.isArray(r.data) ? r.data : []);

  const programs: Record<number, { name: string; months: number | null }> = {};
  for (const p of rows(progRes)) programs[p.id] = { name: p.name, months: p.duration_months ?? null };

  const subjects: Record<number, SubjectInfo> = {};
  for (const s of rows(subjRes)) {
    const prog = s.program_id != null ? programs[s.program_id] : undefined;
    subjects[s.id] = {
      id: s.id, name: s.subject_name, passMark: s.pass_mark ?? 50,
      programId: s.program_id ?? null,
      programName: prog?.name ?? null,
      programMonths: prog?.months ?? null,
    };
  }

  const rawNodes = rows(nodeRes);
  const parentIds = new Set<number>(rawNodes.map(n => n.parent_id).filter(Boolean));
  const titleById: Record<number, string> = {};
  for (const n of rawNodes) titleById[n.id] = n.title || '未命名节点';
  const nodesById: Record<number, NodeInfo> = {};
  for (const n of rawNodes) {
    nodesById[n.id] = {
      id: n.id, subjectId: n.program_subject_id ?? null, title: titleById[n.id],
      dueDate: n.due_date || null,
      weight: n.weight_percent == null ? null : Number(n.weight_percent),
      parentId: n.parent_id ?? null,
      parentTitle: n.parent_id ? (titleById[n.parent_id] ?? null) : null,
      isMajor: !!n.is_major,
      hasChildren: parentIds.has(n.id),
    };
  }

  // 可录分节点：排除有子项的父节点；按到期日倒序（最近考的排前面，录分时最常用）
  const enterableBySubject: Record<number, NodeInfo[]> = {};
  for (const n of Object.values(nodesById)) {
    if (n.hasChildren || n.subjectId == null) continue;
    (enterableBySubject[n.subjectId] ||= []).push(n);
  }
  for (const list of Object.values(enterableBySubject)) {
    list.sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || '') || a.title.localeCompare(b.title, 'zh'));
  }

  // 选课：selections → enrollment → student
  const studentOfEnrollment: Record<number, string> = {};
  for (const e of rows(enrRes)) if (e.student_id) studentOfEnrollment[e.id] = e.student_id;

  const subjectSetOf: Record<string, Set<number>> = {};
  for (const s of rows(selRes)) {
    if (s.status === 'dropped') continue;
    const sid = studentOfEnrollment[s.enrollment_id];
    if (!sid || s.program_subject_id == null) continue;
    (subjectSetOf[sid] ||= new Set()).add(s.program_subject_id);
  }

  const subjectIdsOf: Record<string, number[]> = {};
  const missingSelection: Record<string, boolean> = {};
  for (const st of students) {
    const ids = Array.from(subjectSetOf[st.id] || []);
    ids.sort((a, b) => (subjects[a]?.name || '').localeCompare(subjects[b]?.name || '', 'zh'));
    subjectIdsOf[st.id] = ids;
    missingSelection[st.id] = ids.length === 0;
  }

  const grades: Record<string, GradeCell> = {};
  for (const g of rows(grRes)) {
    if (!g.student_id || g.milestone_id == null) continue;
    grades[gradeKey(g.student_id, g.milestone_id)] = {
      id: g.id, score: g.score == null ? null : Number(g.score),
      status: g.status || 'graded', note: g.note || null,
    };
  }

  return { students, subjects, nodesById, enterableBySubject, subjectIdsOf, missingSelection, grades, errors };
}

export interface GradeDraft {
  studentId: string;
  nodeId: number;
  subjectId: number;
  score: number;      // 缺考写 0
  status: string;     // graded / missed / makeup
}

/** 批量保存。依赖 (student_id, milestone_id) 唯一索引做 upsert；每个学生只重算一次风险分。 */
export async function saveGrades(drafts: GradeDraft[]): Promise<{ ok: boolean; saved: number; error?: string }> {
  if (!drafts.length) return { ok: true, saved: 0 };
  const user = useAuthStore.getState().user;
  const nowIso = new Date().toISOString();
  const payload = drafts.map(d => ({
    student_id: d.studentId,
    milestone_id: d.nodeId,
    program_subject_id: d.subjectId,
    score: d.score,
    score_type: 'final',
    status: d.status,
    recorded_by: user?.id ?? null,
    recorded_at: nowIso,
  }));

  const { error } = await db.from('grade_records').upsert(payload, { onConflict: 'student_id,milestone_id' });
  if (error) return { ok: false, saved: 0, error: error.message };

  // 成绩低于过线分会扣风险分，录完即时重算——按学生去重，别每条记录调一次
  const ids = Array.from(new Set(drafts.map(d => d.studentId)));
  await Promise.all(ids.map(id => recomputeRisk(id, user?.id ?? null)));
  return { ok: true, saved: payload.length };
}
