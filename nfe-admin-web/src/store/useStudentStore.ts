import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import type { StudentInfo } from '../types/database';

export interface ProgramOption {
  id: number;
  name: string;
  duration_months: number | null;
}

interface StudentStore {
  students: StudentInfo[];
  currentStudent: StudentInfo | null;
  programs: ProgramOption[];
  isLoading: boolean;
  error: string | null;
  fetchStudents: () => Promise<void>;
  createStudent: (p: { full_name: string; english_name?: string; gender?: string; phone?: string; school_name?: string; source_school?: string }) => Promise<{ ok: boolean; error?: string }>;
  fetchStudentById: (id: string) => Promise<void>;
  updateStudent: (id: string, payload: Record<string, any>) => Promise<boolean>;
  fetchPrograms: () => Promise<void>;
  updateEnrollment: (studentId: string, payload: Record<string, any>) => Promise<boolean>;
  clearCurrentStudent: () => void;
}

export const useStudentStore = create<StudentStore>((set, get) => ({
  students: [],
  currentStudent: null,
  programs: [],
  isLoading: false,
  error: null,

  fetchStudents: async () => {
    set({ isLoading: true, error: null });
    try {
      // Step 1: Get all student profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, phone')
        .eq('role', 'student');
      if (profileError) throw profileError;

      // Step 2: Get students_info with enrollments
      const { data: infoData, error: infoError } = await supabase
        .from('students_info')
        .select(`
          *,
          student_enrollments(
            *,
            programs(*)
          )
        `);
      if (infoError) throw infoError;

      // Step 3: Get all student_documents (for checklist + visa expiry)
      const { data: docsData } = await supabase
        .from('student_documents')
        .select('student_id, doc_type, expiry_date, status')
        .order('expiry_date', { ascending: false });

      // Step 4: 课时（按课型两个池，剩余=total_hours）
      const { data: assetsData } = await (supabase as any)
        .from('student_hour_pools')
        .select('student_id, total_hours');

      // Step 5: Get dorm assignments and school timetable for checklist
      const { data: dormsData } = await supabase
        .from('dorm_assignments')
        .select('student_id')
        .eq('is_active', true);

      const { data: timetableData } = await supabase
        .from('school_timetable')
        .select('student_id');

      // Step 6: 所有报名阶段（按 student_id 取全部，挑当前在读那段）
      const { data: enrollAll } = await supabase
        .from('student_enrollments')
        .select('id, student_id, program_id, source, start_date, end_date, status, programs(name)');
      const enrollByStudent: Record<string, any[]> = {};
      for (const e of (enrollAll as any[] || [])) {
        if (!e.student_id) continue;
        (enrollByStudent[e.student_id] ||= []).push(e);
      }
      // 当前阶段：学生"此刻所在"的那段（不是最靠后的未来段）
      // 1) 正在进行（已开学、未结束、未完成）取最近一段
      // 2) 否则取最早的"即将开学"段（待入学）
      // 3) 否则取最近一段（多为已完成/已毕业）
      const today = new Date().toISOString().slice(0, 10);
      const byStart = (a: any, b: any) => (a.start_date || '').localeCompare(b.start_date || '');
      const currentPhaseMap: Record<string, any> = {};
      for (const [sid, list] of Object.entries(enrollByStudent)) {
        const pool = list.filter(e => e.status !== 'withdrawn');
        const usable = pool.length ? pool : list;
        const inRange = usable.filter(e => e.status !== 'completed' && (!e.start_date || e.start_date <= today) && (!e.end_date || today <= e.end_date));
        const upcoming = usable.filter(e => e.status !== 'completed' && e.start_date && e.start_date > today);
        currentPhaseMap[sid] =
          inRange.length ? inRange.slice().sort(byStart).reverse()[0]
          : upcoming.length ? upcoming.slice().sort(byStart)[0]
          : usable.slice().sort(byStart).reverse()[0];
      }

      // Step 7: 费用（挂在阶段上；列表按当前阶段算缴费）
      const { data: feesData } = await supabase
        .from('student_fees')
        .select('enrollment_id, student_id, fee_type, is_paid');
      const feesByEnroll: Record<number, any[]> = {};
      for (const f of (feesData as any[] || [])) {
        (feesByEnroll[f.enrollment_id] ||= []).push(f);
      }

      // Build lookup maps
      const infoMap: Record<string, any> = {};
      for (const info of (infoData as any[] || [])) {
        infoMap[info.student_id] = info;
      }
      const docsMap: Record<string, any[]> = {};
      for (const doc of (docsData as any[] || [])) {
        if (!docsMap[doc.student_id]) docsMap[doc.student_id] = [];
        docsMap[doc.student_id].push(doc);
      }
      const visaMap: Record<string, string> = {};
      for (const doc of (docsData as any[] || [])) {
        if (doc.doc_type === 'visa' && !visaMap[doc.student_id]) {
          visaMap[doc.student_id] = doc.expiry_date;
        }
      }
      const hoursMap: Record<string, number> = {};
      for (const asset of (assetsData as any[] || [])) {
        hoursMap[asset.student_id] = (hoursMap[asset.student_id] || 0) + (Number(asset.total_hours) || 0);
      }
      const dormsSet = new Set((dormsData || []).map((d: any) => d.student_id));
      const timetableSet = new Set((timetableData || []).map((t: any) => t.student_id));

      const normalized = (profileData || []).map((p: any) => {
        const info = infoMap[p.id] || {};
        const cur = currentPhaseMap[p.id] || null;
        const curFees = cur ? (feesByEnroll[cur.id] || []) : [];
        return {
          student_id: p.id,
          ...info,
          profiles: { id: p.id, full_name: p.full_name, role: p.role, phone: p.phone },
          student_enrollments: info.student_enrollments || [],
          student_documents: docsMap[p.id] || [],
          dorm_assignments: dormsSet.has(p.id) ? [{}] : [],
          school_timetable: timetableSet.has(p.id) ? [{}] : [],
          current_phase: cur,        // 当前在读阶段（id/program/source/start_date/status/programs.name）
          current_fees: curFees,     // 当前阶段的服务费用
          visa_expiry: visaMap[p.id] || null,
          available_hours: hoursMap[p.id] ?? null,
        };
      });

      set({ students: normalized as any, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching students:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  clearCurrentStudent: () => {
    set({ currentStudent: null, error: null });
  },

  createStudent: async (p) => {
    const { data, error } = await supabase.functions.invoke('staff-admin', { body: { action: 'create_student', ...p } });
    if (error) {
      let msg = error.message;
      try { const ctx = (error as any).context; if (ctx) { const j = await ctx.json(); if (j?.error) msg = j.error; } } catch { /* ignore */ }
      return { ok: false, error: msg };
    }
    if ((data as any)?.error) return { ok: false, error: (data as any).error };
    await get().fetchStudents();
    return { ok: true };
  },

  fetchStudentById: async (id: string) => {
    set({ isLoading: true, error: null, currentStudent: null });
    try {
      // Step 1: Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, phone')
        .eq('id', id)
        .single();
      if (profileError) throw profileError;

      // Step 2: Get students_info (may not exist for new students from housing)
      const { data: infoData } = await supabase
        .from('students_info')
        .select(`
          *,
          student_enrollments(
            id,
            source,
            program_id,
            start_date,
            end_date,
            status,
            programs(id, name, track)
          )
        `)
        .eq('student_id', id)
        .maybeSingle();

      // Step 3: Get extra aggregates
      const [dormRes, warningRes, timetableRes, docsRes, assetsRes, credsRes] = await Promise.all([
        supabase.from('dorm_assignments').select('*, dorms(*)').eq('student_id', id).eq('is_active', true),
        supabase.from('warning_letters').select('*, warning_letter_violations(*)').eq('student_id', id).order('id', { ascending: false }),
        supabase.from('school_timetable').select('*, program_subjects(*)').eq('student_id', id).order('day_of_week').order('start_time'),
        supabase.from('student_documents').select('*').eq('student_id', id).order('expiry_date', { ascending: true }),
        (supabase as any).from('student_hour_pools').select('*').eq('student_id', id),
        supabase.from('student_credentials').select('*').eq('student_id', id),
      ]);

      const merged = {
        student_id: id,
        ...(infoData || {}),
        profiles: profileData,
        student_enrollments: (infoData as any)?.student_enrollments || [],
        dorm_assignments: dormRes.data || [],
        warning_letters: warningRes.data || [],
        school_timetable: timetableRes.data || [],
        student_documents: docsRes.data || [],
        hour_pools: assetsRes.data || [],
        student_credentials: credsRes.data || [],
      };

      set({ currentStudent: merged as any, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching student by ID:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  updateStudent: async (id: string, payload: Record<string, any>) => {
    set({ isLoading: true });
    try {
      // 空字符串转 null：避免 '' 写进 DATE 等列导致 22007 invalid input syntax
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(payload)) {
        clean[k] = v === '' ? null : v;
      }

      // 姓名/电话属于 profiles 表，其余属于 students_info，拆开分别写
      const PROFILE_KEYS = ['full_name', 'phone'];
      const profilePatch: Record<string, any> = {};
      const infoPatch: Record<string, any> = {};
      for (const [k, v] of Object.entries(clean)) {
        if (PROFILE_KEYS.includes(k)) profilePatch[k] = v;
        else infoPatch[k] = v;
      }
      // full_name 不允许清空（NOT NULL）：为空则不更新该字段
      if (profilePatch.full_name == null) delete profilePatch.full_name;

      if (Object.keys(profilePatch).length > 0) {
        const { error: pErr } = await supabase.from('profiles').update(profilePatch as any).eq('id', id);
        if (pErr) throw pErr;
      }

      // Upsert students_info (creates the row if it doesn't exist yet)
      const { error } = await supabase
        .from('students_info')
        .upsert({ student_id: id, ...infoPatch }, { onConflict: 'student_id' });
      if (error) throw error;

      // Refresh the current student data
      const store = useStudentStore.getState();
      await store.fetchStudentById(id);
      return true;
    } catch (error: any) {
      console.error('Error updating student:', error);
      // 注意：不要写入全局 error 状态——详情页会因 error 被置而整页替换成错误页。
      // 保存失败由调用方根据返回值用 message.error 提示即可。
      set({ isLoading: false });
      return false;
    }
  },

  fetchPrograms: async () => {
    try {
      const { data } = await supabase
        .from('programs')
        .select('id, name, duration_months')
        .eq('is_active', true)
        .order('id');
      set({ programs: (data as ProgramOption[]) || [] });
    } catch (error: any) {
      console.error('Error fetching programs:', error);
    }
  },

  updateEnrollment: async (studentId: string, payload: Record<string, any>) => {
    try {
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(payload)) clean[k] = v === '' ? null : v;

      // 已有报名记录则更新，否则新建一条
      const { data: existing } = await supabase
        .from('student_enrollments')
        .select('id')
        .eq('student_id', studentId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('student_enrollments')
          .update(clean as any)
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const user = useAuthStore.getState().user;
        const { error } = await supabase
          .from('student_enrollments')
          .insert({ student_id: studentId, ...clean, enrolled_by: user?.id ?? null } as any);
        if (error) throw error;
      }

      const store = useStudentStore.getState();
      await store.fetchStudentById(studentId);
      return true;
    } catch (error: any) {
      console.error('Error updating enrollment:', error);
      return false;
    }
  }
}));
