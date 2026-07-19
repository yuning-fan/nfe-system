// 名下公寓学生：生活老师只看自己监护公寓里的学生
// 链路：apartment_guardians(guardian_staff_id) → building_name[]
//      → dorms(building_name in ...) → dorm_id[]
//      → dorm_assignments(dorm_id in ..., is_active) → student_id[]
// 参照 store/useDcgStore.ts 的公寓→监护人链路。
//
// 角色隔离：admin/manager 等 elevated 角色统管全体，直接返回所有在读学生；
// 仅 life 等非 elevated 角色按公寓过滤。（当前统一用管理员账号测试即走全体分支。）
import { supabase } from './supabase';

const db = supabase as any;

// 视为“统管全体”的角色
const ELEVATED_ROLES = ['admin', 'manager'];

// 全体在读学生 id
async function getAllStudentIds(): Promise<string[]> {
  const { data } = await db.from('profiles').select('id').eq('role', 'student');
  return ((data || []) as any[]).map(p => p.id).filter(Boolean);
}

// 返回该员工可见学生的 profile id 列表。
// - admin/manager：全体在读学生
// - 其余角色：名下（所监护公寓）在住学生；未绑定公寓则 []。
export async function getGuardedStudentIds(staffId: string | null | undefined): Promise<string[]> {
  if (!staffId) return [];

  // 0) elevated 角色统管全体
  const { data: prof } = await db.from('profiles').select('role').eq('id', staffId).maybeSingle();
  if (prof?.role && ELEVATED_ROLES.includes(prof.role)) return getAllStudentIds();

  // 1) 该员工监护的公寓
  const { data: ags } = await db
    .from('apartment_guardians')
    .select('building_name')
    .eq('guardian_staff_id', staffId);
  const buildings = Array.from(new Set(((ags || []) as any[]).map(a => a.building_name).filter(Boolean)));
  if (buildings.length === 0) return [];

  // 2) 这些公寓下的房间
  const { data: dorms } = await db
    .from('dorms')
    .select('id')
    .in('building_name', buildings);
  const dormIds = ((dorms || []) as any[]).map(d => d.id);
  if (dormIds.length === 0) return [];

  // 3) 在住学生
  const { data: assigns } = await db
    .from('dorm_assignments')
    .select('student_id')
    .in('dorm_id', dormIds)
    .eq('is_active', true);
  return Array.from(new Set(((assigns || []) as any[]).map(a => a.student_id).filter(Boolean)));
}

export interface GuardedBuilding {
  building_name: string;
  meal_mode: string; // pickup 取餐 / cook 做饭
}

// 返回该员工可见的公寓（含餐食模式）。
// - admin/manager：全部公寓
// - 其余角色：名下监护公寓
export async function getGuardedBuildings(staffId: string | null | undefined): Promise<GuardedBuilding[]> {
  if (!staffId) return [];
  const { data: prof } = await db.from('profiles').select('role').eq('id', staffId).maybeSingle();
  const elevated = prof?.role && ELEVATED_ROLES.includes(prof.role);

  let q = db.from('apartment_guardians').select('building_name, meal_mode').order('building_name');
  if (!elevated) q = q.eq('guardian_staff_id', staffId);
  const { data } = await q;
  return ((data || []) as any[])
    .filter(a => a.building_name)
    .map(a => ({ building_name: a.building_name, meal_mode: a.meal_mode || 'pickup' }));
}

export interface GuardedDorm {
  id: number;
  building_name: string;
  room_number: string;
}

// 返回该员工可见公寓下的所有房间（供卫生检查选房间）。
// - admin/manager：全部房间；其余角色：名下公寓房间
export async function getGuardedDorms(staffId: string | null | undefined): Promise<GuardedDorm[]> {
  const buildings = await getGuardedBuildings(staffId);
  const names = buildings.map(b => b.building_name);
  if (names.length === 0) return [];
  const { data } = await db
    .from('dorms')
    .select('id, building_name, room_number')
    .in('building_name', names)
    .order('building_name')
    .order('room_number');
  return ((data || []) as any[]).map(d => ({ id: d.id, building_name: d.building_name, room_number: d.room_number }));
}

// 某公寓在住学生 id（供报餐网格列名单）
export async function getStudentIdsByBuilding(buildingName: string): Promise<string[]> {
  if (!buildingName) return [];
  const { data: dorms } = await db.from('dorms').select('id').eq('building_name', buildingName);
  const dormIds = ((dorms || []) as any[]).map(d => d.id);
  if (dormIds.length === 0) return [];
  const { data: assigns } = await db
    .from('dorm_assignments')
    .select('student_id')
    .in('dorm_id', dormIds)
    .eq('is_active', true);
  return Array.from(new Set(((assigns || []) as any[]).map(a => a.student_id).filter(Boolean)));
}
