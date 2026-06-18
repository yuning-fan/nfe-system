import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

interface Program {
  id: number;
  name: string;
}

interface ProgramSubject {
  id: number;
  program_id: number;
  subject_name: string;
  subject_category: string;
  subject_area?: string;
  difficulty_level?: string;
  hours_per_week: number;
  sessions_per_week: number;
  max_students?: number;
  default_schedule?: { day_of_week: number; start_time: string; end_time: string; room: string }[];
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

export interface AcademicMilestone {
  id: number;
  course_id?: number | null;
  program_subject_id?: number | null;
  student_id?: string | null;
  milestone_type: 'exam' | 'assignment' | 'report_due';
  title: string;
  due_date: string;
  is_grade_recorded: boolean;
  program_subjects?: { subject_name: string };
}

export interface CourseAsset {
  id: number;
  student_id: string;
  course_id: number;
  total_hours: number;
  used_hours: number;
  valid_until?: string;
  courses?: { name: string; type: string };
  profiles?: { full_name: string };
}

export interface Course {
  id: number;
  name: string;
  type: string;
}

export interface GradeRecord {
  id: number;
  student_id: string;
  course_id?: number | null;
  program_subject_id?: number | null;
  milestone_id?: number | null;
  score: number;
  score_type: string;
  recorded_at: string;
  profiles?: { full_name: string };
  courses?: { name: string };
  program_subjects?: { subject_name: string };
  academic_milestones?: { title: string };
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
  
  // Milestones
  milestones: AcademicMilestone[];
  fetchMilestones: () => Promise<void>;
  createMilestone: (payload: Partial<AcademicMilestone>) => Promise<boolean>;
  deleteMilestone: (id: number) => Promise<boolean>;
  
  // Program Subjects Management
  createProgramSubject: (payload: Partial<ProgramSubject>) => Promise<boolean>;
  updateProgramSubject: (id: number, payload: Partial<ProgramSubject>) => Promise<boolean>;
  deleteProgramSubject: (id: number) => Promise<boolean>;

  // Course Assets Management
  courses: Course[];
  fetchCourses: () => Promise<void>;
  courseAssets: CourseAsset[];
  fetchCourseAssets: () => Promise<void>;
  topUpHours: (studentId: string, courseId: number, hours: number) => Promise<boolean>;

  // Grade Records Management
  gradeRecords: GradeRecord[];
  fetchGradeRecords: () => Promise<void>;
  addGradeRecord: (payload: Partial<GradeRecord>) => Promise<boolean>;
}

export const useAcademicStore = create<AcademicStore>((set, get) => ({
  programs: [],
  programSubjects: [],
  enrollments: [],
  selections: [],
  timetable: [],
  milestones: [],
  courses: [],
  courseAssets: [],
  gradeRecords: [],
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
          program_subjects!inner(subject_name, subject_category, hours_per_week, sessions_per_week, default_schedule)
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
        const selections = coreSubjects.map((subj: any) => ({
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
        const defaultSchedule = sel.program_subjects?.default_schedule;

        if (defaultSchedule && defaultSchedule.length > 0) {
          // Use real schedule defined by the academic department
          for (const session of defaultSchedule) {
            inserts.push({
              student_id: enrollment.student_id,
              enrollment_id: enrollment.id,
              program_subject_id: sel.program_subject_id,
              day_of_week: session.day_of_week,
              start_time: session.start_time,
              end_time: session.end_time,
              room: session.room || null,
              effective_from: new Date().toISOString().split('T')[0],
              effective_until: new Date(Date.now() + 8 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              generated_by: user?.id,
              is_confirmed: true
            });
          }
        } else {
          // Fallback to fake generation if no default schedule exists
          const sessions = sel.program_subjects?.sessions_per_week || 2;
          const duration = (sel.program_subjects?.hours_per_week || 4) / sessions;

          for (let i = 0; i < sessions; i++) {
            inserts.push({
              student_id: enrollment.student_id,
              enrollment_id: enrollment.id,
              program_subject_id: sel.program_subject_id,
              day_of_week: currentDay,
              start_time: `${currentHour.toString().padStart(2, '0')}:00`,
              end_time: `${(currentHour + Math.floor(duration)).toString().padStart(2, '0')}:00`,
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

  fetchMilestones: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('academic_milestones')
        .select(`*, program_subjects(subject_name)`)
        .order('due_date', { ascending: true });
      if (error) throw error;
      
      const formatted = (data || []).map((m: any) => ({
        ...m,
        program_subjects: Array.isArray(m.program_subjects) ? m.program_subjects[0] : m.program_subjects
      }));
      set({ milestones: formatted as any, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createMilestone: async (payload) => {
    set({ isLoading: true });
    try {
      const { error } = await (supabase as any).from('academic_milestones').insert(payload);
      if (error) throw error;
      await get().fetchMilestones();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  deleteMilestone: async (id) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.from('academic_milestones').delete().eq('id', id);
      if (error) throw error;
      await get().fetchMilestones();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  createProgramSubject: async (payload) => {
    set({ isLoading: true });
    try {
      const { error } = await (supabase as any).from('program_subjects').insert(payload);
      if (error) throw error;
      await get().fetchProgramsAndSubjects();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  updateProgramSubject: async (id, payload) => {
    set({ isLoading: true });
    try {
      const { error } = await (supabase as any).from('program_subjects').update(payload).eq('id', id);
      if (error) throw error;
      await get().fetchProgramsAndSubjects();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  deleteProgramSubject: async (id) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.from('program_subjects').delete().eq('id', id);
      if (error) throw error;
      await get().fetchProgramsAndSubjects();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  fetchCourses: async () => {
    try {
      const { data } = await supabase.from('courses').select('*');
      set({ courses: data as any || [] });
    } catch (e) {
      console.error(e);
    }
  },

  fetchCourseAssets: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('course_assets')
        .select(`*, courses(name, type), profiles(full_name)`);
      if (error) throw error;
      
      const formatted = (data || []).map((a: any) => ({
        ...a,
        courses: Array.isArray(a.courses) ? a.courses[0] : a.courses,
        profiles: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles
      }));
      set({ courseAssets: formatted as any, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  topUpHours: async (studentId, courseId, hours) => {
    set({ isLoading: true });
    try {
      // check if asset exists
      const { data: existing } = await (supabase as any)
        .from('course_assets')
        .select('*')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .single() as { data: any };

      if (existing) {
        // update
        const { error } = await (supabase as any)
          .from('course_assets')
          .update({ total_hours: Number(existing.total_hours) + Number(hours) })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // insert
        const { error } = await (supabase as any).from('course_assets').insert({
          student_id: studentId,
          course_id: courseId,
          total_hours: Number(hours),
          used_hours: 0
        });
        if (error) throw error;
      }
      
      await get().fetchCourseAssets();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  fetchGradeRecords: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('grade_records')
        .select(`*, profiles(full_name), courses(name), program_subjects(subject_name), academic_milestones(title)`)
        .order('recorded_at', { ascending: false });
      if (error) throw error;
      
      const formatted = (data || []).map((r: any) => ({
        ...r,
        profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
        courses: Array.isArray(r.courses) ? r.courses[0] : r.courses,
        program_subjects: Array.isArray(r.program_subjects) ? r.program_subjects[0] : r.program_subjects,
        academic_milestones: Array.isArray(r.academic_milestones) ? r.academic_milestones[0] : r.academic_milestones
      }));
      set({ gradeRecords: formatted as any, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addGradeRecord: async (payload) => {
    set({ isLoading: true });
    try {
      const user = useAuthStore.getState().user;
      const { error } = await (supabase as any).from('grade_records').insert({
        ...payload,
        recorded_by: user?.id
      });
      if (error) throw error;
      await get().fetchGradeRecords();
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
