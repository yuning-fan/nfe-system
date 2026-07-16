// 名下公寓学生：生活老师只看自己监护公寓里的学生
// 链路：apartment_guardians(guardian_staff_id) → building_name[]
//      → dorms(building_name in ...) → dorm_id[]
//      → dorm_assignments(dorm_id in ..., is_active) → student_id[]
// 参照 store/useDcgStore.ts 的公寓→监护人链路。
import { supabase } from './supabase';

const db = supabase as any;

// 返回该员工名下（所监护公寓）在住学生的 profile id 列表；未绑定公寓则返回 []。
export async function getGuardedStudentIds(staffId: string | null | undefined): Promise<string[]> {
  if (!staffId) return [];

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
