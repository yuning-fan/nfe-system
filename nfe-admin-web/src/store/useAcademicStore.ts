import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { getVisibleStudentIds } from '../lib/guardedStudents';
import { useAuthStore } from './useAuthStore';
import { recomputeRisk } from '../lib/riskEngine';
import type { IntakeDate } from '../lib/intakeDates';

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
  pass_mark?: number;
  year?: number | null;        // 开课学年（奥大 paper 分学期，预科留空）
  semester?: string | null;    // S1 / S2 / SS
  description?: string | null;
  node_dates_intake?: string | null; // 节点默认日期对应的入学批次（start_date）；空=不区分批次
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
  status?: string;               // pending_confirm / confirmed / dropped
  program_subjects?: ProgramSubject;
}

interface TimetableEntry {
  id: number;
  student_id: string;
  enrollment_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string | null;
  program_subject_id?: number;
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
  // 考核节点扩展
  weight_percent?: number | null;   // 顶层=占该科总评% / 子项=占父节点%
  parent_id?: number | null;        // 子项指向父 Project
  term_no?: number | null;
  week_no?: number | null;
  mode?: string | null;             // secure / non_secure / hybrid
  is_major?: boolean | null;
  due_time?: string | null;         // 当天截止时间，空=按 23:59 理解
  note?: string | null;             // 提交形式 / 大纲待确认事项
  program_subjects?: { subject_name: string };
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
  status?: string;          // graded / missed / makeup
  note?: string | null;
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
  backfillCoreSubjects: (enrollmentId: number, programId: number) => Promise<{ ok: boolean; added: number; noCore?: boolean }>;
  addElective: (enrollmentId: number, subjectId: number) => Promise<boolean>;
  removeElective: (selectionId: number) => Promise<boolean>;
  saveTimetable: (
    enrollmentId: number,
    studentId: string,
    rows: {
      program_subject_id: number; day_of_week: number; start_time: string; end_time: string;
      room: string | null; effective_from: string; effective_until: string;
    }[],
  ) => Promise<boolean>;
  fetchTimetable: (studentId?: string) => Promise<void>;
  
  // Milestones
  milestones: AcademicMilestone[];
  fetchMilestones: () => Promise<void>;
  createMilestone: (payload: Partial<AcademicMilestone>) => Promise<boolean>;
  updateMilestone: (id: number, payload: Partial<AcademicMilestone>) => Promise<boolean>;
  deleteMilestone: (id: number) => Promise<boolean>;
  // 分批次日期（milestone_intake_dates）：同科不同入学批次的 DDL
  intakeDates: IntakeDate[];
  fetchIntakeDates: () => Promise<void>;
  saveIntakeDates: (milestoneId: number, rows: { intake_start: string; due_date: string; due_time: string | null }[]) => Promise<boolean>;
  
  // Program Subjects Management
  createProgramSubject: (payload: Partial<ProgramSubject>) => Promise<boolean>;
  updateProgramSubject: (id: number, payload: Partial<ProgramSubject>) => Promise<boolean>;
  deleteProgramSubject: (id: number) => Promise<boolean>;

  // Course Assets Management
  courses: Course[];
  fetchCourses: () => Promise<void>;
  // 课时池（按课型 1对1/班科）
  hourPools: { id: number; student_id: string; course_type: string; total_hours: number; full_name?: string }[];
  fetchHourPools: () => Promise<void>;
  topUpPool: (studentId: string, courseType: 'one_on_one' | 'group_class', hours: number) => Promise<boolean>;

  // Grade Records Management
  gradeRecords: GradeRecord[];
  fetchGradeRecords: () => Promise<void>;
  addGradeRecord: (payload: Partial<GradeRecord>) => Promise<boolean>;
  updateGradeRecord: (id: number, payload: Partial<GradeRecord>) => Promise<boolean>;
  deleteGradeRecord: (id: number, studentId: string) => Promise<boolean>;
}

export const useAcademicStore = create<AcademicStore>((set, get) => ({
  programs: [],
  programSubjects: [],
  enrollments: [],
  selections: [],
  timetable: [],
  milestones: [],
  intakeDates: [],
  courses: [],
  hourPools: [],
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
        programs: programsRes.data || [],
        programSubjects: (subjectsRes.data || []) as unknown as ProgramSubject[], // 本地接口比 DB 行窄（program_id 等非空），定点收窄
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchEnrollments: async () => {
    set({ isLoading: true });
    try {
      // 可见范围：admin 为 null（不加条件），学管只见名下学生的报名
      const visibleIds = await getVisibleStudentIds(useAuthStore.getState().profile?.id);
      let enrQ = supabase
        .from('student_enrollments')
        .select(`
          *,
          profiles:profiles!student_enrollments_student_id_fkey(full_name),
          programs!inner(name, track)
        `);
      if (visibleIds) enrQ = enrQ.in('student_id', visibleIds.length ? visibleIds : ['00000000-0000-0000-0000-000000000000']);
      const { data: enrollments, error: enrErr } = await enrQ;
      if (enrErr) throw enrErr;
      
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
      const { data: enrollment, error: eError } = await supabase
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
      const { data: coreSubjects } = await supabase
        .from('program_subjects')
        .select('id')
        .eq('program_id', programId)
        .eq('subject_category', 'core');

      // 3. Insert core subjects
      if (coreSubjects && coreSubjects.length > 0) {
        const selections = coreSubjects.map(subj => ({
          enrollment_id: enrollment.id,
          program_subject_id: subj.id,
          selection_type: 'core' as const,
          status: 'confirmed' as const,
        }));
        await supabase.from('student_subject_selections').insert(selections);
      }

      await get().fetchEnrollments();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  // 给已有报名补齐必修（该项目 core 科目中尚未选的），用于导入/旧报名回填
  backfillCoreSubjects: async (enrollmentId, programId) => {
    try {
      const { data: coreSubjects } = await supabase.from('program_subjects')
        .select('id').eq('program_id', programId).eq('subject_category', 'core');
      if (!coreSubjects || coreSubjects.length === 0) return { ok: false, added: 0, noCore: true };
      const { data: existing } = await supabase.from('student_subject_selections')
        .select('program_subject_id').eq('enrollment_id', enrollmentId);
      const have = new Set((existing || []).map((e: any) => e.program_subject_id));
      const toAdd = coreSubjects.filter(c => !have.has(c.id))
        .map(c => ({ enrollment_id: enrollmentId, program_subject_id: c.id, selection_type: 'core' as const, status: 'confirmed' as const }));
      if (toAdd.length === 0) return { ok: true, added: 0 };
      const { error } = await supabase.from('student_subject_selections').insert(toAdd);
      if (error) throw error;
      await get().fetchEnrollments();
      return { ok: true, added: toAdd.length };
    } catch (err: any) {
      set({ error: err.message });
      return { ok: false, added: 0 };
    }
  },

  addElective: async (enrollmentId, subjectId) => {
    set({ isLoading: true });
    try {
      await supabase.from('student_subject_selections').insert({
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

  // 课表按学生逐节手排，不再由科目模板批量生成。
  // 原 generateTimetable 从 program_subjects.default_schedule 复制时间，导致同项目所有人课表一模一样；
  // 实际每个学生的上课时间都不同，故整段删除，改由 TimetableEditor 逐节增删改。
  saveTimetable: async (enrollmentId, studentId, rows) => {
    set({ isLoading: true });
    try {
      const user = useAuthStore.getState().user;
      // 整表替换：先删该报名下的全部课节，再写入当前编辑结果（含清空的情况）
      const { error: delErr } = await supabase.from('school_timetable').delete().eq('enrollment_id', enrollmentId);
      if (delErr) throw delErr;

      if (rows.length) {
        const { error: insErr } = await supabase.from('school_timetable').insert(
          rows.map(r => ({
            student_id: studentId,
            enrollment_id: enrollmentId,
            program_subject_id: r.program_subject_id,
            day_of_week: r.day_of_week,
            start_time: r.start_time,
            end_time: r.end_time,
            room: r.room || null,
            effective_from: r.effective_from,
            effective_until: r.effective_until,
            generated_by: user?.id,
            is_confirmed: true,
          })),
        );
        if (insErr) throw insErr;
      }

      await get().fetchTimetable();
      set({ isLoading: false });
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
      const { error } = await supabase.from('academic_milestones').insert(payload as any);
      if (error) throw error;
      await get().fetchMilestones();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },
  updateMilestone: async (id, payload) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.from('academic_milestones').update(payload as any).eq('id', id) // payload 为动态字段集，定点收窄;
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

  fetchIntakeDates: async () => {
    try {
      // 新表尚未进 database.types，走 any
      const { data, error } = await (supabase as any).from('milestone_intake_dates')
        .select('milestone_id, intake_start, due_date, due_time, note');
      if (error) throw error;
      set({ intakeDates: data || [] });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  // 该节点的批次日期以本次提交为准：有日期的 upsert，日期留空或未提交的批次删除（= 沿用默认日期）
  saveIntakeDates: async (milestoneId, rows) => {
    try {
      const db = supabase as any;
      const valid = rows.filter(r => r.intake_start && r.due_date);
      if (valid.length) {
        const { error } = await db.from('milestone_intake_dates').upsert(
          valid.map(r => ({ milestone_id: milestoneId, intake_start: r.intake_start, due_date: r.due_date, due_time: r.due_time || null })),
          { onConflict: 'milestone_id,intake_start' },
        );
        if (error) throw error;
      }
      let delQ = db.from('milestone_intake_dates').delete().eq('milestone_id', milestoneId);
      if (valid.length) delQ = delQ.not('intake_start', 'in', `(${valid.map(r => r.intake_start).join(',')})`);
      const { error: delErr } = await delQ;
      if (delErr) throw delErr;
      await get().fetchIntakeDates();
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  createProgramSubject: async (payload) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.from('program_subjects').insert(payload as any);
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
      const { error } = await supabase.from('program_subjects').update(payload as any).eq('id', id);
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
      set({ courses: data || [] });
    } catch (e) {
      console.error(e);
    }
  },

  fetchHourPools: async () => {
    try {
      const { data } = await supabase
        .from('student_hour_pools')
        .select('*, profiles(full_name)');
      const formatted = (data || []).map((p: any) => ({
        ...p,
        full_name: Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name,
      }));
      set({ hourPools: formatted });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  topUpPool: async (studentId, courseType, hours) => {
    set({ isLoading: true });
    try {
      const { data: existing } = await supabase.from('student_hour_pools').select('*')
        .eq('student_id', studentId).eq('course_type', courseType).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('student_hour_pools')
          .update({ total_hours: Number(existing.total_hours) + Number(hours) }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('student_hour_pools')
          .insert({ student_id: studentId, course_type: courseType, total_hours: Number(hours) });
        if (error) throw error;
      }
      await get().fetchHourPools();
      set({ isLoading: false });
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
        // profiles 需指明外键：grade_records 有 student_id / recorded_by 两个指向 profiles 的外键，
        // 不指定会因关系歧义导致整条查询报错、列表恒为空。
        .select(`*, profiles!student_id(full_name), courses(name), program_subjects(subject_name), academic_milestones(title)`)
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
      const { error } = await supabase.from('grade_records').insert({
        ...payload,
        recorded_by: user?.id
      } as any);
      if (error) throw error;
      // 成绩录入后即时重算该生风险（成绩低于阈值会扣分）
      if (payload.student_id) await recomputeRisk(payload.student_id as string, user?.id ?? null);
      await get().fetchGradeRecords();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  updateGradeRecord: async (id, payload) => {
    set({ isLoading: true });
    try {
      const user = useAuthStore.getState().user;
      const { error } = await supabase.from('grade_records').update(payload as any).eq('id', id) // payload 为动态字段集，定点收窄;
      if (error) throw error;
      if (payload.student_id) await recomputeRisk(payload.student_id as string, user?.id ?? null);
      await get().fetchGradeRecords();
      return true;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  deleteGradeRecord: async (id, studentId) => {
    set({ isLoading: true });
    try {
      const user = useAuthStore.getState().user;
      const { error } = await supabase.from('grade_records').delete().eq('id', id);
      if (error) throw error;
      if (studentId) await recomputeRisk(studentId, user?.id ?? null);
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
      } else {
        // 不指定学生时按登录者可见范围收窄（admin 为 null 即全体）
        const visibleIds = await getVisibleStudentIds(useAuthStore.getState().profile?.id);
        if (visibleIds) query = query.in('student_id', visibleIds.length ? visibleIds : ['00000000-0000-0000-0000-000000000000']);
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
