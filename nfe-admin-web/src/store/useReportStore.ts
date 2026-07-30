import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { message } from 'antd';
import { useAuthStore } from './useAuthStore';
import { computeRisk } from '../lib/riskEngine';
import { computeSubject } from '../lib/gradeCalc';
import type { Json } from '../types/database.types';


// 报告结构化内容（出勤报告 biweekly / 学术报告 monthly 共用超集，按 report_type 取用相应字段）
export interface ReportGrade { subject: string; score: string; note: string; }
export interface ReportViolation { type: string; date: string; note: string; }
// nodes.date = 考核日期（academic_milestones.due_date）
// 「措施」列不由系统填充：导出后由学管在 Word 里手写，故报告数据不含该字段。
export interface ReportSubject { name: string; total: number | null; passMark: number; pass: boolean | null; nodes: { title: string; weight: number; score: number | null; date?: string | null }[]; }
export interface ReportFeedback { date: string; subject: string; feedback: string; }
export interface ReportContent {
  attendance: { rate: number | null; official_rate?: number | null; present: number; absent: number; leave: number };
  grades: ReportGrade[];
  tutoring: { sessions: number; hours: number; note: string };
  violations: ReportViolation[];
  subjects?: ReportSubject[];        // 学术报告：各科加权总评
  tutoring_feedback?: ReportFeedback[]; // 学术报告：辅导公开反馈
  alerts?: string[];                 // 预警提示区（自动）
  comment: string; // 老师综合评价
}

export const emptyContent = (): ReportContent => ({
  attendance: { rate: null, official_rate: null, present: 0, absent: 0, leave: 0 },
  grades: [],
  tutoring: { sessions: 0, hours: 0, note: '' },
  violations: [],
  subjects: [],
  tutoring_feedback: [],
  alerts: [],
  comment: '',
});

export interface ReportRecord {
  id: number;
  student_id: string;
  report_type: 'biweekly' | 'monthly' | 'semester';
  title: string | null;
  period_start: string | null;
  period_end: string | null;
  content: ReportContent;
  generated_by: string | null;
  generated_at: string;
  reviewer_id: string | null;
  reviewed_at: string | null;
  sent_at: string | null;
  pdf_url: string | null;
  status: 'draft' | 'reviewed' | 'sent';
  student: { full_name: string; avatar_url: string | null } | null;
}

interface ReportStore {
  reports: ReportRecord[];
  isLoading: boolean;
  fetchReports: () => Promise<void>;
  generateReports: (reportType: 'biweekly' | 'monthly', periodStart: string, periodEnd: string, studentIds?: string[]) => Promise<boolean>;
  updateReport: (id: number, patch: Partial<Pick<ReportRecord, 'content' | 'period_start' | 'period_end' | 'title'>>) => Promise<boolean>;
  deleteReport: (id: number) => Promise<boolean>;
  publishReport: (id: number) => Promise<boolean>;
  attachPdf: (id: number, key: string) => Promise<boolean>;
}

// 预警提示区：复用风险引擎（硬触发/屡教不改/等级）
async function buildAlerts(studentId: string): Promise<string[]> {
  try {
    const r = await computeRisk(studentId);
    const out: string[] = [];
    if (r.hardTriggers.length) out.push(...r.hardTriggers);
    if (r.notes && r.notes.length) out.push(...r.notes);
    if (!out.length) {
      if (r.level === 'yellow') out.push('风险等级：需关注（黄）');
      else if (r.level === 'red') out.push('风险等级：重点干预（红）');
    }
    return out;
  } catch { return []; }
}

// 出勤报告预填：官方出勤率 + 内部点名统计 + 违规 + 预警
async function prefillAttendance(studentId: string, start: string, end: string): Promise<ReportContent> {
  const c = emptyContent();
  const endTs = `${end}T23:59:59`;
  try {
    const { data: info } = await supabase.from('students_info').select('school_attendance_rate').eq('student_id', studentId).single();
    c.attendance.official_rate = info?.school_attendance_rate ?? null;

    const { data: checks } = await supabase.from('daily_checks').select('status')
      .eq('student_id', studentId).in('check_type', ['night_study', 'morning'])
      .gte('created_at', start).lte('created_at', endTs);
    if (checks && checks.length) {
      const present = checks.filter((x: any) => x.status === 'present').length;
      const absent = checks.filter((x: any) => x.status === 'absent').length;
      const leave = checks.filter((x: any) => x.status === 'leave').length;
      const total = present + absent + leave;
      c.attendance = { ...c.attendance, present, absent, leave, rate: total ? Math.round((present / total) * 100) : null };
    }
    const { data: vios } = await supabase.from('violation_logs').select('violation_type, reason, created_at')
      .eq('student_id', studentId).gte('created_at', start).lte('created_at', endTs);
    if (vios) c.violations = vios.map((v: any) => ({ type: v.violation_type || '违规', date: (v.created_at || '').slice(0, 10), note: v.reason || '' }));
    c.alerts = await buildAlerts(studentId);
  } catch (e) { console.warn('prefill attendance error', e); }
  return c;
}

// 学术报告预填：各科加权总评 + 辅导公开反馈 + 违规 + 预警
async function prefillAcademic(studentId: string, start: string, end: string): Promise<ReportContent> {
  const c = emptyContent();
  const endTs = `${end}T23:59:59`;
  try {
    const [{ data: grades }, { data: nodes }, { data: subjMeta }] = await Promise.all([
      supabase.from('grade_records').select('milestone_id, program_subject_id, score, recorded_at').eq('student_id', studentId),
      supabase.from('academic_milestones').select('id, title, parent_id, weight_percent, program_subject_id, term_no, week_no, due_date'),
      supabase.from('program_subjects').select('id, subject_name, pass_mark'),
    ]);
    const gr = grades || [];
    const subjectIds = Array.from(new Set(gr.map((g: any) => g.program_subject_id).filter(Boolean)));
    const scoreOf = (nodeId: number) => { const g = gr.find((x: any) => x.milestone_id === nodeId); return g ? Number(g.score) : null; };
    c.subjects = subjectIds.map((sid: any) => {
      const meta = (subjMeta || []).find((s: any) => s.id === sid);
      const passMark = meta?.pass_mark ?? 50;
      const subjectNodes = (nodes || []).filter((n: any) => n.program_subject_id === sid);
      const r = computeSubject(subjectNodes as any, scoreOf, passMark);
      return {
        name: meta?.subject_name || '科目', total: r.total, passMark, pass: r.pass,
        nodes: r.rows.map(row => {
          const n = row.node as any;
          return { title: n.title, weight: row.weight, score: row.score, date: n.due_date || null };
        }),
      };
    });
    // 辅导公开反馈（周期内已完成的课）
    const { data: fb } = await supabase.from('schedules')
      .select('start_time, subject_label, feedback_public')
      .eq('student_id', studentId).eq('status', 'completed')
      .gte('start_time', start).lte('start_time', endTs);
    if (fb) c.tutoring_feedback = fb.filter((x: any) => x.feedback_public)
      .map((x: any) => ({ date: (x.start_time || '').slice(0, 10), subject: x.subject_label || '', feedback: x.feedback_public }));
    c.alerts = await buildAlerts(studentId);
  } catch (e) { console.warn('prefill academic error', e); }
  return c;
}

export const useReportStore = create<ReportStore>((set, get) => ({
  reports: [],
  isLoading: false,

  fetchReports: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*, student:profiles!reports_student_id_fkey(full_name, avatar_url)')
        .order('generated_at', { ascending: false });
      if (error) throw error;
      const rows = (data || []).map((r: any) => ({ ...r, content: { ...emptyContent(), ...(r.content || {}) } }));
      set({ reports: rows as ReportRecord[] });
    } catch (err: any) {
      console.error('Fetch reports error:', err);
      message.error('获取报告列表失败');
    } finally {
      set({ isLoading: false });
    }
  },

  generateReports: async (reportType, periodStart, periodEnd, studentIds) => {
    try {
      const user = useAuthStore.getState().user;
      const isAcademic = reportType === 'monthly';
      const label = isAcademic ? '学术月报' : '出勤双周报';
      let q = supabase.from('profiles').select('id, full_name').eq('role', 'student');
      if (studentIds && studentIds.length) q = q.in('id', studentIds);
      const { data: students, error: sErr } = await q;
      if (sErr) throw sErr;
      if (!students || students.length === 0) { message.warning('暂无在读学生'); return false; }

      // 去重：同学生 + 同周期 + 同类型已存在则跳过
      const { data: existing } = await supabase.from('reports').select('student_id')
        .eq('report_type', reportType).eq('period_start', periodStart).eq('period_end', periodEnd);
      const skip = new Set((existing || []).map((e: any) => e.student_id));
      const targets = students.filter((s: any) => !skip.has(s.id));
      if (targets.length === 0) { message.info('该周期报告已全部生成'); return false; }

      const rows = [];
      for (const s of targets) {
        const content = isAcademic
          ? await prefillAcademic(s.id, periodStart, periodEnd)
          : await prefillAttendance(s.id, periodStart, periodEnd);
        rows.push({
          student_id: s.id, report_type: reportType,
          title: `${s.full_name} · ${label}`,
          period_start: periodStart, period_end: periodEnd,
          // ReportContent 存 Json 列，接口无索引签名需定点桥接
          content: content as unknown as Json,
          status: 'draft' as const, generated_by: user?.id ?? null,
        });
      }
      const { error } = await supabase.from('reports').insert(rows);
      if (error) throw error;
      message.success(`已生成 ${rows.length} 份${label}草稿（已预填可得数据）`);
      get().fetchReports();
      return true;
    } catch (err: any) {
      console.error('Generate reports error:', err);
      message.error(err.message || '生成报告失败');
      return false;
    }
  },

  updateReport: async (id, patch) => {
    try {
      const { error } = await supabase.from('reports')
        .update({ ...patch, content: patch.content as unknown as Json }).eq('id', id);
      if (error) throw error;
      message.success('报告已保存');
      get().fetchReports();
      return true;
    } catch (err: any) {
      message.error(err.message || '保存失败');
      return false;
    }
  },

  deleteReport: async (id) => {
    try {
      const { error } = await supabase.from('reports').delete().eq('id', id);
      if (error) throw error;
      message.success('报告已删除');
      get().fetchReports();
      return true;
    } catch (err: any) {
      message.error(err.message || '删除失败');
      return false;
    }
  },

  publishReport: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      const now = new Date().toISOString();
      const { error } = await supabase.from('reports')
        .update({ status: 'sent', reviewer_id: user?.id ?? null, reviewed_at: now, sent_at: now })
        .eq('id', id);
      if (error) throw error;
      message.success('报告已审核并发布');
      get().fetchReports();
      return true;
    } catch (err: any) {
      message.error(err.message || '发布失败');
      return false;
    }
  },

  attachPdf: async (id, key) => {
    try {
      const { error } = await supabase.from('reports').update({ pdf_url: key }).eq('id', id);
      if (error) throw error;
      get().fetchReports();
      return true;
    } catch (err: any) {
      message.error(err.message || '保存PDF失败');
      return false;
    }
  },
}));
