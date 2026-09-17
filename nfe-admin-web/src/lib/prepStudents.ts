// 「预科在读」学生名单 —— 晚自习点名与官方出勤率录入共用，口径只写这一处。
//
// 口径：
//   ① 排除大学阶段（奥大）项目（programs.track = 'university'）：奥大学生不纳入出勤管理
//   ② 报名当前在读（derivePhaseStatus = active：未退学/暂停/完成，且今天不早于开学、不晚于结束）
// 一人可能有多条报名（预科 + 预缴的奥大），只要有一条「非奥大且在读」就算。
// 预科衔接课程（Foundation Connect，track=other）算在内。
import { supabase } from './supabase';
import { derivePhaseStatus } from './phaseStatus';

const db = supabase as any;

export interface PrepStudent { id: string; name: string }

export async function fetchPrepActiveStudents(): Promise<PrepStudent[]> {
  const { data } = await db
    .from('student_enrollments')
    .select('student_id, start_date, end_date, status, programs!inner(track), profiles!student_enrollments_student_id_fkey(full_name)');
  const one = (v: any) => (Array.isArray(v) ? v[0] : v);
  const byStudent = new Map<string, string>();
  for (const e of (data || []) as any[]) {
    if (!e.student_id) continue;
    if (one(e.programs)?.track === 'university') continue;
    if (derivePhaseStatus(e).key !== 'active') continue;
    const name = one(e.profiles)?.full_name;
    if (name) byStudent.set(e.student_id, name);
  }
  return Array.from(byStudent, ([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
}
