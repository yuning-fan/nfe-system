// 学生名单 + 学生下拉选择器的唯一来源。
// 各页面勿再自查 profiles/students_info 造名单、勿再手写 showSearch Select。
//
// 名单已按登录者的可见范围收窄（admin 全体 / 学管名下 / 生活老师名下公寓）。
// 这里是十几个页面共用的口子，收在这一处比逐页加过滤可靠 —— 新页面用了 StudentSelect
// 就自动是收窄的，不会有人忘记。
import { useEffect, useState } from 'react';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { getVisibleStudentIds } from '../../lib/guardedStudents';

export interface StudentOption {
  id: string;
  full_name: string;
}

// 模块级缓存按登录者分桶 —— 换账号后必须重查，否则会把上一个人的名单带过来
const rosterCache = new Map<string, StudentOption[]>();
const rosterInflight = new Map<string, Promise<StudentOption[]>>();

async function fetchRoster(staffId: string): Promise<StudentOption[]> {
  let inflight = rosterInflight.get(staffId);
  if (!inflight) {
    inflight = (async () => {
      const visibleIds = await getVisibleStudentIds(staffId);
      let q = supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'student')
        .order('full_name');
      // visibleIds 为 null = 不设限（admin）；为空数组 = 一个都看不到，别退化成全体
      if (visibleIds) q = q.in('id', visibleIds.length ? visibleIds : ['00000000-0000-0000-0000-000000000000']);
      const { data } = await q;
      const list = (data || []).map(p => ({ id: p.id, full_name: p.full_name }));
      rosterCache.set(staffId, list);
      rosterInflight.delete(staffId);
      return list;
    })();
    rosterInflight.set(staffId, inflight);
  }
  return inflight;
}

export function useStudentRoster(): StudentOption[] {
  const staffId = useAuthStore(s => s.profile?.id);
  const [students, setStudents] = useState<StudentOption[]>(
    staffId ? rosterCache.get(staffId) || [] : [],
  );
  useEffect(() => {
    let alive = true;
    if (!staffId) { setStudents([]); return; }
    setStudents(rosterCache.get(staffId) || []);
    fetchRoster(staffId).then(list => { if (alive) setStudents(list); });
    return () => { alive = false; };
  }, [staffId]);
  return students;
}

type StudentSelectProps = Omit<SelectProps, 'options' | 'showSearch' | 'optionFilterProp'> & {
  // 需要特殊标签（如附出勤率）时可覆盖选项，仍复用搜索/过滤行为
  options?: { label: string; value: string }[];
};

export default function StudentSelect({ options, ...rest }: StudentSelectProps) {
  const roster = useStudentRoster();
  return (
    <Select
      showSearch
      optionFilterProp="label"
      options={options ?? roster.map(s => ({ label: s.full_name, value: s.id }))}
      {...rest}
    />
  );
}
