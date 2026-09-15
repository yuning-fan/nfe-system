// 考核节点「分批次日期」解析 —— 节点结构/权重按科目共用，日期可按入学批次单独设置（milestone_intake_dates）。
// 批次口径：学生该科选课所属报名（student_enrollments）的 start_date。
// 取值顺序：该批次单独日期 > 节点默认日期。
// 科目标注了默认日期对应的批次（program_subjects.node_dates_intake）且与学生批次不同、又没单独设置时 → 'unverified'，
// 前端显示「日期待核」，避免静默给出别的批次的 DDL。

export interface IntakeDate {
  milestone_id: number;
  intake_start: string;      // YYYY-MM-DD
  due_date: string;
  due_time: string | null;
  note?: string | null;
}

export type DateSource = 'base' | 'intake' | 'unverified';

export interface ResolvedDate {
  due_date: string | null;
  due_time: string | null;
  date_source: DateSource;
}

export function resolveNodeDate(
  node: { id: number; due_date?: string | null; due_time?: string | null },
  intakeStart: string | null | undefined,
  overrides: IntakeDate[],
  baseIntake: string | null | undefined,
): ResolvedDate {
  if (intakeStart) {
    const o = overrides.find(x => x.milestone_id === node.id && x.intake_start === intakeStart);
    if (o) return { due_date: o.due_date, due_time: o.due_time ?? node.due_time ?? null, date_source: 'intake' };
    if (baseIntake && baseIntake !== intakeStart) {
      return { due_date: node.due_date ?? null, due_time: node.due_time ?? null, date_source: 'unverified' };
    }
  }
  return { due_date: node.due_date ?? null, due_time: node.due_time ?? null, date_source: 'base' };
}

// 2026-07-20 → 「2026-07 批」
export const intakeLabel = (d?: string | null) => (d ? `${d.slice(0, 7)} 批` : '');
