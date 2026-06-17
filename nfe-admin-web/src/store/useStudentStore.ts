import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { StudentInfo } from '../types/database';

interface StudentStore {
  students: StudentInfo[];
  currentStudent: StudentInfo | null;
  isLoading: boolean;
  error: string | null;
  fetchStudents: () => Promise<void>;
  fetchStudentById: (id: string) => Promise<void>;
  updateStudent: (id: string, payload: Record<string, any>) => Promise<boolean>;
  clearCurrentStudent: () => void;
}

export const useStudentStore = create<StudentStore>((set) => ({
  students: [],
  currentStudent: null,
  isLoading: false,
  error: null,
  
  fetchStudents: async () => {
    set({ isLoading: true, error: null });
    try {
      // Step 1: Get all student profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('role', 'student');
      if (profileError) throw profileError;

      // Step 2: Get students_info with enrollments (has unambiguous FK from students_info.student_id)
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

      // Step 3: Merge - every profile gets matched with its info (if exists)
      const infoMap: Record<string, any> = {};
      for (const info of (infoData as any[] || [])) {
        infoMap[info.student_id] = info;
      }

      const normalized = (profileData || []).map((p: any) => {
        const info = infoMap[p.id] || {};
        return {
          student_id: p.id,
          ...info,
          profiles: { id: p.id, full_name: p.full_name, role: p.role },
          student_enrollments: info.student_enrollments || []
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
            *,
            programs(*)
          )
        `)
        .eq('student_id', id)
        .maybeSingle();

      // Step 3: Get extra aggregates
      const [dormRes, warningRes, timetableRes] = await Promise.all([
        supabase.from('dorm_assignments').select('*, dorms(*)').eq('student_id', id).eq('is_active', true),
        supabase.from('warning_letters').select('*, warning_letter_violations(*)').eq('student_id', id).order('created_at', { ascending: false }),
        supabase.from('school_timetable').select('*, program_subjects(*)').eq('student_id', id).order('day_of_week').order('start_time')
      ]);

      const merged = {
        student_id: id,
        ...(infoData || {}),
        profiles: profileData,
        student_enrollments: (infoData as any)?.student_enrollments || [],
        dorm_assignments: dormRes.data || [],
        warning_letters: warningRes.data || [],
        school_timetable: timetableRes.data || [],
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
      // Upsert students_info (creates the row if it doesn't exist yet)
      const { error } = await (supabase as any)
        .from('students_info')
        .upsert({ student_id: id, ...payload }, { onConflict: 'student_id' });
      if (error) throw error;

      // Refresh the current student data
      const store = useStudentStore.getState();
      await store.fetchStudentById(id);
      return true;
    } catch (error: any) {
      console.error('Error updating student:', error);
      set({ error: error.message, isLoading: false });
      return false;
    }
  }
}));
