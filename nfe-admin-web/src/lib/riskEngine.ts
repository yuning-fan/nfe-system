// 风险评分引擎 —— 客观指标自动算分（口径见 docs/06_Roadmap/风险评分系统_设计与TodoList.md §2）
// 设计：100 分制、扣分制、15 天滚动窗口。任何角色录入后调用 recomputeRisk(studentId) 即时重算。
import { supabase } from './supabase';
import { computeSubject } from './gradeCalc';

export const RISK_WINDOW_DAYS = 15;

// 扣分默认值（实际以 risk_config 表为准，见 loadConfig；读不到配置时回落这里）
export const DEDUCT = {
  attendanceAbsent: 8, // 每次缺勤（晚自习/学校上课/辅导课，无医证或未留痕请假）
  gradeBelow: 6,       // 每有一科加权均分低于该科过线分
  feeUnpaid: 10,       // 存在欠费
  docExpiry30: 5,
  docExpiry14: 10,
  docExpiry7: 20,
  warning1: 10,
  warning2: 20,
};
export const GRADE_THRESHOLD = 60; // 兜底阈值：仅当科目未设 pass_mark 时使用

// 出勤类型 → 中文标签（daily_checks.check_type）
export const ATTEND_LABEL: Record<string, string> = {
  night_study: '晚自习缺勤',
  morning: '学校上课缺勤',
  tutoring: '辅导课缺勤',
  dorm_check: '查寝异常',
};

export type RiskLevel = 'green' | 'yellow' | 'red';

// 重算失败通知回调——由 App 入口注册（lib 层不直接依赖 UI 组件），
// 保证点名/违规提交成功但算分失败时用户能收到提示，而非静默失败。
type RecomputeFailureHandler = (studentId: string, error: unknown) => void;
let recomputeFailureHandler: RecomputeFailureHandler | null = null;
export function setRecomputeFailureHandler(handler: RecomputeFailureHandler | null) {
  recomputeFailureHandler = handler;
}

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
  notes: string[];        // 信息性提示（屡教不改/劝说次数等，不扣分）
}

const windowStartISO = () =>
  new Date(Date.now() - RISK_WINDOW_DAYS * 86400000).toISOString();

const daysUntil = (dateStr: string) =>
  Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);

// 计算某学生当前风险（不写库）
// 读取系统配置（risk_config 表）→ key→value；读不到回落默认
async function loadConfig(): Promise<(key: string, fallback: number) => number> {
  let map: Record<string, number> = {};
  try {
    const { data } = await supabase.from('risk_config').select('key, value');
    for (const r of (data || [])) map[r.key] = Number(r.value);
  } catch (e) {
    // 有意容错：配置读不到时按代码默认参数算分，但留痕避免与配置页静默不一致
    console.warn('risk_config 读取失败，本次按代码默认参数算分', e);
  }
  return (key: string, fallback: number) => (map[key] != null ? map[key] : fallback);
}

export async function computeRisk(studentId: string): Promise<RiskResult> {
  const since = windowStartISO();
  const breakdown: RiskBreakdownItem[] = [];
  const hardTriggers: string[] = [];

  const cfg = await loadConfig();
  const C = {
    absent: cfg('deduct_attendance_absent', DEDUCT.attendanceAbsent),
    gradeBelow: cfg('deduct_grade_below', DEDUCT.gradeBelow),
    fee: cfg('deduct_fee_unpaid', DEDUCT.feeUnpaid),
    doc30: cfg('deduct_doc_30', DEDUCT.docExpiry30),
    doc14: cfg('deduct_doc_14', DEDUCT.docExpiry14),
    doc7: cfg('deduct_doc_7', DEDUCT.docExpiry7),
    w1: cfg('deduct_warning1', DEDUCT.warning1),
    w2: cfg('deduct_warning2', DEDUCT.warning2),
    gradeTh: cfg('grade_threshold', GRADE_THRESHOLD),
    greenMin: cfg('level_green_min', 85),
    redBelow: cfg('level_red_below', 60),
    contractLine: cfg('attend_contract_line', 95),
    yellowLine: cfg('attend_yellow_line', 97),
    schoolRedCnt: cfg('school_warning_red_count', 3),
    internalRedCnt: cfg('internal_warning_red_count', 3),
    consecDays: cfg('consec_absent_red_days', 3),
    docRedDays: cfg('doc_expiry_red_days', 7),
  };

  // 1) 出勤缺勤（daily_checks，按 check_type 分类）
  const { data: checks } = await supabase
    .from('daily_checks')
    .select('check_type, status, created_at')
    .eq('student_id', studentId)
    .eq('status', 'absent')
    .gte('created_at', since);
  const absentByType: Record<string, number> = {};
  const morningAbsentDates: string[] = [];
  for (const c of (checks || [])) {
    if (c.check_type === 'tutoring') continue; // 辅导课缺勤改由 schedules 状态统计（见下），避免双写
    absentByType[c.check_type] = (absentByType[c.check_type] || 0) + 1;
    if (c.check_type === 'morning' && c.created_at) {
      morningAbsentDates.push(c.created_at.slice(0, 10));
    }
  }
  for (const [type, count] of Object.entries(absentByType)) {
    breakdown.push({ label: ATTEND_LABEL[type] || type, points: count * C.absent, detail: `${count} 次 × ${C.absent}` });
  }
  // 硬触发：连续缺勤（学校上课）≥ N 天
  if (maxConsecutiveDays(morningAbsentDates) >= C.consecDays) {
    hardTriggers.push(`连续缺勤 ≥ ${C.consecDays} 天`);
  }

  // 1b) 辅导课缺勤：直接读 schedules.status='absent'（销课时记的，撤销即消失）
  const { data: tutAbsent } = await supabase
    .from('schedules')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'absent')
    .gte('start_time', since);
  const tutCount = (tutAbsent || []).length;
  if (tutCount > 0) {
    breakdown.push({ label: ATTEND_LABEL.tutoring, points: tutCount * C.absent, detail: `${tutCount} 次 × ${C.absent}` });
  }

  // 2) 违规（violation_logs，未存档计入）
  const { data: violations } = await supabase
    .from('violation_logs')
    .select('violation_type, deduction_points, status, created_at')
    .eq('student_id', studentId)
    .neq('status', 'archived')
    .gte('created_at', since);
  const vSum = (violations || []).reduce((s, v) => s + (v.deduction_points || 0), 0);
  if (vSum > 0) {
    breakdown.push({ label: '违规登记', points: vSum, detail: `${(violations || []).length} 条` });
  }

  // 3) 警告信：区分内部三步走 与 学校信
  const { data: allLetters } = await supabase
    .from('warning_letters')
    .select('warning_level, status, source')
    .eq('student_id', studentId);
  const internalCount = (allLetters || []).filter(l => l.source !== 'school' && l.status != null && ['issued', 'signed_onsite'].includes(l.status)).length;
  const schoolCount = (allLetters || []).filter(l => l.source === 'school' && l.status !== 'rejected').length;
  if (internalCount >= C.internalRedCnt) {
    hardTriggers.push(`内部警告信累计 ≥ ${C.internalRedCnt} 封（严重违约）`);
  } else if (internalCount === 2) {
    breakdown.push({ label: '内部警告信累计', points: C.w1 + C.w2, detail: '2 封' });
  } else if (internalCount === 1) {
    breakdown.push({ label: '内部警告信累计', points: C.w1, detail: '1 封' });
  }
  // 学校警告信 ≥ N 封 → 达劝退评估（亮红）
  if (schoolCount >= C.schoolRedCnt) {
    hardTriggers.push(`学校警告信 ${schoolCount} 封（达劝退评估，请人工复核）`);
  }

  // 4) 证件临期（取最紧迫一项）
  const { data: docs } = await supabase
    .from('student_documents')
    .select('expiry_date')
    .eq('student_id', studentId)
    .not('expiry_date', 'is', null);
  let minDays = Infinity;
  for (const d of (docs || [])) {
    if (d.expiry_date) minDays = Math.min(minDays, daysUntil(d.expiry_date));
  }
  if (minDays <= C.docRedDays) {
    hardTriggers.push(`证件 ${C.docRedDays} 天内到期`);
    breakdown.push({ label: '证件临期', points: C.doc7, detail: `最近 ${minDays} 天到期` });
  } else if (minDays <= 14) {
    breakdown.push({ label: '证件临期', points: C.doc14, detail: `${minDays} 天到期` });
  } else if (minDays <= 30) {
    breakdown.push({ label: '证件临期', points: C.doc30, detail: `${minDays} 天到期` });
  }

  // 5) 欠费（存在未缴即扣）
  const { data: fees } = await supabase
    .from('student_fees')
    .select('id, is_paid')
    .eq('student_id', studentId)
    .eq('is_paid', false);
  if ((fees || []).length > 0) {
    breakdown.push({ label: '欠费', points: C.fee, detail: `${(fees || []).length} 笔未缴` });
  }

  // 6) 科目低于过线分（按科目加权均分判定，累计口径 —— 不受 15 天窗口限制）
  // 说明：成绩已细化到考核节点级，单条低分不再各自扣分（否则粒度越细惩罚越重）。
  // 改为按科目算「已出成绩加权均分」，低于该科自身 pass_mark 才计一次扣分。
  const { data: gradeRows } = await supabase
    .from('grade_records')
    .select('score, milestone_id, program_subject_id')
    .eq('student_id', studentId);

  const subjectIds = Array.from(
    new Set((gradeRows || []).map(g => g.program_subject_id).filter(Boolean))
  ) as number[];

  if (subjectIds.length > 0) {
    const [{ data: nodeRows }, { data: subjRows }] = await Promise.all([
      supabase
        .from('academic_milestones')
        .select('id, parent_id, weight_percent, title, program_subject_id')
        .in('program_subject_id', subjectIds),
      supabase
        .from('program_subjects')
        .select('id, subject_name, pass_mark')
        .in('id', subjectIds),
    ]);

    const belowSubjects: string[] = [];
    for (const s of subjRows || []) {
      const nodes = (nodeRows || []).filter(n => n.program_subject_id === s.id);
      if (nodes.length === 0) continue;
      const passMark = Number(s.pass_mark ?? C.gradeTh);
      const r = computeSubject(
        nodes as any,
        (mid: number) => {
          const g = (gradeRows || []).find(x => x.milestone_id === mid);
          return g ? Number(g.score) : null;
        },
        passMark
      );
      if (r.gradedWeight <= 0) continue;                 // 该科尚无有效成绩，不参与评分
      const avg = (r.earnedPoints / r.gradedWeight) * 100;
      if (avg < passMark) {
        belowSubjects.push(`${s.subject_name} ${avg.toFixed(1)}<${passMark}`);
      }
    }

    if (belowSubjects.length > 0) {
      breakdown.push({
        label: '科目低于过线分',
        points: belowSubjects.length * C.gradeBelow,
        detail: `${belowSubjects.length} 科：${belowSubjects.join('、')}`,
      });
    }
  }

  // 7) 官方出勤率（巡查周一录入）—— 双红线：合约 95% / 学校 93%
  let attendanceYellow = false;
  const { data: info } = await supabase
    .from('students_info')
    .select('school_attendance_rate')
    .eq('student_id', studentId)
    .single();
  const rate = info?.school_attendance_rate;
  if (rate != null) {
    if (rate < C.contractLine) hardTriggers.push(`官方出勤率 ${rate}% < ${C.contractLine}%（违反合约出勤要求）`);
    else if (rate < C.yellowLine) attendanceYellow = true; // 逼近合约线，至少黄
  }

  // 8) 屡教不改：出勤反复跌破合约线次数 + 劝说次数（信息性，不扣分）
  const notes: string[] = [];
  const { data: persuasions } = await supabase
    .from('attendance_persuasions')
    .select('rate, note, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  const plist = persuasions || [];
  const dipCount = plist.filter(p => p.rate != null && Number(p.rate) < C.contractLine).length;
  const adviceCount = plist.filter(p => p.note && String(p.note).trim()).length;
  if (dipCount >= 2) notes.push(`出勤率反复跌破 ${C.contractLine}%：${dipCount} 次（屡教不改）`);
  else if (dipCount === 1) notes.push(`出勤率曾跌破 ${C.contractLine}%：1 次`);
  if (adviceCount > 0) {
    const last = plist.find(p => p.note && String(p.note).trim());
    notes.push(`已劝说 ${adviceCount} 次${last ? `（最近：${String(last.note).trim()}）` : ''}`);
  }

  // 汇总
  const totalDeduct = breakdown.reduce((s, b) => s + b.points, 0);
  const score = Math.max(0, 100 - totalDeduct);
  const level: RiskLevel = hardTriggers.length > 0 || score < C.redBelow
    ? 'red'
    : (score < C.greenMin || attendanceYellow) ? 'yellow' : 'green';

  return { score, level, breakdown, hardTriggers, notes };
}

// 计算并写回 students_info；如等级变化则记 log_risk_changes(trigger_type=auto)
export async function recomputeRisk(studentId: string, operatorId?: string | null): Promise<RiskResult | null> {
  try {
    const result = await computeRisk(studentId);

    const { data: cur } = await supabase
      .from('students_info')
      .select('risk_level, total_risk_score')
      .eq('student_id', studentId)
      .single();
    const oldLevel: RiskLevel = (cur?.risk_level as RiskLevel) || 'green';

    await supabase
      .from('students_info')
      .update({ risk_level: result.level, total_risk_score: result.score })
      .eq('student_id', studentId);

    if (oldLevel !== result.level) {
      // TODO(二期): 等级变更触发通知推送——绿→黄推学管+生活、黄→红推管理员并驾驶舱置顶（notifications 三表已建，前端未接）
      await supabase.from('log_risk_changes').insert({
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
    recomputeFailureHandler?.(studentId, e);
    return null;
  }
}

// 批量重算（全校 / 定时兜底用）
export async function recomputeAll(): Promise<void> {
  const { data } = await supabase.from('students_info').select('student_id');
  for (const s of (data || [])) {
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
