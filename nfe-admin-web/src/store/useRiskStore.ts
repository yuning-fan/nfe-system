import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

interface WarningLetter {
  id: number;
  student_id: string;
  issuer_id: string;
  warning_level: number;
  evidence_content: string | null;
  status: string;
  signed_at: string | null;
  students_info?: { profiles?: { full_name: string } };
  profiles?: { full_name: string }; // issuer
}

interface RiskStore {
  pendingWarnings: WarningLetter[];
  isLoading: boolean;
  error: string | null;
  fetchPendingWarnings: () => Promise<void>;
  issueWarning: (studentId: string, level: number, evidence: string) => Promise<boolean>;
  approveWarning: (warningId: number, studentId: string, newLevel: string, scoreDeduction: number) => Promise<boolean>;
  markWarningSigned: (warningId: number) => Promise<boolean>;
}

export const useRiskStore = create<RiskStore>((set, get) => ({
  pendingWarnings: [],
  isLoading: false,
  error: null,

  fetchPendingWarnings: async () => {
    set({ isLoading: true, error: null });
    try {
      // warning_letters.student_id → profiles (直接关联，无需经过 students_info)
      // warning_letters.issuer_id  → profiles (FK: warning_letters_issuer_id_fkey)
      const { data, error } = await supabase
        .from('warning_letters')
        .select(`
          *,
          student:profiles!warning_letters_student_id_fkey(full_name),
          issuer:profiles!warning_letters_issuer_id_fkey(full_name)
        `)
        .eq('status', 'pending_approval');

      if (error) throw error;

      // 统一别名结构，兼容渲染层已有的 .students_info?.profiles?.full_name 访问路径
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        students_info: {
          profiles: Array.isArray(item.student) ? item.student[0] : item.student
        },
        profiles: Array.isArray(item.issuer) ? item.issuer[0] : item.issuer
      }));

      set({ pendingWarnings: formattedData, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  issueWarning: async (studentId: string, level: number, evidence: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('warning_letters')
        .insert({
          student_id: studentId,
          issuer_id: user.id,
          warning_level: level,
          evidence_content: evidence,
          status: 'pending_approval'
        });

      if (error) throw error;

      await get().fetchPendingWarnings();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  approveWarning: async (warningId: number, studentId: string, newLevel: string, scoreDeduction: number) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Not authenticated');

      // 1. Update warning letter status
      const { error: wError } = await supabase
        .from('warning_letters')
        .update({ status: 'issued' })
        .eq('id', warningId);
      if (wError) throw wError;

      // 2. Fetch current student risk score
      const { data: student, error: sError } = await supabase
        .from('students_info')
        .select('risk_level, total_risk_score')
        .eq('student_id', studentId)
        .single();
      if (sError) throw sError;
      if (!student) throw new Error('Student not found');

      const oldLevel: string = student.risk_level || 'low';
      const newScore: number = Math.max(0, (student.total_risk_score || 0) - scoreDeduction);

      // 3. Update student risk level and score
      const { error: uError } = await supabase
        .from('students_info')
        .update({
          risk_level: newLevel as any,
          total_risk_score: newScore
        })
        .eq('student_id', studentId);
      if (uError) throw uError;

      // 4. Log the risk change
      const { error: lError } = await supabase
        .from('log_risk_changes')
        .insert({
          student_id: studentId,
          old_level: oldLevel as any,
          new_level: newLevel as any,
          trigger_type: 'manual_override',
          operator_id: user.id,
          reason: `Approved warning letter #${warningId}`
        });
      if (lError) throw lError;

      await get().fetchPendingWarnings();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  markWarningSigned: async (warningId: number) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('warning_letters')
        .update({
          status: 'signed_onsite',
          signed_at: new Date().toISOString()
        })
        .eq('id', warningId);
      if (error) throw error;
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  }
}));
