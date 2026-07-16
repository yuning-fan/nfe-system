// 生活老师 · 家校沟通 —— 复用学管 Communications，限名下公寓学生
import { useEffect, useState } from 'react';
import Communications from '../../pages/Communications/Communications';
import { useAuthStore } from '../../store/useAuthStore';
import { getGuardedStudentIds } from '../../lib/guardedStudents';
import { IconLoader2 } from '@tabler/icons-react';

export function LifeComms() {
  const staffId = useAuthStore(s => s.user?.id ?? null);
  const [ids, setIds] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    getGuardedStudentIds(staffId).then(r => { if (alive) setIds(r); });
    return () => { alive = false; };
  }, [staffId]);

  if (ids === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;
  }
  return <Communications restrictStudentIds={ids} />;
}
