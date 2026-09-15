// 资料库「科目」「阶段」下拉选项 —— 直接读科目底表（program_subjects）与项目表（programs）。
//
// 为什么不写死：2026-09-15 之前资料库用的是一份中文清单（统计/会计…），而科目底表存英文名
// （Statistics/Accounting…），两边永远匹配不上 → 科目管理页「资料 N 份」恒为 0、点进去筛选为空。
// 改为读底表后，资料存的科目名与底表同名，底表新增科目也会自动出现在这里。
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { subjectLabel } from './subjectNames';
import { GENERAL_SUBJECT, GENERAL_STAGE } from './resourceTags';

const db = supabase as any;

export interface SelectOption { label: string; value: string }
export interface SelectGroup { label: string; options: SelectOption[] }

export function useSubjectOptions() {
  const [subjectGroups, setSubjectGroups] = useState<SelectGroup[]>([]);
  const [stageOptions, setStageOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // 分两次查再在前端拼，避开 PostgREST 嵌套推断
      const [{ data: subs }, { data: progs }] = await Promise.all([
        db.from('program_subjects').select('subject_name, program_id'),
        db.from('programs').select('id, name, is_active').order('id'),
      ]);
      if (!alive) return;

      const progName: Record<number, string> = {};
      for (const p of (progs || []) as any[]) progName[p.id] = p.name;
      const isUni = (pid: number) => /奥大|大学阶段/.test(progName[pid] || '');

      // 同一科目在多个预科项目里都有（如 Statistics），按名字去重，避免下拉里出现重复值
      const pre = new Set<string>();
      const uni = new Set<string>();
      for (const s of (subs || []) as any[]) {
        if (!s.subject_name) continue;
        (isUni(s.program_id) ? uni : pre).add(s.subject_name);
      }
      for (const n of pre) uni.delete(n);

      const toOpts = (set: Set<string>) =>
        [...set].sort((a, b) => a.localeCompare(b)).map(n => ({ label: subjectLabel(n), value: n }));
      const groups: SelectGroup[] = [];
      if (pre.size) groups.push({ label: '预科科目', options: toOpts(pre) });
      if (uni.size) groups.push({ label: '奥大课程', options: toOpts(uni) });
      groups.push({ label: '通用', options: [{ label: GENERAL_SUBJECT, value: GENERAL_SUBJECT }] });
      setSubjectGroups(groups);

      setStageOptions([
        ...((progs || []) as any[])
          .filter(p => p.is_active !== false)
          .map(p => ({ label: p.name, value: p.name })),
        { label: GENERAL_STAGE, value: GENERAL_STAGE },
      ]);
    })();
    return () => { alive = false; };
  }, []);

  return { subjectGroups, stageOptions };
}
