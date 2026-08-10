import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { recomputeRisk } from '../lib/riskEngine';

export type DailyCheckType = 'morning' | 'night_study' | 'dorm_check' | 'tutoring';
export type DailyCheckStatus = 'present' | 'absent' | 'leave';

interface Passenger {
  id: number;
  student_id: string;
  pickup_time: string | null;
  pickup_location: string | null;
  drop_off_location: string | null;
  status: string;
  students_info?: {
    profiles?: {
      full_name: string;
    };
  };
}

interface DormStudent {
  id: number;
  student_id: string;
  dorms?: { building_name: string; room_number: string };
  students_info?: {
    profiles?: {
      full_name: string;
    };
  };
}

interface DailyCheckStore {
  todayPassengers: Passenger[];
  dormStudents: DormStudent[];
  isLoading: boolean;
  error: string | null;
  loadTodayPassengers: () => Promise<void>;
  updatePassengerStatus: (passengerId: number, newStatus: string) => Promise<boolean>;
  loadDormStudents: () => Promise<void>;
  submitDormChecks: (records: { student_id: string; status: DailyCheckStatus; notes?: string }[]) => Promise<boolean>;
  // 通用点名提交：晚自习(night_study) / 早上出勤(morning) / 辅导课(tutoring) / 查寝(dorm_check)
  submitDailyChecks: (checkType: DailyCheckType, records: { student_id: string; status: DailyCheckStatus; notes?: string }[]) => Promise<boolean>;
}

export const useDailyCheckStore = create<DailyCheckStore>((set, get) => ({
  todayPassengers: [],
  dormStudents: [],
  isLoading: false,
  error: null,

  loadTodayPassengers: async () => {
    set({ isLoading: true, error: null });
    try {
      // In a real app we'd filter by today's route. For MVP, fetch all pending/today passengers.
      // We will just fetch all passengers to mock "today's route".
      const { data, error } = await supabase
        .from('transport_passengers')
        .select(`
          *,
          students_info!inner(profiles!student_id(full_name))
        `);
      if (error) throw error;
      
      const formatted = (data || []).map((item: any) => ({
        ...item,
        students_info: {
          profiles: Array.isArray(item.students_info?.profiles) ? item.students_info.profiles[0] : item.students_info?.profiles
        }
      }));
      set({ todayPassengers: formatted, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updatePassengerStatus: async (passengerId: number, newStatus: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('transport_passengers')
        .update({ status: newStatus as any })
        .eq('id', passengerId);
      if (error) throw error;
      await get().loadTodayPassengers();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  loadDormStudents: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('dorm_assignments')
        .select(`
          id, student_id,
          dorms(building_name, room_number),
          students_info!inner(profiles!student_id(full_name))
        `)
        .eq('is_active', true);
      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        ...item,
        dorms: Array.isArray(item.dorms) ? item.dorms[0] : item.dorms,
        students_info: {
          profiles: Array.isArray(item.students_info?.profiles) ? item.students_info.profiles[0] : item.students_info?.profiles
        }
      }));
      set({ dormStudents: formatted, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  submitDailyChecks: async (checkType, records) => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Not authenticated');

      // 当天同类型重复提交 = 覆盖：先删掉今天这些学生的旧记录，再插入（点错重点即可纠正）
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const ids = Array.from(new Set(records.map(r => r.student_id)));
      await supabase
        .from('daily_checks')
        .delete()
        .eq('check_type', checkType)
        .in('student_id', ids)
        .gte('created_at', dayStart.toISOString())
        .lt('created_at', dayEnd.toISOString());

      const inserts = records.map(r => ({
        student_id: r.student_id,
        staff_id: user.id,
        check_type: checkType,
        status: r.status,
        notes: r.notes || null
      }));

      const { error } = await supabase
        .from('daily_checks')
        .insert(inserts);

      if (error) throw error;

      // 录入即时重算：对本次涉及的所有学生按口径重算风险分（不只缺席，出勤恢复也要回升）
      const affected = Array.from(new Set(records.map(r => r.student_id)));
      await Promise.all(affected.map(id => recomputeRisk(id, user.id)));

      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  submitDormChecks: async (records) => get().submitDailyChecks('dorm_check', records),
}));
