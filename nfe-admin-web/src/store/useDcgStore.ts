import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

export type DcgStage =
  | 'applied' | 'conditional_offer' | 'dcg_required' | 'paid'
  | 'host_visit' | 'archived' | 'supervising' | 'completed';

// 阶段顺序（用于进度条与"推进到下一步"）
export const DCG_STAGES: { key: DcgStage; label: string; dateField?: keyof DcgCase }[] = [
  { key: 'applied', label: '已递交申请' },
  { key: 'conditional_offer', label: '收到 Conditional Offer', dateField: 'offer_date' },
  { key: 'dcg_required', label: '触发 DCG 要求' },
  { key: 'paid', label: '家长已缴费', dateField: 'payment_date' },
  { key: 'host_visit', label: 'Host Family 流程', dateField: 'host_visit_date' },
  { key: 'archived', label: '材料已存档', dateField: 'archived_date' },
  { key: 'supervising', label: '持续监督中' },
  { key: 'completed', label: '流程结束' },
];

export interface DcgCase {
  id: number;
  student_id: string;
  stage: DcgStage;
  guardian_staff_id: string | null;
  offer_date: string | null;
  payment_date: string | null;
  host_visit_date: string | null;
  archived_date: string | null;
  notes: string | null;
  created_at: string;
  guardian?: { full_name: string } | null;
}

export interface DcgReport {
  id: number;
  case_id: number;
  report_date: string;
  reporter_staff_id: string | null;
  content: string | null;
  photo_url: string | null;
  created_at: string;
  reporter?: { full_name: string } | null;
}

export interface ApartmentGuardian {
  id: number;
  building_name: string;
  guardian_staff_id: string | null;
  guardian?: { full_name: string } | null;
}

interface DcgStore {
  currentCase: DcgCase | null;
  reports: DcgReport[];
  apartmentGuardians: ApartmentGuardian[];
  isLoading: boolean;

  fetchCaseByStudent: (studentId: string) => Promise<void>;
  createCase: (studentId: string) => Promise<boolean>;
  updateStage: (caseId: number, stage: DcgStage, dateField?: keyof DcgCase) => Promise<boolean>;
  addReport: (caseId: number, payload: { report_date: string; content: string; photo_url?: string | null }) => Promise<boolean>;

  fetchApartmentGuardians: () => Promise<void>;
  setApartmentGuardian: (building: string, staffId: string | null) => Promise<boolean>;
}

const GUARDIAN_JOIN = 'guardian:profiles!dcg_cases_guardian_staff_id_fkey(full_name)';

export const useDcgStore = create<DcgStore>((set, get) => ({
  currentCase: null,
  reports: [],
  apartmentGuardians: [],
  isLoading: false,

  fetchCaseByStudent: async (studentId: string) => {
    set({ isLoading: true });
    try {
      const { data: caseData } = await supabase
        .from('dcg_cases')
        .select(`*, ${GUARDIAN_JOIN}`)
        .eq('student_id', studentId)
        .maybeSingle();

      let reports: any[] = [];
      if (caseData) {
        const { data: r } = await supabase
          .from('dcg_supervision_reports')
          .select('*, reporter:profiles!dcg_supervision_reports_reporter_staff_id_fkey(full_name)')
          .eq('case_id', caseData.id)
          .order('report_date', { ascending: false });
        reports = r || [];
      }
      set({ currentCase: (caseData as unknown as DcgCase) || null, reports, isLoading: false }); // 本地接口带 join 字段，定点收窄
    } catch (err) {
      console.error('fetchCaseByStudent error', err);
      set({ currentCase: null, reports: [], isLoading: false });
    }
  },

  createCase: async (studentId: string) => {
    try {
      // 按学生当前住宿的公寓自动带出监护人
      let guardianId: string | null = null;
      const { data: dorm } = await supabase
        .from('dorm_assignments')
        .select('dorms(building_name)')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .maybeSingle();
      const building = dorm?.dorms?.building_name;
      if (building) {
        const { data: ag } = await supabase
          .from('apartment_guardians')
          .select('guardian_staff_id')
          .eq('building_name', building)
          .maybeSingle();
        guardianId = ag?.guardian_staff_id ?? null;
      }

      const { error } = await supabase.from('dcg_cases').insert({
        student_id: studentId,
        stage: 'applied',
        guardian_staff_id: guardianId,
      });
      if (error) throw error;
      await get().fetchCaseByStudent(studentId);
      return true;
    } catch (err) {
      console.error('createCase error', err);
      return false;
    }
  },

  updateStage: async (caseId: number, stage: DcgStage, dateField?: keyof DcgCase) => {
    try {
      const patch: Record<string, any> = { stage };
      if (dateField) patch[dateField] = new Date().toISOString().slice(0, 10);
      // patch 为动态日期字段集，定点收窄
      const { error } = await supabase.from('dcg_cases').update(patch as any).eq('id', caseId);
      if (error) throw error;
      const sid = get().currentCase?.student_id;
      if (sid) await get().fetchCaseByStudent(sid);
      return true;
    } catch (err) {
      console.error('updateStage error', err);
      return false;
    }
  },

  addReport: async (caseId: number, payload) => {
    try {
      const user = useAuthStore.getState().user;
      const { error } = await supabase.from('dcg_supervision_reports').insert({
        case_id: caseId,
        report_date: payload.report_date,
        content: payload.content,
        photo_url: payload.photo_url ?? null,
        reporter_staff_id: user?.id ?? null,
      });
      if (error) throw error;
      const sid = get().currentCase?.student_id;
      if (sid) await get().fetchCaseByStudent(sid);
      return true;
    } catch (err) {
      console.error('addReport error', err);
      return false;
    }
  },

  fetchApartmentGuardians: async () => {
    try {
      const { data } = await supabase
        .from('apartment_guardians')
        .select('*, guardian:profiles!apartment_guardians_guardian_staff_id_fkey(full_name)')
        .order('building_name');
      set({ apartmentGuardians: (data as unknown as ApartmentGuardian[]) || [] }); // 本地接口带 join 字段，定点收窄
    } catch (err) {
      console.error('fetchApartmentGuardians error', err);
    }
  },

  setApartmentGuardian: async (building: string, staffId: string | null) => {
    try {
      const { error } = await supabase
        .from('apartment_guardians')
        .update({ guardian_staff_id: staffId, updated_at: new Date().toISOString() })
        .eq('building_name', building);
      if (error) throw error;
      await get().fetchApartmentGuardians();
      return true;
    } catch (err) {
      console.error('setApartmentGuardian error', err);
      return false;
    }
  },
}));

// 下次监督报告到期日：每月一次，从最近一次报告 +1 个月；无报告则从进入监督的存档日 +1 月
export function nextReportDue(reports: DcgReport[], archivedDate: string | null): string | null {
  const base = reports.length > 0 ? reports[0].report_date : archivedDate;
  if (!base) return null;
  const d = new Date(base);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}
