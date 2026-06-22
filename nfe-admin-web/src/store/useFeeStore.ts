import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type FeeType = 'supervision' | 'tutoring' | 'accommodation' | 'tuition';

export const FEE_TYPE_LABELS: Record<FeeType, string> = {
  supervision: '监管',
  tutoring: '辅导',
  accommodation: '住宿',
  tuition: '学费',
};

export interface StudentFee {
  id: number;
  student_id: string;
  fee_type: FeeType;
  period: string;
  is_paid: boolean;
  paid_date: string | null;
  note: string | null;
}

interface FeeStore {
  fees: StudentFee[];
  isLoading: boolean;
  fetchFees: (studentId: string) => Promise<void>;
  addFee: (studentId: string, feeType: FeeType, period: string) => Promise<boolean>;
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
        .eq('student_id', studentId)
        .order('period')
        .order('fee_type');
      set({ fees: (data as StudentFee[]) || [], isLoading: false });
    } catch (err) {
      console.error('fetchFees error', err);
      set({ isLoading: false });
    }
  },

  addFee: async (studentId, feeType, period) => {
    try {
      const { error } = await supabase.from('student_fees').insert({
        student_id: studentId, fee_type: feeType, period, is_paid: false,
      } as any);
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
        .update({ is_paid: isPaid, paid_date: isPaid ? new Date().toISOString().slice(0, 10) : null } as any)
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
