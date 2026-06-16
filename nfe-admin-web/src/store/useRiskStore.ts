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
}

export const useRiskStore = create<RiskStore>((set, get) => ({
  pendingWarnings: [],
  isLoading: false,
  error: null,

  fetchPendingWarnings: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('warning_letters')
        .select(`
          *,
          students_info!inner(profiles(full_name)),
          profiles!warning_letters_issuer_id_fkey(full_name)
        `)
        .eq('status', 'pending_approval');
        
      if (error) throw error;
      
      // Flatten the profiles relationship for easier rendering
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        students_info: {
          profiles: Array.isArray(item.students_info?.profiles) ? item.students_info.profiles[0] : item.students_info?.profiles
        },
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
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

      const oldLevel = student.risk_level;
      const newScore = Math.max(0, student.total_risk_score - scoreDeduction);

      // 3. Update student risk level and score
      const { error: uError } = await supabase
        .from('students_info')
        .update({
          risk_level: newLevel,
          total_risk_score: newScore
        })
        .eq('student_id', studentId);
      if (uError) throw uError;

      // 4. Log the risk change
      const { error: lError } = await supabase
        .from('log_risk_changes')
        .insert({
          student_id: studentId,
          old_level: oldLevel,
          new_level: newLevel,
          trigger_type: 'manual_override', // or system_auto
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
  }
}));
