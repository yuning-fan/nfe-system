// 全校学生名单 + 学生下拉选择器的唯一来源。
// 各页面勿再自查 profiles/students_info 造名单、勿再手写 showSearch Select。
import { useEffect, useState } from 'react';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { supabase } from '../../lib/supabase';

export interface StudentOption {
  id: string;
  full_name: string;
}

// 模块级缓存：先出缓存立即渲染，挂载时后台刷新（与原先各页每次 mount 自查的新鲜度一致）
let rosterCache: StudentOption[] | null = null;
let rosterInflight: Promise<StudentOption[]> | null = null;

async function fetchRoster(): Promise<StudentOption[]> {
  if (!rosterInflight) {
    rosterInflight = (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'student')
        .order('full_name');
      rosterCache = (data || []).map(p => ({ id: p.id, full_name: p.full_name }));
      rosterInflight = null;
      return rosterCache;
    })();
  }
  return rosterInflight;
}

export function useStudentRoster(): StudentOption[] {
  const [students, setStudents] = useState<StudentOption[]>(rosterCache || []);
  useEffect(() => {
    let alive = true;
    fetchRoster().then(list => { if (alive) setStudents(list); });
    return () => { alive = false; };
  }, []);
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
