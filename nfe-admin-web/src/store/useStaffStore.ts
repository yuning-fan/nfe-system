import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  status: number | null;
  created_at: string;
}

export const STAFF_ROLE_LABELS: Record<string, string> = {
  admin: '管理员', manager: '学管', tutor: '辅导', patrol: '巡查', life: '生活', driver: '接送',
};

interface StaffStore {
  staff: StaffMember[];
  isLoading: boolean;
  fetchStaff: () => Promise<void>;
  createStaff: (p: { email: string; password: string; full_name: string; role: string; phone?: string }) => Promise<{ ok: boolean; error?: string }>;
  updateRole: (userId: string, role: string) => Promise<boolean>;
  resetPassword: (userId: string, password: string) => Promise<boolean>;
  setStatus: (userId: string, status: number) => Promise<boolean>;
}

async function callAdmin(body: Record<string, any>): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('staff-admin', { body });
  if (error) {
    // Edge Function 返回的业务错误体（4xx）也走这里，尝试读出 message
    let msg = error.message;
    try { const ctx = (error as any).context; if (ctx) { const j = await ctx.json(); if (j?.error) msg = j.error; } } catch { /* ignore */ }
    return { ok: false, error: msg };
  }
  if (data?.error) return { ok: false, error: data.error };
  return { ok: true };
}

export const useStaffStore = create<StaffStore>((set, get) => ({
  staff: [],
  isLoading: false,

  fetchStaff: async () => {
    set({ isLoading: true });
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role, phone, status, created_at')
        .neq('role', 'student')
        .order('role')
        .order('full_name');
      set({ staff: (data as StaffMember[]) || [], isLoading: false });
    } catch (err) {
      console.error('fetchStaff error', err);
      set({ isLoading: false });
    }
  },

  createStaff: async (p) => {
    const res = await callAdmin({ action: 'create', ...p });
    if (res.ok) await get().fetchStaff();
    return res;
  },

  updateRole: async (userId, role) => {
    const res = await callAdmin({ action: 'update_role', user_id: userId, role });
    if (res.ok) await get().fetchStaff();
    return res.ok;
  },

  resetPassword: async (userId, password) => {
    const res = await callAdmin({ action: 'reset_password', user_id: userId, password });
    return res.ok;
  },

  setStatus: async (userId, status) => {
    const res = await callAdmin({ action: 'set_status', user_id: userId, status });
    if (res.ok) await get().fetchStaff();
    return res.ok;
  },
}));
