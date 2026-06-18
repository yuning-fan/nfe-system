import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

export interface Schedule {
  id: number;
  student_id: string;
  tutor_id: string;
  course_id: number | null;
  program_subject_id: number | null;
  subject_label: string;
  start_time: string;
  end_time: string;
  status: 'pending_approval' | 'scheduled' | 'completed' | 'rescheduling';
  material_url: string | null;
  // Relations
  student?: { full_name: string };
  tutor?: { full_name: string };
  course?: { name: string };
}

export interface Tutor {
  id: string;
  full_name: string;
  role: string;
}

interface ScheduleStore {
  schedules: Schedule[];
  pendingSchedules: Schedule[];
  tutors: Tutor[];
  isLoading: boolean;
  error: string | null;

  fetchSchedules: () => Promise<void>;
  fetchPendingSchedules: () => Promise<void>;
  fetchTutors: () => Promise<void>;
  createSchedule: (payload: {
    student_id: string;
    tutor_id: string;
    course_id: number;
    subject_label: string;
    start_time: string;
    end_time: string;
  }) => Promise<boolean>;
  approveSchedule: (scheduleId: number) => Promise<boolean>;
  rejectSchedule: (scheduleId: number) => Promise<boolean>;
  attachMaterial: (scheduleId: number, key: string) => Promise<boolean>;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  pendingSchedules: [],
  tutors: [],
  isLoading: false,
  error: null,

  fetchTutors: async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['tutor', 'admin']);
      set({ tutors: (data as any) || [] });
    } catch (e) {
      console.error(e);
    }
  },

  fetchSchedules: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          student:profiles!schedules_student_id_fkey(full_name),
          tutor:profiles!schedules_tutor_id_fkey(full_name),
          course:courses(name)
        `)
        .neq('status', 'pending_approval')
        .order('start_time', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((s: any) => ({
        ...s,
        student: Array.isArray(s.student) ? s.student[0] : s.student,
        tutor: Array.isArray(s.tutor) ? s.tutor[0] : s.tutor,
        course: Array.isArray(s.course) ? s.course[0] : s.course,
      }));
      set({ schedules: formatted as any, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchPendingSchedules: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          student:profiles!schedules_student_id_fkey(full_name),
          tutor:profiles!schedules_tutor_id_fkey(full_name),
          course:courses(name)
        `)
        .eq('status', 'pending_approval')
        .order('start_time', { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map((s: any) => ({
        ...s,
        student: Array.isArray(s.student) ? s.student[0] : s.student,
        tutor: Array.isArray(s.tutor) ? s.tutor[0] : s.tutor,
        course: Array.isArray(s.course) ? s.course[0] : s.course,
      }));
      set({ pendingSchedules: formatted as any, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createSchedule: async (payload) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.from('schedules').insert({
        ...payload,
        status: 'pending_approval',
      });
      if (error) throw error;
      await get().fetchPendingSchedules();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  approveSchedule: async (scheduleId) => {
    set({ isLoading: true });
    try {
      const user = useAuthStore.getState().user;

      // 1. Get the schedule details to know duration and course
      const { data: schedule, error: fetchErr } = await supabase
        .from('schedules')
        .select('*, course:courses(name)')
        .eq('id', scheduleId)
        .single();
      if (fetchErr) throw fetchErr;

      // 2. Approve: update status to 'scheduled'
      const { error: updateErr } = await supabase
        .from('schedules')
        .update({ status: 'scheduled' })
        .eq('id', scheduleId);
      if (updateErr) throw updateErr;

      // 3. Write approval log to schedule_changes
      await supabase.from('schedule_changes').insert({
        schedule_id: scheduleId,
        requester_id: schedule.student_id,
        new_start_time: schedule.start_time,
        reason: '排课申请审批通过',
        status: 'approved',
        approver_id: user?.id ?? null,
      });

      // 4. Deduct hours from course_assets
      const startMs = new Date(schedule.start_time).getTime();
      const endMs = new Date(schedule.end_time).getTime();
      const durationHours = (endMs - startMs) / (1000 * 60 * 60);

      if (schedule.course_id) {
        const { data: asset } = await supabase
          .from('course_assets')
          .select('*')
          .eq('student_id', schedule.student_id!)
          .eq('course_id', schedule.course_id!)
          .single() as { data: any };

        if (asset) {
          const remaining = Math.max(0, Number(asset.total_hours) - durationHours);
          await supabase
            .from('course_assets')
            .update({ total_hours: remaining })
            .eq('id', asset.id);
        }
      }

      await Promise.all([get().fetchPendingSchedules(), get().fetchSchedules()]);
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  rejectSchedule: async (scheduleId) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId);
      if (error) throw error;
      await get().fetchPendingSchedules();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  attachMaterial: async (scheduleId, key) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ material_url: key })
        .eq('id', scheduleId);
      if (error) throw error;
      await get().fetchSchedules();
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },
}));
