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
      
      set({ currentStudent: (data as any) || null, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching student by ID:', error);
      set({ error: error.message, isLoading: false });
    }
  }
}));
