import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

interface Program {
  id: number;
  name: string;
}

interface ProgramSubject {
  id: number;
  subject_name: string;
  subject_category: string;
  hours_per_week: number;
  sessions_per_week: number;
}

interface Enrollment {
  id: number;
  student_id: string;
  program_id: number;
  status: string;
  profiles?: { full_name: string };
  programs?: { name: string };
}

interface SubjectSelection {
  id: number;
  enrollment_id: number;
  program_subject_id: number;
  selection_type: string;
  program_subjects?: ProgramSubject;
}

interface TimetableEntry {
  id: number;
  student_id: string;
  enrollment_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  program_subjects?: { subject_name: string };
}

interface AcademicStore {
  programs: Program[];
  programSubjects: ProgramSubject[];
  enrollments: Enrollment[];
  selections: SubjectSelection[];
  timetable: TimetableEntry[];
  isLoading: boolean;
  error: string | null;
  fetchProgramsAndSubjects: () => Promise<void>;
  fetchEnrollments: () => Promise<void>;
  createEnrollment: (studentId: string, programId: number) => Promise<boolean>;
  addElective: (enrollmentId: number, subjectId: number) => Promise<boolean>;
  removeElective: (selectionId: number) => Promise<boolean>;
  generateTimetable: (enrollmentId: number) => Promise<boolean>;
  fetchTimetable: (studentId?: string) => Promise<void>;
}

export const useAcademicStore = create<AcademicStore>((set, get) => ({
  programs: [],
  programSubjects: [],
  enrollments: [],
  selections: [],
  timetable: [],
  isLoading: false,
  error: null,

  fetchProgramsAndSubjects: async () => {
    set({ isLoading: true });
    try {
      const [programsRes, subjectsRes] = await Promise.all([
        supabase.from('programs').select('id, name'),
        supabase.from('program_subjects').select('*')
      ]);
      set({
        programs: programsRes.data as any || [],
        programSubjects: subjectsRes.data as any || [],
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchEnrollments: async () => {
    set({ isLoading: true });
    try {
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select(`
          *,
          profiles!inner(full_name),
          programs!inner(name)
        `);
      
      const { data: selections } = await supabase
        .from('student_subject_selections')
        .select(`
          *,
          program_subjects!inner(subject_name, subject_category, hours_per_week, sessions_per_week)
        `);

      const formattedEnrollments = (enrollments || []).map((e: any) => ({
        ...e,
        profiles: Array.isArray(e.profiles) ? e.profiles[0] : e.profiles,
        programs: Array.isArray(e.programs) ? e.programs[0] : e.programs
      }));

      const formattedSelections = (selections || []).map((s: any) => ({
        ...s,
        program_subjects: Array.isArray(s.program_subjects) ? s.program_subjects[0] : s.program_subjects
      }));

      set({ enrollments: formattedEnrollments, selections: formattedSelections, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createEnrollment: async (studentId, programId) => {
    set({ isLoading: true });
    try {
      const user = useAuthStore.getState().user;
      
      // 1. Insert enrollment
      const { data: enrollment, error: eError } = await (supabase as any)
        .from('student_enrollments')
        .insert({
          student_id: studentId,
          program_id: programId,
          status: 'active',
          enrolled_by: user?.id,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 8 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 8 months
        })
        .select('id')
        .single();
      if (eError) throw eError;

      // 2. Fetch core subjects for this program
      const { data: coreSubjects } = await (supabase as any)
        .from('program_subjects')
        .select('id')
        .eq('program_id', programId)
        .eq('subject_category', 'core');

      // 3. Insert core subjects
      if (coreSubjects && coreSubjects.length > 0) {
        const selections = coreSubjects.map(subj => ({
          enrollment_id: enrollment.id,
          program_subject_id: subj.id,
          selection_type: 'core',
          status: 'confirmed'
        }));
        await (supabase as any).from('student_subject_selections').insert(selections);
      }

      await get().fetchEnrollments();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  addElective: async (enrollmentId, subjectId) => {
    set({ isLoading: true });
    try {
      await (supabase as any).from('student_subject_selections').insert({
        enrollment_id: enrollmentId,
        program_subject_id: subjectId,
        selection_type: 'elective',
        status: 'confirmed'
      });
      await get().fetchEnrollments();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  removeElective: async (selectionId) => {
    set({ isLoading: true });
    try {
      await supabase.from('student_subject_selections').delete().eq('id', selectionId);
      await get().fetchEnrollments();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  generateTimetable: async (enrollmentId) => {
    set({ isLoading: true });
    try {
      // 1. Get enrollment details
      const enrollment = get().enrollments.find(e => e.id === enrollmentId);
      if (!enrollment) throw new Error('Enrollment not found');

      // 2. Get confirmed subjects
      const confirmedSelections = get().selections.filter(s => s.enrollment_id === enrollmentId);
      
      const user = useAuthStore.getState().user;
      
      // 3. Generate mock schedule (2 sessions per week per subject)
      // Hardcoded days/times for MVP simplicity
      const inserts: any[] = [];
      let currentDay = 1; // Monday
      let currentHour = 9;

      for (const sel of confirmedSelections) {
        const sessions = sel.program_subjects?.sessions_per_week || 2;
        const duration = (sel.program_subjects?.hours_per_week || 4) / sessions;

        for (let i = 0; i < sessions; i++) {
          inserts.push({
            student_id: enrollment.student_id,
            enrollment_id: enrollment.id,
            program_subject_id: sel.program_subject_id,
            day_of_week: currentDay,
            start_time: `${currentHour.toString().padStart(2, '0')}:00`,
            end_time: `${(currentHour + duration).toString().padStart(2, '0')}:00`,
            effective_from: new Date().toISOString().split('T')[0],
            effective_until: new Date(Date.now() + 8 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            generated_by: user?.id,
            is_confirmed: true
          });
          
          currentDay++;
          if (currentDay > 5) {
            currentDay = 1;
            currentHour += 2;
          }
        }
      }

      // First delete existing timetable for this enrollment
      await supabase.from('school_timetable').delete().eq('enrollment_id', enrollmentId);
      
      // Insert new
      await (supabase as any).from('school_timetable').insert(inserts);

      await get().fetchTimetable();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  fetchTimetable: async (studentId?: string) => {
    set({ isLoading: true });
    try {
      let query = supabase.from('school_timetable').select(`
        *,
        program_subjects!inner(subject_name)
      `);
      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      
      const { data } = await query;
      const formatted = (data || []).map((t: any) => ({
        ...t,
        program_subjects: Array.isArray(t.program_subjects) ? t.program_subjects[0] : t.program_subjects
      }));
      set({ timetable: formatted, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  }
}));
