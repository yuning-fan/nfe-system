import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { getVisibleStudentIds } from '../lib/guardedStudents';
import { resolveNodeDate, type IntakeDate } from '../lib/intakeDates';
import type { StudentInfo } from '../types/database';

export interface ProgramOption {
  id: number;
  name: string;
  duration_months: number | null;
}

export interface StaffOption { id: string; full_name: string; role: string }

// 把「当前阶段」排到数组首位——档案页各处都取 [0]。
// 口径与「学业跟进」页一致：在读区间内 > 未来最近开学 > 最近一条；withdrawn 垫底。
function pickCurrentFirst(list: any[]): any[] {
  if (list.length < 2) return list;
  const today = new Date().toISOString().slice(0, 10);
  const rank = (e: any) => {
    if (e.status === 'withdrawn') return 4;
    const started = !e.start_date || e.start_date <= today;
    const notEnded = !e.end_date || today <= e.end_date;
    if (e.status !== 'completed' && started && notEnded) return 0;   // 在读
    if (e.status !== 'completed' && !started) return 1;              // 未来开学
    return 2;                                                        // 已结束
  };
  return list.slice().sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    // 同档内：未来阶段取最早开学，其余取最近的
    const asc = rank(a) === 1;
    return asc ? (a.start_date || '').localeCompare(b.start_date || '')
               : (b.start_date || '').localeCompare(a.start_date || '');
  });
}

interface StudentStore {
  students: StudentInfo[];
  currentStudent: StudentInfo | null;
  programs: ProgramOption[];
  staff: StaffOption[];              // 非学生账号，供学管/生活老师选择器用
  isLoading: boolean;
  error: string | null;
  fetchStudents: () => Promise<void>;
  createStudent: (p: { full_name: string; english_name?: string; gender?: string; phone?: string; school_name?: string; source_school?: string }) => Promise<{ ok: boolean; error?: string }>;
  fetchStudentById: (id: string) => Promise<void>;
  updateStudent: (id: string, payload: Record<string, any>) => Promise<boolean>;
  fetchPrograms: () => Promise<void>;
  fetchStaff: () => Promise<void>;
  updateEnrollment: (studentId: string, payload: Record<string, any>) => Promise<boolean>;
  clearCurrentStudent: () => void;
}

export const useStudentStore = create<StudentStore>((set, get) => ({
  students: [],
  currentStudent: null,
  programs: [],
  staff: [],
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
      const { data: assetsData } = await supabase
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

      // 入学清单的「选课」一项看这里，不再看课表 —— 奥大学生不排课但要选课
      const { data: selectionData } = await supabase
        .from('student_subject_selections')
        .select('student_enrollments!student_subject_selections_enrollment_id_fkey!inner(student_id)')
        .neq('status', 'dropped');

      // Step 6: 所有报名阶段（按 student_id 取全部，挑当前在读那段）
      const { data: enrollAll } = await supabase
        .from('student_enrollments')
        .select('id, student_id, program_id, source, start_date, end_date, status, programs(name)');
      const enrollByStudent: Record<string, any[]> = {};
      for (const e of enrollAll || []) {
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
      for (const f of feesData || []) {
        if (f.enrollment_id == null) continue; // 无阶段归属的费用不进桶（原逻辑落入 "null" 死桶，从未被读取）
        (feesByEnroll[f.enrollment_id] ||= []).push(f);
      }

      // Build lookup maps
      const infoMap: Record<string, any> = {};
      for (const info of infoData || []) {
        infoMap[info.student_id] = info;
      }
      const docsMap: Record<string, any[]> = {};
      for (const doc of docsData || []) {
        if (!doc.student_id) continue; // 无归属学生的文档不进桶
        if (!docsMap[doc.student_id]) docsMap[doc.student_id] = [];
        docsMap[doc.student_id].push(doc);
      }
      const visaMap: Record<string, string> = {};
      for (const doc of docsData || []) {
        if (!doc.student_id) continue;
        if (doc.doc_type === 'visa' && doc.expiry_date && !visaMap[doc.student_id]) {
          visaMap[doc.student_id] = doc.expiry_date;
        }
      }
      const hoursMap: Record<string, number> = {};
      for (const asset of assetsData || []) {
        hoursMap[asset.student_id] = (hoursMap[asset.student_id] || 0) + (Number(asset.total_hours) || 0);
      }
      const dormsSet = new Set((dormsData || []).map(d => d.student_id));
      const timetableSet = new Set((timetableData || []).map(t => t.student_id));
      const selectionSet = new Set(
        ((selectionData || []) as any[])
          .map(r => (Array.isArray(r.student_enrollments) ? r.student_enrollments[0] : r.student_enrollments)?.student_id)
          .filter(Boolean),
      );

      // 员工姓名表：nz_advisor_id / life_teacher_id 是 FK，导出与列表要显示姓名
      const { data: staffData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .neq('role', 'student');
      const staffMap: Record<string, string> = {};
      for (const st of staffData || []) staffMap[st.id] = st.full_name;

      const normalized = (profileData || []).map(p => {
        const info = infoMap[p.id] || {};
        const cur = currentPhaseMap[p.id] || null;
        const curFees = cur ? (feesByEnroll[cur.id] || []) : [];
        // 全部阶段（按开学日期排序）+ 各阶段费用，供列表「阶段与服务费用」汇总
        const allPhases = (enrollByStudent[p.id] || [])
          .slice().sort(byStart)
          .map((e: any) => ({ ...e, fees: feesByEnroll[e.id] || [] }));
        return {
          student_id: p.id,
          ...info,
          profiles: { id: p.id, full_name: p.full_name, role: p.role, phone: p.phone },
          student_enrollments: info.student_enrollments || [],
          student_documents: docsMap[p.id] || [],
          dorm_assignments: dormsSet.has(p.id) ? [{}] : [],
          school_timetable: timetableSet.has(p.id) ? [{}] : [],
          has_selections: selectionSet.has(p.id),
          current_phase: cur,        // 当前在读阶段（id/program/source/start_date/status/programs.name）
          current_fees: curFees,     // 当前阶段的服务费用
          all_phases: allPhases,     // 全部阶段 + 各阶段费用
          visa_expiry: visaMap[p.id] || null,
          available_hours: hoursMap[p.id] ?? null,
          nz_advisor_name: info.nz_advisor_id ? (staffMap[info.nz_advisor_id] || null) : null,
          life_teacher_name: info.life_teacher_id ? (staffMap[info.life_teacher_id] || null) : null,
        };
      });

      // 可见范围收窄：admin 看全体，学管只看名下（nz_advisor_id），生活老师按公寓。
      // 过滤放在这里是因为列表页与学管工作台共用本 store，改一处两边同时生效。
      const visibleIds = await getVisibleStudentIds(useAuthStore.getState().profile?.id);
      // 注意主键字段名是 student_id 不是 id（这里曾误写成 s.id，导致学管过滤后恒为空）
      const visibleSet = visibleIds ? new Set(visibleIds) : null;
      const scoped = visibleSet
        ? (normalized as any[]).filter(s => visibleSet.has(s.student_id))
        : normalized;

      set({ students: scoped as any, isLoading: false });
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

  fetchStaff: async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .neq('role', 'student')
      .eq('status', 1)
      .order('full_name');
    set({ staff: (data || []) as StaffOption[] });
  },

  fetchStudentById: async (id: string) => {
    set({ isLoading: true, error: null, currentStudent: null });
    try {
      // 越权拦截：手输 /students/<别人的学生id> 时不给数据。
      // 注意这只是前端拦截，数据库放行 —— 严格隔离仍需 RLS（阶段 4）。
      const visibleIds = await getVisibleStudentIds(useAuthStore.getState().profile?.id);
      if (visibleIds && !visibleIds.includes(id)) {
        set({ error: '无权查看该学生', isLoading: false, currentStudent: null });
        return;
      }
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
      const [dormRes, enrollRes, warningRes, timetableRes, docsRes, assetsRes, credsRes, gradesRes, nodesRes, subjectsRes, selectionsRes, intakeRes] = await Promise.all([
        supabase.from('dorm_assignments').select('*, dorms(*)').eq('student_id', id).eq('is_active', true),
        // 阶段（enrollment）按 student_id 直查。原先靠 students_info 内嵌，
        // 而那条内嵌走的是 students_info.enrollment_id 外键——该列 68 人里 29 人为 NULL，
        // 于是档案页一律显示「未分配阶段」，学业 tab 也关联不上科目。
        supabase.from('student_enrollments')
          .select('id, source, program_id, start_date, end_date, status, programs(id, name, track)')
          .eq('student_id', id).order('start_date', { ascending: true }),
        supabase.from('warning_letters').select('*, warning_letter_violations(*)').eq('student_id', id).order('id', { ascending: false }),
        supabase.from('school_timetable').select('*, program_subjects(*)').eq('student_id', id).order('day_of_week').order('start_time'),
        supabase.from('student_documents').select('*').eq('student_id', id).order('expiry_date', { ascending: true }),
        supabase.from('student_hour_pools').select('*').eq('student_id', id),
        supabase.from('student_credentials').select('*').eq('student_id', id),
        supabase.from('grade_records').select('*').eq('student_id', id),
        supabase.from('academic_milestones').select('id, title, parent_id, weight_percent, program_subject_id, due_date, due_time, note, mode, is_major, term_no, week_no, milestone_type'),
        (supabase as any).from('program_subjects').select('id, subject_name, pass_mark, year, semester, description, node_dates_intake'),
        // 选课记录：学生「有哪些科目」的权威来源。
        // 原先是从 school_timetable 反推的，那样一来不排课的学生（如奥大）就等于没科目。
        supabase
          .from('student_subject_selections')
          .select('id, status, selection_type, enrollment_id, program_subject_id, program_subjects!student_subject_selections_program_subject_id_fkey(subject_name), student_enrollments!student_subject_selections_enrollment_id_fkey!inner(student_id)')
          .eq('student_enrollments.student_id', id)
          .neq('status', 'dropped'),
        (supabase as any).from('milestone_intake_dates').select('milestone_id, intake_start, due_date, due_time, note'),
      ]);

      // 考核节点日期按该生批次解析：选课 → 报名 start_date → 批次单独日期；无则默认日期，批次不符且未设置 → 待核
      const enrollStart = new Map<number, string>(((enrollRes.data || []) as any[]).map(e => [e.id, e.start_date]));
      const subjIntake = new Map<number, string>();
      for (const s of (selectionsRes.data || []) as any[]) {
        const st = enrollStart.get(s.enrollment_id);
        if (st && s.program_subject_id && !subjIntake.has(s.program_subject_id)) subjIntake.set(s.program_subject_id, st);
      }
      const baseIntakeOf = new Map<number, string | null>(((subjectsRes.data || []) as any[]).map(s => [s.id, s.node_dates_intake ?? null]));
      const intakeDates = (intakeRes.data || []) as IntakeDate[];
      const resolvedNodes = ((nodesRes.data || []) as any[]).map(n => {
        const intake = subjIntake.get(n.program_subject_id);
        if (!intake) return n;
        return { ...n, ...resolveNodeDate(n, intake, intakeDates, baseIntakeOf.get(n.program_subject_id)), intake_start: intake };
      });

      const merged = {
        student_id: id,
        ...(infoData || {}),
        profiles: profileData,
        // 当前阶段排在最前：在读区间内 > 未来最近开学 > 最近一条（与「学业跟进」页口径一致）
        student_enrollments: pickCurrentFirst(enrollRes.data || []),
        dorm_assignments: dormRes.data || [],
        warning_letters: warningRes.data || [],
        school_timetable: timetableRes.data || [],
        student_documents: docsRes.data || [],
        hour_pools: assetsRes.data || [],
        student_credentials: credsRes.data || [],
        grade_records: gradesRes.data || [],
        assessment_nodes: resolvedNodes,
        program_subjects_meta: subjectsRes.data || [],
        subject_selections: selectionsRes.data || [],
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

      // 姓名/电话属于 profiles；source(来源) 属于 student_enrollments；其余属于 students_info
      const PROFILE_KEYS = ['full_name', 'phone'];
      const ENROLL_KEYS = ['source'];
      const profilePatch: Record<string, any> = {};
      const enrollPatch: Record<string, any> = {};
      const infoPatch: Record<string, any> = {};
      for (const [k, v] of Object.entries(clean)) {
        if (PROFILE_KEYS.includes(k)) profilePatch[k] = v;
        else if (ENROLL_KEYS.includes(k)) enrollPatch[k] = v;
        else infoPatch[k] = v;
      }
      // full_name 不允许清空（NOT NULL）：为空则不更新该字段
      if (profilePatch.full_name == null) delete profilePatch.full_name;

      if (Object.keys(profilePatch).length > 0) {
        const { error: pErr } = await supabase.from('profiles').update(profilePatch as any).eq('id', id);
        if (pErr) throw pErr;
      }

      // 来源写 student_enrollments（来源是学生级属性，更新该学生所有阶段）
      if (enrollPatch.source != null) {
        const { error: eErr } = await supabase
          .from('student_enrollments')
          .update({ source: enrollPatch.source })
          .eq('student_id', id);
        if (eErr) throw eErr;
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
          .update(clean as any) // 动态字段集，无法静态收窄（Phase 8 同款定点标注）
          .eq('id', existing.id);
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
