// 阶段在读状态：正常情况按入学/结束日期自动判定；退学/暂停为人工覆盖。
export type PhaseStatusKey = 'pending' | 'active' | 'completed' | 'withdrawn' | 'suspended' | 'none';

export interface PhaseLike {
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

const PILL: Record<PhaseStatusKey, { label: string; cls: string }> = {
  pending: { label: '待入学', cls: 'p-gray' },
  active: { label: '在读', cls: 'p-green' },
  completed: { label: '已完成', cls: 'p-blue' },
  withdrawn: { label: '退学', cls: 'p-red' },
  suspended: { label: '暂停', cls: 'p-amber' },
  none: { label: '—', cls: 'p-gray' },
};

export function derivePhaseStatus(enr: PhaseLike | null | undefined) {
  if (!enr) return { key: 'none' as PhaseStatusKey, ...PILL.none };
  // 人工覆盖优先
  if (enr.status === 'withdrawn') return { key: 'withdrawn' as PhaseStatusKey, ...PILL.withdrawn };
  if (enr.status === 'suspended') return { key: 'suspended' as PhaseStatusKey, ...PILL.suspended };
  if (enr.status === 'completed') return { key: 'completed' as PhaseStatusKey, ...PILL.completed };
  // 其余按日期算
  const today = new Date().toISOString().slice(0, 10);
  if (enr.start_date && today < enr.start_date) return { key: 'pending' as PhaseStatusKey, ...PILL.pending };
  if (enr.end_date && today > enr.end_date) return { key: 'completed' as PhaseStatusKey, ...PILL.completed };
  return { key: 'active' as PhaseStatusKey, ...PILL.active };
}
