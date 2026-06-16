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
      const { data, error } = await supabase
        .from('students_info')
        .select(`
          *,
          profiles(*),
          student_enrollments(
            *,
            programs(*)
          )
        `);
        
      if (error) {
        throw error;
      }
      
      set({ students: (data as any) || [], isLoading: false });
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
      const { data, error } = await supabase
        .from('students_info')
        .select(`
          *,
          profiles(*),
          student_enrollments(
            *,
            programs(*)
          )
        `)
        .eq('student_id', id)
        .single();
        
      if (error) {
        throw error;
      }

      // Fetch extra aggregates for the student detail view
      const [dormRes, warningRes, timetableRes] = await Promise.all([
        supabase.from('dorm_assignments').select('*, dorms(*)').eq('student_id', id).eq('is_active', true),
        supabase.from('warning_letters').select('*, warning_letter_violations(*)').eq('student_id', id).order('created_at', { ascending: false }),
        supabase.from('school_timetable').select('*, program_subjects(*)').eq('student_id', id).order('day_of_week').order('start_time')
      ]);

      const studentData = data as any;
      studentData.dorm_assignments = dormRes.data || [];
      studentData.warning_letters = warningRes.data || [];
      studentData.school_timetable = timetableRes.data || [];
      
      set({ currentStudent: studentData, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching student by ID:', error);
      set({ error: error.message, isLoading: false });
    }
  }
}));
