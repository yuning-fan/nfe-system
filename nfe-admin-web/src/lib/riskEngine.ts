// 风险评分引擎 —— 客观指标自动算分（口径见 docs/06_Roadmap/风险评分系统_设计与TodoList.md §2）
// 设计：100 分制、扣分制、15 天滚动窗口。任何角色录入后调用 recomputeRisk(studentId) 即时重算。
import { supabase } from './supabase';

const db = supabase as any;

export const RISK_WINDOW_DAYS = 15;

// 扣分常量（一期写死，二期接系统配置页）
export const DEDUCT = {
  attendanceAbsent: 8, // 每次缺勤（晚自习/学校上课/辅导课，无医证或未留痕请假）
  gradeBelow: 6,       // 成绩低于阈值每科
  feeUnpaid: 10,       // 存在欠费
  docExpiry30: 5,
  docExpiry14: 10,
  docExpiry7: 20,
  warning1: 10,
  warning2: 20,
};
export const GRADE_THRESHOLD = 60; // 成绩低于此分计为“低于阈值”

// 出勤类型 → 中文标签（daily_checks.check_type）
const ATTEND_LABEL: Record<string, string> = {
  night_study: '晚自习缺勤',
  morning: '学校上课缺勤',
  tutoring: '辅导课缺勤',
  dorm_check: '查寝异常',
};

export type RiskLevel = 'green' | 'yellow' | 'red';

export interface RiskBreakdownItem {
  label: string;
  points: number;        // 扣分（正数表示扣了多少）
  detail?: string;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  breakdown: RiskBreakdownItem[];
  hardTriggers: string[]; // 命中的硬触发（直接红）
}

const windowStartISO = () =>
  new Date(Date.now() - RISK_WINDOW_DAYS * 86400000).toISOString();

const daysUntil = (dateStr: string) =>
  Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);

// 计算某学生当前风险（不写库）
export async function computeRisk(studentId: string): Promise<RiskResult> {
  const since = windowStartISO();
  const breakdown: RiskBreakdownItem[] = [];
  const hardTriggers: string[] = [];

  // 1) 出勤缺勤（daily_checks，按 check_type 分类）
  const { data: checks } = await db
    .from('daily_checks')
    .select('check_type, status, created_at')
    .eq('student_id', studentId)
    .eq('status', 'absent')
    .gte('created_at', since);
  const absentByType: Record<string, number> = {};
  const morningAbsentDates: string[] = [];
  for (const c of (checks || []) as any[]) {
    absentByType[c.check_type] = (absentByType[c.check_type] || 0) + 1;
    if (c.check_type === 'morning' && c.created_at) {
      morningAbsentDates.push(c.created_at.slice(0, 10));
    }
  }
  for (const [type, count] of Object.entries(absentByType)) {
    const pts = count * DEDUCT.attendanceAbsent;
    breakdown.push({ label: ATTEND_LABEL[type] || type, points: pts, detail: `${count} 次 × ${DEDUCT.attendanceAbsent}` });
  }
  // 硬触发：连续缺勤（学校上课）≥ 3 天
  if (maxConsecutiveDays(morningAbsentDates) >= 3) {
    hardTriggers.push('连续缺勤 ≥ 3 天');
  }

  // 2) 违规（violation_logs，未存档计入）
  const { data: violations } = await db
    .from('violation_logs')
    .select('violation_type, deduction_points, status, created_at')
    .eq('student_id', studentId)
    .neq('status', 'archived')
    .gte('created_at', since);
  const vSum = ((violations || []) as any[]).reduce((s, v) => s + (v.deduction_points || 0), 0);
  if (vSum > 0) {
    breakdown.push({ label: '违规登记', points: vSum, detail: `${(violations || []).length} 条` });
  }

  // 3) 警告信累计（issued / signed_onsite）
  const { data: letters } = await db
    .from('warning_letters')
    .select('warning_level, status')
    .eq('student_id', studentId)
    .in('status', ['issued', 'signed_onsite']);
  const letterCount = (letters || []).length;
  if (letterCount >= 3) {
    hardTriggers.push('警告信累计 ≥ 3 封（严重违约）');
  } else if (letterCount === 2) {
    breakdown.push({ label: '警告信累计', points: DEDUCT.warning1 + DEDUCT.warning2, detail: '2 封' });
  } else if (letterCount === 1) {
    breakdown.push({ label: '警告信累计', points: DEDUCT.warning1, detail: '1 封' });
  }

  // 4) 证件临期（取最紧迫一项）
  const { data: docs } = await db
    .from('student_documents')
    .select('expiry_date')
    .eq('student_id', studentId)
    .not('expiry_date', 'is', null);
  let minDays = Infinity;
  for (const d of (docs || []) as any[]) {
    if (d.expiry_date) minDays = Math.min(minDays, daysUntil(d.expiry_date));
  }
  if (minDays <= 7) {
    hardTriggers.push('证件 7 天内到期');
    breakdown.push({ label: '证件临期', points: DEDUCT.docExpiry7, detail: `最近 ${minDays} 天到期` });
  } else if (minDays <= 14) {
    breakdown.push({ label: '证件临期', points: DEDUCT.docExpiry14, detail: `${minDays} 天到期` });
  } else if (minDays <= 30) {
    breakdown.push({ label: '证件临期', points: DEDUCT.docExpiry30, detail: `${minDays} 天到期` });
  }

  // 5) 欠费（存在未缴即扣）
  const { data: fees } = await db
    .from('student_fees')
    .select('id, is_paid')
    .eq('student_id', studentId)
    .eq('is_paid', false);
  if ((fees || []).length > 0) {
    breakdown.push({ label: '欠费', points: DEDUCT.feeUnpaid, detail: `${(fees || []).length} 笔未缴` });
  }

  // 6) 成绩低于阈值（窗口内）
  const { data: grades } = await db
    .from('grade_records')
    .select('score, recorded_at')
    .eq('student_id', studentId)
    .lt('score', GRADE_THRESHOLD)
    .gte('recorded_at', since);
  if ((grades || []).length > 0) {
    breakdown.push({ label: '成绩低于阈值', points: (grades || []).length * DEDUCT.gradeBelow, detail: `${(grades || []).length} 科 < ${GRADE_THRESHOLD}` });
  }

  // 汇总
  const totalDeduct = breakdown.reduce((s, b) => s + b.points, 0);
  const score = Math.max(0, 100 - totalDeduct);
  const level: RiskLevel = hardTriggers.length > 0 || score < 60 ? 'red' : score < 85 ? 'yellow' : 'green';

  return { score, level, breakdown, hardTriggers };
}

// 计算并写回 students_info；如等级变化则记 log_risk_changes(trigger_type=auto)
export async function recomputeRisk(studentId: string, operatorId?: string | null): Promise<RiskResult | null> {
  try {
    const result = await computeRisk(studentId);

    const { data: cur } = await db
      .from('students_info')
      .select('risk_level, total_risk_score')
      .eq('student_id', studentId)
      .single();
    const oldLevel: RiskLevel = (cur?.risk_level as RiskLevel) || 'green';

    await db
      .from('students_info')
      .update({ risk_level: result.level, total_risk_score: result.score })
      .eq('student_id', studentId);

    if (oldLevel !== result.level) {
      await db.from('log_risk_changes').insert({
        student_id: studentId,
        old_level: oldLevel,
        new_level: result.level,
        trigger_type: 'system_auto',
        operator_id: operatorId || null,
        reason: result.hardTriggers.length
          ? `自动算分：${result.hardTriggers.join('、')}`
          : `自动算分：风险分 ${result.score}`,
      });
    }
    return result;
  } catch (e) {
    console.error('recomputeRisk failed', e);
    return null;
  }
}

// 批量重算（全校 / 定时兜底用）
export async function recomputeAll(): Promise<void> {
  const { data } = await db.from('students_info').select('student_id');
  for (const s of (data || []) as any[]) {
    await recomputeRisk(s.student_id);
  }
}

// 工具：给定 YYYY-MM-DD 日期数组，求最大连续天数
function maxConsecutiveDays(dates: string[]): number {
  if (!dates.length) return 0;
  const uniq = Array.from(new Set(dates)).sort();
  let best = 1, run = 1;
  for (let i = 1; i < uniq.length; i++) {
    const prev = new Date(uniq[i - 1]).getTime();
    const cur = new Date(uniq[i]).getTime();
    if (Math.round((cur - prev) / 86400000) === 1) { run++; best = Math.max(best, run); }
    else run = 1;
  }
  return best;
}
