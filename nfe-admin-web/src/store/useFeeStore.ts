import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// 注：机构收费不含学费，故费用类别只有监管/辅导/住宿（DB 枚举仍保留 tuition，未使用）
export type FeeType = 'supervision' | 'tutoring' | 'accommodation';

export const FEE_TYPE_LABELS: Record<FeeType, string> = {
  supervision: '监管',
  tutoring: '辅导',
  accommodation: '住宿',
};

export const FEE_TYPES = Object.keys(FEE_TYPE_LABELS) as FeeType[];

export interface StudentFee {
  id: number;
  enrollment_id: number;
  student_id: string;
  fee_type: FeeType;
  is_paid: boolean;
  paid_date: string | null;
  note: string | null;
}

interface FeeStore {
  fees: StudentFee[];
  isLoading: boolean;
  fetchFees: (studentId: string) => Promise<void>;
  addFee: (enrollmentId: number, studentId: string, feeType: FeeType) => Promise<boolean>;
  togglePaid: (id: number, isPaid: boolean) => Promise<void>;
  deleteFee: (id: number) => Promise<void>;
}

export const useFeeStore = create<FeeStore>((set, get) => ({
  fees: [],
  isLoading: false,

  fetchFees: async (studentId) => {
    set({ isLoading: true });
    try {
      const { data } = await supabase
        .from('student_fees')
        .select('*')
        .eq('student_id', studentId);
      set({ fees: (data as StudentFee[]) || [], isLoading: false });
    } catch (err) {
      console.error('fetchFees error', err);
      set({ isLoading: false });
    }
  },

  addFee: async (enrollmentId, studentId, feeType) => {
    try {
      const { error } = await supabase.from('student_fees').insert({
        enrollment_id: enrollmentId, student_id: studentId, fee_type: feeType, is_paid: false,
      });
      if (error) throw error;
      await get().fetchFees(studentId);
      return true;
    } catch (err) {
      console.error('addFee error', err);
      return false;
    }
  },

  togglePaid: async (id, isPaid) => {
    try {
      const { error } = await supabase.from('student_fees')
        .update({ is_paid: isPaid, paid_date: isPaid ? new Date().toISOString().slice(0, 10) : null })
        .eq('id', id);
      if (error) throw error;
      const sid = get().fees.find(f => f.id === id)?.student_id;
      if (sid) await get().fetchFees(sid);
    } catch (err) {
      console.error('togglePaid error', err);
    }
  },

  deleteFee: async (id) => {
    try {
      const sid = get().fees.find(f => f.id === id)?.student_id;
      const { error } = await supabase.from('student_fees').delete().eq('id', id);
      if (error) throw error;
      if (sid) await get().fetchFees(sid);
    } catch (err) {
      console.error('deleteFee error', err);
    }
  },
}));
