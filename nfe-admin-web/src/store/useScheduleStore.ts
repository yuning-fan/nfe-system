import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { recomputeRisk } from '../lib/riskEngine';

const db = supabase as any;

export type ScheduleStatus =
  | 'pending_approval' | 'scheduled' | 'completed'
  | 'absent' | 'leave' | 'cancelled' | 'rescheduling';

export interface Schedule {
  id: number;
  student_id: string;
  tutor_id: string;
  course_id: number | null;
  program_subject_id: number | null;
  subject_label: string;
  start_time: string;
  end_time: string;
  status: ScheduleStatus;
  material_url: string | null;
  feedback_public: string | null;
  feedback_internal: string | null;
  homework_content: string | null;
  // Relations
  student?: { full_name: string };
  tutor?: { full_name: string };
  course?: { name: string };
}

export type CompleteOutcome = 'present' | 'absent' | 'leave';

const hours = (s: { start_time: string; end_time: string }) =>
  (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 3600000;

// 取该课对应的课型（one_on_one / group_class）
async function courseTypeOf(courseId: number | null): Promise<string | null> {
  if (!courseId) return null;
  const { data } = await db.from('courses').select('type').eq('id', courseId).single();
  return data?.type ?? null;
}

// 内部：按课时长从「对应课型的课时池」扣（销课用）
async function deductHours(schedule: { student_id: string; course_id: number | null; start_time: string; end_time: string }) {
  const type = await courseTypeOf(schedule.course_id);
  if (!type) return;
  const { data: pool } = await db.from('student_hour_pools').select('*')
    .eq('student_id', schedule.student_id).eq('course_type', type).single();
  const cur = pool ? Number(pool.total_hours) : 0;
  const next = Math.max(0, cur - hours(schedule));
  if (pool) await db.from('student_hour_pools').update({ total_hours: next }).eq('id', pool.id);
  else await db.from('student_hour_pools').insert({ student_id: schedule.student_id, course_type: type, total_hours: 0 });
}

// 内部：把课时退回对应课型的池（撤销销课用，deductHours 的逆操作）
async function refundHours(schedule: { student_id: string; course_id: number | null; start_time: string; end_time: string }) {
  const type = await courseTypeOf(schedule.course_id);
  if (!type) return;
  const { data: pool } = await db.from('student_hour_pools').select('*')
    .eq('student_id', schedule.student_id).eq('course_type', type).single();
  const cur = pool ? Number(pool.total_hours) : 0;
  if (pool) await db.from('student_hour_pools').update({ total_hours: cur + hours(schedule) }).eq('id', pool.id);
  else await db.from('student_hour_pools').insert({ student_id: schedule.student_id, course_type: type, total_hours: hours(schedule) });
}

export interface Tutor {
  id: string;
  full_name: string;
  role: string;
}

interface ScheduleStore {
  schedules: Schedule[];
  pendingSchedules: Schedule[];
  mySchedules: Schedule[];
  pendingReschedules: any[];
  tutors: Tutor[];
  isLoading: boolean;
  error: string | null;

  fetchSchedules: () => Promise<void>;
  fetchPendingSchedules: () => Promise<void>;
  fetchMySchedules: (tutorId: string) => Promise<void>;
  fetchPendingReschedules: () => Promise<void>;
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
  deleteSchedule: (scheduleId: number) => Promise<boolean>;
  // 销课：出席/缺勤/请假 + 反馈
  completeSchedule: (scheduleId: number, payload: {
    outcome: CompleteOutcome;
    feedback_public?: string;
    feedback_internal?: string;
    homework_content?: string;
  }) => Promise<boolean>;
  cancelSchedule: (scheduleId: number, reason?: string) => Promise<boolean>;
  // 撤销销课：把已完成/缺勤/请假的课退回"待上课"，退回已扣课时并重算风险
  revertSchedule: (scheduleId: number) => Promise<boolean>;
  // 调课：申请 → 审批/驳回
  requestReschedule: (scheduleId: number, newStart: string, newEnd: string, reason: string) => Promise<boolean>;
  approveReschedule: (changeId: number) => Promise<boolean>;
  rejectReschedule: (changeId: number) => Promise<boolean>;
  attachMaterial: (scheduleId: number, key: string) => Promise<boolean>;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  pendingSchedules: [],
  mySchedules: [],
  pendingReschedules: [],
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

      // 注：课时不在审批时扣，改为「销课完成」时扣（见 completeSchedule）。

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

  deleteSchedule: async (scheduleId) => {
    set({ isLoading: true });
    try {
      const { error } = await db.from('schedules').delete().eq('id', scheduleId);
      if (error) throw error;
      await Promise.all([get().fetchSchedules(), get().fetchPendingSchedules()]);
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  fetchMySchedules: async (tutorId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await db
        .from('schedules')
        .select(`*, student:profiles!schedules_student_id_fkey(full_name), course:courses(name)`)
        .eq('tutor_id', tutorId)
        .neq('status', 'pending_approval')
        .order('start_time', { ascending: false });
      if (error) throw error;
      const formatted = (data || []).map((s: any) => ({
        ...s,
        student: Array.isArray(s.student) ? s.student[0] : s.student,
        course: Array.isArray(s.course) ? s.course[0] : s.course,
      }));
      set({ mySchedules: formatted as any, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchPendingReschedules: async () => {
    try {
      const { data, error } = await db
        .from('schedule_changes')
        .select(`*, schedule:schedules(*, student:profiles!schedules_student_id_fkey(full_name), tutor:profiles!schedules_tutor_id_fkey(full_name))`)
        .eq('status', 'pending')
        .order('id', { ascending: false });
      if (error) throw error;
      const formatted = (data || []).map((c: any) => {
        const sch = Array.isArray(c.schedule) ? c.schedule[0] : c.schedule;
        return {
          ...c,
          schedule: sch ? {
            ...sch,
            student: Array.isArray(sch.student) ? sch.student[0] : sch.student,
            tutor: Array.isArray(sch.tutor) ? sch.tutor[0] : sch.tutor,
          } : null,
        };
      });
      set({ pendingReschedules: formatted });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  completeSchedule: async (scheduleId, payload) => {
    set({ isLoading: true });
    try {
      const user = useAuthStore.getState().user;
      const { data: sch, error: fErr } = await db.from('schedules').select('*').eq('id', scheduleId).single();
      if (fErr) throw fErr;

      const statusMap = { present: 'completed', absent: 'absent', leave: 'leave' } as const;
      const { error: uErr } = await db.from('schedules').update({
        status: statusMap[payload.outcome],
        feedback_public: payload.feedback_public ?? null,
        feedback_internal: payload.feedback_internal ?? null,
        homework_content: payload.homework_content ?? null,
      }).eq('id', scheduleId);
      if (uErr) throw uErr;

      if (payload.outcome === 'present') {
        await deductHours(sch);
      } else if (payload.outcome === 'absent') {
        // 无故缺勤：照扣课时 + 重算风险（缺勤由 schedules.status='absent' 计分）
        await deductHours(sch);
        await recomputeRisk(sch.student_id, user?.id ?? null);
      }
      // 请假：不扣课时、不扣风险，仅状态置 leave

      await get().fetchMySchedules(sch.tutor_id);
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  cancelSchedule: async (scheduleId, reason) => {
    set({ isLoading: true });
    try {
      const user = useAuthStore.getState().user;
      const { data: sch } = await db.from('schedules').select('tutor_id').eq('id', scheduleId).single();
      const { error } = await db.from('schedules').update({ status: 'cancelled' }).eq('id', scheduleId);
      if (error) throw error;
      await db.from('schedule_changes').insert({
        schedule_id: scheduleId, requester_id: user?.id ?? null,
        reason: reason || '取消该课', status: 'approved', approver_id: user?.id ?? null,
      });
      if (sch?.tutor_id) await get().fetchMySchedules(sch.tutor_id);
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  revertSchedule: async (scheduleId) => {
    set({ isLoading: true });
    try {
      const user = useAuthStore.getState().user;
      const { data: sch, error: fErr } = await db.from('schedules').select('*').eq('id', scheduleId).single();
      if (fErr) throw fErr;
      // 出席/缺勤都扣过课时 → 退回
      if (sch.status === 'completed' || sch.status === 'absent') {
        await refundHours(sch);
      }
      const { error } = await db.from('schedules').update({ status: 'scheduled' }).eq('id', scheduleId);
      if (error) throw error;
      // 缺勤撤销后，schedules 不再是 absent → 重算把那 8 分加回来
      await recomputeRisk(sch.student_id, user?.id ?? null);
      await get().fetchMySchedules(sch.tutor_id);
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  requestReschedule: async (scheduleId, newStart, newEnd, reason) => {
    set({ isLoading: true });
    try {
      const user = useAuthStore.getState().user;
      const { error: cErr } = await db.from('schedule_changes').insert({
        schedule_id: scheduleId,
        requester_id: user?.id ?? null,
        new_start_time: newStart,
        reason: `${reason}|end:${newEnd}`, // 新结束时间随 reason 暂存（schedule_changes 无独立字段）
        status: 'pending',
        approver_id: null,
      });
      if (cErr) throw cErr;
      const { error: uErr } = await db.from('schedules').update({ status: 'rescheduling' }).eq('id', scheduleId);
      if (uErr) throw uErr;
      if (user?.id) await get().fetchMySchedules(user.id);
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  approveReschedule: async (changeId) => {
    set({ isLoading: true });
    try {
      const user = useAuthStore.getState().user;
      const { data: chg, error: fErr } = await db.from('schedule_changes').select('*').eq('id', changeId).single();
      if (fErr) throw fErr;
      // reason 里暂存了新结束时间：'原因|end:ISO'
      const endMatch = /\|end:(.+)$/.exec(chg.reason || '');
      const newEnd = endMatch ? endMatch[1] : null;
      const upd: any = { start_time: chg.new_start_time, status: 'scheduled' };
      if (newEnd) upd.end_time = newEnd;
      const { error: sErr } = await db.from('schedules').update(upd).eq('id', chg.schedule_id);
      if (sErr) throw sErr;
      await db.from('schedule_changes').update({ status: 'approved', approver_id: user?.id ?? null }).eq('id', changeId);
      await get().fetchPendingReschedules();
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  rejectReschedule: async (changeId) => {
    set({ isLoading: true });
    try {
      const user = useAuthStore.getState().user;
      const { data: chg } = await db.from('schedule_changes').select('schedule_id').eq('id', changeId).single();
      await db.from('schedule_changes').update({ status: 'rejected', approver_id: user?.id ?? null }).eq('id', changeId);
      if (chg?.schedule_id) await db.from('schedules').update({ status: 'scheduled' }).eq('id', chg.schedule_id);
      await get().fetchPendingReschedules();
      set({ isLoading: false });
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
