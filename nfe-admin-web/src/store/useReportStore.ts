import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { message } from 'antd';
import { useAuthStore } from './useAuthStore';

export interface ReportRecord {
  id: number;
  student_id: string;
  report_type: 'biweekly' | 'monthly' | 'semester';
  generated_by: string | null;
  generated_at: string;
  reviewer_id: string | null;
  reviewed_at: string | null;
  pdf_url: string | null;
  status: 'draft' | 'reviewed' | 'sent';
  student: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface ReportStore {
  reports: ReportRecord[];
  isLoading: boolean;
  fetchReports: () => Promise<void>;
  publishReport: (id: number) => Promise<boolean>;
  generateBiweeklyReports: () => Promise<boolean>;
}

const db = supabase as any;

export const useReportStore = create<ReportStore>((set, get) => ({
  reports: [],
  isLoading: false,

  fetchReports: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await db
        .from('reports')
        .select(`
          *,
          student:profiles!reports_student_id_fkey(full_name, avatar_url)
        `)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      set({ reports: data || [] });
    } catch (err: any) {
      console.error('Fetch reports error:', err);
      message.error('获取报告列表失败');
    } finally {
      set({ isLoading: false });
    }
  },

  publishReport: async (id: number) => {
    try {
      const { error } = await db
        .from('reports')
        .update({
          status: 'sent',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      message.success('报告已审核并发布');
      get().fetchReports();
      return true;
    } catch (err: any) {
      console.error('Publish report error:', err);
      message.error('发布失败');
      return false;
    }
  },

  generateBiweeklyReports: async () => {
    try {
      const user = useAuthStore.getState().user;

      // Fetch all student profiles
      const { data: students, error: studentError } = await db
        .from('profiles')
        .select('id')
        .eq('role', 'student');

      if (studentError) throw studentError;

      if (!students || students.length === 0) {
        message.warning('暂无在读学生，无法生成报告');
        return false;
      }

      const newReports = students.map((s: any) => ({
        student_id: s.id,
        report_type: 'biweekly',
        status: 'draft',
        generated_by: user?.id ?? null,
      }));

      const { error } = await db
        .from('reports')
        .insert(newReports);

      if (error) throw error;

      message.success(`双周报告批量生成成功，共 ${newReports.length} 份`);
      get().fetchReports();
      return true;
    } catch (err: any) {
      console.error('Generate reports error:', err);
      message.error('生成报告失败');
      return false;
    }
  }
}));
