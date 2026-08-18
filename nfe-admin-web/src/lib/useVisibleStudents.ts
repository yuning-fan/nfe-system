// 可见学生范围的 React 封装。口径见 lib/guardedStudents.ts 的 getVisibleStudentIds。
// ready 用来区分「还没查出来」和「查出来是空的」——直接用 ids 判断会在首帧误显示全体。
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { getVisibleStudentIds } from './guardedStudents';

export interface VisibleScope {
  ids: string[] | null;   // null = 不设限（admin）
  ready: boolean;
}

export function useVisibleStudents(): VisibleScope {
  const staffId = useAuthStore(s => s.profile?.id);
  const [scope, setScope] = useState<VisibleScope>({ ids: [], ready: false });

  useEffect(() => {
    let alive = true;
    if (!staffId) { setScope({ ids: [], ready: false }); return; }
    getVisibleStudentIds(staffId).then(ids => { if (alive) setScope({ ids, ready: true }); });
    return () => { alive = false; };
  }, [staffId]);

  return scope;
}

/** 按可见范围过滤一批带 student_id 的行；ids 为 null 时原样返回 */
export function scopeRows<T extends Record<string, any>>(
  rows: T[], ids: string[] | null, key: keyof T = 'student_id' as keyof T,
): T[] {
  if (!ids) return rows;
  const set = new Set(ids);
  return rows.filter(r => set.has(r[key]));
}
