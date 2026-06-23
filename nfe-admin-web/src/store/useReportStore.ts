import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { message } from 'antd';
import { useAuthStore } from './useAuthStore';

const db = supabase as any;

// 双周学术报告结构化内容
export interface ReportGrade { subject: string; score: string; note: string; }
export interface ReportViolation { type: string; date: string; note: string; }
export interface ReportContent {
  attendance: { rate: number | null; present: number; absent: number; leave: number };
  grades: ReportGrade[];
  tutoring: { sessions: number; hours: number; note: string };
  violations: ReportViolation[];
  comment: string; // 老师综合评价
}

export const emptyContent = (): ReportContent => ({
  attendance: { rate: null, present: 0, absent: 0, leave: 0 },
  grades: [],
  tutoring: { sessions: 0, hours: 0, note: '' },
  violations: [],
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
  generateBiweeklyReports: (periodStart: string, periodEnd: string) => Promise<boolean>;
  updateReport: (id: number, patch: Partial<Pick<ReportRecord, 'content' | 'period_start' | 'period_end' | 'title'>>) => Promise<boolean>;
  deleteReport: (id: number) => Promise<boolean>;
  publishReport: (id: number) => Promise<boolean>;
  attachPdf: (id: number, key: string) => Promise<boolean>;
}

// 按周期为单个学生预填内容（能填的真实数据，其余留空待老师补）
async function prefillContent(studentId: string, start: string, end: string): Promise<ReportContent> {
  const c = emptyContent();
  const endTs = `${end}T23:59:59`;
  try {
    // 出勤：daily_checks（晚自习/早上点名）
    const { data: checks } = await db
      .from('daily_checks')
      .select('status')
      .eq('student_id', studentId)
      .in('check_type', ['night_study', 'morning'])
      .gte('created_at', start)
      .lte('created_at', endTs);
    if (checks && checks.length) {
      const present = checks.filter((x: any) => x.status === 'present').length;
      const absent = checks.filter((x: any) => x.status === 'absent').length;
      const leave = checks.filter((x: any) => x.status === 'leave').length;
      const total = present + absent + leave;
      c.attendance = { present, absent, leave, rate: total ? Math.round((present / total) * 100) : null };
    }
    // 违规：violation_logs
    const { data: vios } = await db
      .from('violation_logs')
      .select('violation_type, reason, created_at')
      .eq('student_id', studentId)
      .gte('created_at', start)
      .lte('created_at', endTs);
    if (vios) c.violations = vios.map((v: any) => ({ type: v.violation_type || '违规', date: (v.created_at || '').slice(0, 10), note: v.reason || '' }));
    // 成绩：grade_records（周期内，关联科目名）
    const { data: grades } = await db
      .from('grade_records')
      .select('score, score_type, recorded_at, program_subjects(subject_name)')
      .eq('student_id', studentId)
      .gte('recorded_at', start)
      .lte('recorded_at', endTs);
    if (grades) c.grades = grades.map((g: any) => ({
      subject: (Array.isArray(g.program_subjects) ? g.program_subjects[0]?.subject_name : g.program_subjects?.subject_name) || '',
      score: g.score != null ? String(g.score) : '',
      note: g.score_type || '',
    }));
  } catch (e) {
    console.warn('prefill report content error', e);
  }
  return c;
}

export const useReportStore = create<ReportStore>((set, get) => ({
  reports: [],
  isLoading: false,

  fetchReports: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await db
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

  generateBiweeklyReports: async (periodStart, periodEnd) => {
    try {
      const user = useAuthStore.getState().user;
      const { data: students, error: sErr } = await db
        .from('profiles').select('id, full_name').eq('role', 'student');
      if (sErr) throw sErr;
      if (!students || students.length === 0) { message.warning('暂无在读学生'); return false; }

      // 去重：同学生 + 同周期 + 双周类型已存在则跳过
      const { data: existing } = await db
        .from('reports')
        .select('student_id')
        .eq('report_type', 'biweekly')
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd);
      const skip = new Set((existing || []).map((e: any) => e.student_id));
      const targets = students.filter((s: any) => !skip.has(s.id));
      if (targets.length === 0) { message.info('该周期报告已全部生成'); return false; }

      const rows = [];
      for (const s of targets) {
        const content = await prefillContent(s.id, periodStart, periodEnd);
        rows.push({
          student_id: s.id,
          report_type: 'biweekly',
          title: `${s.full_name} · 双周学术报告`,
          period_start: periodStart,
          period_end: periodEnd,
          content,
          status: 'draft',
          generated_by: user?.id ?? null,
        });
      }
      const { error } = await db.from('reports').insert(rows);
      if (error) throw error;
      message.success(`已生成 ${rows.length} 份双周报告草稿（已预填可得数据）`);
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
      const { error } = await db.from('reports').update(patch).eq('id', id);
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
      const { error } = await db.from('reports').delete().eq('id', id);
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
      const { error } = await db.from('reports')
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
      const { error } = await db.from('reports').update({ pdf_url: key }).eq('id', id);
      if (error) throw error;
      get().fetchReports();
      return true;
    } catch (err: any) {
      message.error(err.message || '保存PDF失败');
      return false;
    }
  },
}));
