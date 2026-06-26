import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { recomputeRisk } from '../lib/riskEngine';

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
  issuedWarnings: WarningLetter[];
  isLoading: boolean;
  error: string | null;
  fetchPendingWarnings: () => Promise<void>;
  fetchIssuedWarnings: () => Promise<void>;
  issueWarning: (studentId: string, level: number, evidence: string) => Promise<boolean>;
  approveWarning: (warningId: number, studentId: string, newLevel: string, scoreDeduction: number) => Promise<boolean>;
  rejectWarning: (warningId: number) => Promise<boolean>;
  markWarningSigned: (warningId: number) => Promise<boolean>;
  // 撤销/作废已下发警告信：不再计入风险，并重算
  revokeWarning: (warningId: number, studentId: string) => Promise<boolean>;
}

// 把 warning_letters 查询结果统一成渲染层期望的别名结构
const formatWarnings = (data: any[]) =>
  (data || []).map((item: any) => ({
    ...item,
    students_info: {
      profiles: Array.isArray(item.student) ? item.student[0] : item.student
    },
    profiles: Array.isArray(item.issuer) ? item.issuer[0] : item.issuer
  }));

const WARNING_SELECT = `
  *,
  student:profiles!warning_letters_student_id_fkey(full_name),
  issuer:profiles!warning_letters_issuer_id_fkey(full_name)
`;

export const useRiskStore = create<RiskStore>((set, get) => ({
  pendingWarnings: [],
  issuedWarnings: [],
  isLoading: false,
  error: null,

  fetchPendingWarnings: async () => {
    set({ isLoading: true, error: null });
    try {
      // warning_letters.student_id → profiles (直接关联，无需经过 students_info)
      // warning_letters.issuer_id  → profiles (FK: warning_letters_issuer_id_fkey)
      const { data, error } = await supabase
        .from('warning_letters')
        .select(WARNING_SELECT)
        .eq('status', 'pending_approval');

      if (error) throw error;
      set({ pendingWarnings: formatWarnings(data || []), isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchIssuedWarnings: async () => {
    try {
      // 已下发（含已下发未签字 issued 和已现场签字 signed_onsite）
      const { data, error } = await supabase
        .from('warning_letters')
        .select(WARNING_SELECT)
        .in('status', ['issued', 'signed_onsite'])
        .order('id', { ascending: false });

      if (error) throw error;
      set({ issuedWarnings: formatWarnings(data || []) });
    } catch (err: any) {
      set({ error: err.message });
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

  // 注：newLevel/scoreDeduction 参数已弃用（保留签名兼容旧调用）。
  // 批准后只把警告信置为 issued，风险分交给算分引擎按"警告信累计"口径统一重算。
  approveWarning: async (warningId: number, studentId: string, _newLevel: string, _scoreDeduction: number) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Not authenticated');

      // 1. 警告信置为已下发
      const { error: wError } = await supabase
        .from('warning_letters')
        .update({ status: 'issued' })
        .eq('id', warningId);
      if (wError) throw wError;

      // 2. 交给引擎重算（会把第 N 封警告计入扣分 / 第 3 封硬触发红，并记 log_risk_changes）
      await recomputeRisk(studentId, user.id);

      await get().fetchPendingWarnings();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  rejectWarning: async (warningId: number) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('warning_letters')
        .update({ status: 'rejected' })
        .eq('id', warningId);
      if (error) throw error;
      await get().fetchPendingWarnings();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  revokeWarning: async (warningId: number, studentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      const { error } = await supabase
        .from('warning_letters')
        .update({ status: 'rejected' })
        .eq('id', warningId);
      if (error) throw error;
      // 重算：警告信累计减少，风险分回升
      await recomputeRisk(studentId, user?.id ?? null);
      await Promise.all([get().fetchIssuedWarnings(), get().fetchPendingWarnings()]);
      set({ isLoading: false });
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
      set({ isLoading: false });
      await get().fetchIssuedWarnings();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  }
}));
