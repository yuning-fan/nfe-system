// 学生「时间线」数据层 —— 把散在各表的非学业记录归一成一条时间线
//
// 口径（2026-09-29 用户定）：
//   · 点名只进异常：缺席 / 请假 / 迟到，「在场」一律不进。
//     原因：42 人 × 3 种点名 × 每周 5 天，一个学生一个月约 60 条「在场」，会把时间线冲垮。
//   · 学业不进（成绩、报告、学习跟进留在「学业跟进」tab）。
//   · DCG 有独立 tab，不重复进。
//
// 员工姓名不用 PostgREST 嵌套查：violation_logs / activity_participants 等对 profiles 有
// 多个同向外键，嵌套会踩 PGRST201（整表查询报错、页面静默变空）。改成收集 id 后单独查一次。

import { supabase } from './supabase';
import { nzDateOf } from './nzDate';
import { ATTEND_LABEL, LATE_LABEL } from './riskEngine';
import { schoolWarningCatLabel } from './schoolWarningCategories';

const db = supabase as any;

export type TimelineKind =
  | 'rate' | 'check' | 'violation' | 'warning_internal' | 'warning_school'
  | 'leave' | 'medication' | 'activity' | 'comm';

export interface TimelinePill { label: string; cls: string }

export interface TimelineEvent {
  key: string;
  kind: TimelineKind;
  date: string | null;          // 业务日期 YYYY-MM-DD（新西兰）；null = 日期未记录
  title: string;
  detail?: string | null;
  pill?: TimelinePill;
  staff?: string | null;
  attachmentUrl?: string | null;
}

export interface RatePoint {
  date: string;
  rate: number;
  note: string | null;
  staff: string | null;
}

export const KIND_META: Record<TimelineKind, TimelinePill> = {
  rate: { label: '出勤率', cls: 'p-blue' },
  check: { label: '点名异常', cls: 'p-red' },
  violation: { label: '违规', cls: 'p-red' },
  warning_internal: { label: '内部警告信', cls: 'p-red' },
  warning_school: { label: '学校警告信', cls: 'p-red' },
  leave: { label: '请假/外宿', cls: 'p-amber' },
  medication: { label: '用药', cls: 'p-green' },
  activity: { label: '活动', cls: 'p-purple' },
  comm: { label: '家校沟通', cls: 'p-blue' },
};

export const TIMELINE_FILTERS: { key: string; label: string; kinds: TimelineKind[] }[] = [
  { key: 'attendance', label: '出勤', kinds: ['rate', 'check'] },
  { key: 'discipline', label: '违规与警告', kinds: ['violation', 'warning_internal', 'warning_school'] },
  { key: 'life', label: '生活', kinds: ['leave', 'medication', 'activity'] },
  { key: 'comm', label: '沟通', kinds: ['comm'] },
];

// ATTEND_LABEL / LATE_LABEL 自带「缺勤」「迟到」后缀，请假场景要朴素名称
const CHECK_CN: Record<string, string> = {
  night_study: '晚自习', morning: '学校上课', dorm_check: '查寝', tutoring: '辅导课',
};
const LEAVE_CN: Record<string, string> = {
  sick_leave: '病假', personal_leave: '事假', overnight_stay: '外宿',
};
const APPROVAL_PILL: Record<string, TimelinePill> = {
  pending: { label: '待审批', cls: 'p-amber' },
  approved: { label: '已批准', cls: 'p-green' },
  rejected: { label: '已驳回', cls: 'p-gray' },
};
const WARNING_PILL: Record<string, TimelinePill> = {
  pending_approval: { label: '待审批', cls: 'p-amber' },
  issued: { label: '已下发', cls: 'p-red' },
  signed_onsite: { label: '已签字', cls: 'p-green' },
  rejected: { label: '已驳回', cls: 'p-gray' },
};
const PARTY_CN: Record<string, string> = {
  parent: '家长', student: '学生', school: '学校', accommodation: '住宿方',
};
const CHANNEL_CN: Record<string, string> = {
  in_app: '站内', wechat: '微信', email: '邮件', phone: '电话',
};

/** 出勤率色阶：与「官方出勤率录入」页同口径（合约线 95 / 黄灯线 97） */
export const CONTRACT_LINE = 95;
export const YELLOW_LINE = 97;
export function ratePill(rate: number): TimelinePill {
  if (rate < CONTRACT_LINE) return { label: '违反合约线', cls: 'p-red' };
  if (rate < YELLOW_LINE) return { label: '逼近合约线', cls: 'p-amber' };
  return { label: '正常', cls: 'p-green' };
}

const rowsOf = (r: any): any[] => (r && !r.error && Array.isArray(r.data) ? r.data : []);
const trimOrNull = (v: any): string | null => {
  const s = (v ?? '').toString().trim();
  return s ? s : null;
};

export interface TimelineResult {
  events: TimelineEvent[];
  ratePoints: RatePoint[];   // 按时间正序，供折线图用
  errors: string[];          // 某个来源查失败时记下来，页面提示，不让整页空白
}

export async function fetchStudentTimeline(studentId: string): Promise<TimelineResult> {
  const [rates, checks, violations, letters, leaves, meds, acts, comms] = await Promise.all([
    db.from('attendance_persuasions').select('id, rate, note, created_by, created_at').eq('student_id', studentId),
    db.from('daily_checks').select('id, check_type, status, notes, check_date, staff_id')
      .eq('student_id', studentId).neq('status', 'present'),
    db.from('violation_logs').select('id, violation_type, reason, deduction_points, status, created_at, reporter_id, attachment_url')
      .eq('student_id', studentId),
    db.from('warning_letters').select('id, source, category, warning_level, evidence_content, status, occurred_on, signed_at, created_at, issuer_id, attachment_url')
      .eq('student_id', studentId),
    db.from('leave_applications').select('id, leave_type, start_time, end_time, reason, status, approver_id, attachment_url')
      .eq('student_id', studentId),
    db.from('medication_records').select('id, medication_name, dosage, dispensed_at, dispensed_by').eq('student_id', studentId),
    db.from('activity_participants').select('id, created_at, added_by, activities(title, activity_date)').eq('student_id', studentId),
    db.from('communication_logs').select('id, contact_type, channel, content, attachment_url, created_at, staff_id').eq('student_id', studentId),
  ]);

  const errors: string[] = [];
  const named: [string, any][] = [
    ['出勤率录入', rates], ['点名', checks], ['违规', violations], ['警告信', letters],
    ['请假/外宿', leaves], ['用药', meds], ['活动', acts], ['家校沟通', comms],
  ];
  for (const [label, r] of named) if (r?.error) errors.push(`${label}：${r.error.message || '读取失败'}`);

  // 员工姓名：一次性解析
  const staffIds = new Set<string>();
  const addId = (v: any) => { if (v) staffIds.add(v); };
  rowsOf(rates).forEach(r => addId(r.created_by));
  rowsOf(checks).forEach(r => addId(r.staff_id));
  rowsOf(violations).forEach(r => addId(r.reporter_id));
  rowsOf(letters).forEach(r => addId(r.issuer_id));
  rowsOf(leaves).forEach(r => addId(r.approver_id));
  rowsOf(meds).forEach(r => addId(r.dispensed_by));
  rowsOf(acts).forEach(r => addId(r.added_by));
  rowsOf(comms).forEach(r => addId(r.staff_id));

  const nameOf: Record<string, string> = {};
  if (staffIds.size) {
    const { data } = await db.from('profiles').select('id, full_name').in('id', Array.from(staffIds));
    for (const p of data || []) nameOf[p.id] = p.full_name;
  }
  const who = (id: any): string | null => (id ? nameOf[id] || null : null);

  const events: TimelineEvent[] = [];

  // 出勤率录入（含劝说备注）
  const ratePoints: RatePoint[] = [];
  for (const r of rowsOf(rates)) {
    const d = nzDateOf(r.created_at);
    const rate = r.rate == null ? null : Number(r.rate);
    if (rate == null) continue;
    if (d) ratePoints.push({ date: d, rate, note: trimOrNull(r.note), staff: who(r.created_by) });
    events.push({
      key: `rate-${r.id}`, kind: 'rate', date: d,
      title: `官方出勤率 ${rate}%`,
      detail: trimOrNull(r.note),
      pill: ratePill(rate),
      staff: who(r.created_by),
    });
  }
  ratePoints.sort((a, b) => a.date.localeCompare(b.date));

  // 点名异常（在场不进）
  for (const c of rowsOf(checks)) {
    const type = c.check_type as string;
    const title =
      c.status === 'absent' ? (ATTEND_LABEL[type] || `${CHECK_CN[type] || type}缺勤`)
      : c.status === 'late' ? (LATE_LABEL[type] || `${CHECK_CN[type] || type}迟到`)
      : `${CHECK_CN[type] || type}请假`;
    const pill: TimelinePill =
      c.status === 'absent' ? { label: '缺席', cls: 'p-red' }
      : c.status === 'late' ? { label: '迟到', cls: 'p-blue' }
      : { label: '请假', cls: 'p-amber' };
    events.push({
      key: `check-${c.id}`, kind: 'check', date: c.check_date || null,
      title, detail: trimOrNull(c.notes), pill, staff: who(c.staff_id),
    });
  }

  // 违规
  for (const v of rowsOf(violations)) {
    events.push({
      key: `vio-${v.id}`, kind: 'violation', date: nzDateOf(v.created_at),
      title: trimOrNull(v.violation_type) || '违规',
      detail: trimOrNull(v.reason),
      pill: v.deduction_points ? { label: `扣 ${v.deduction_points} 分`, cls: 'p-red' } : undefined,
      staff: who(v.reporter_id), attachmentUrl: v.attachment_url || null,
    });
  }

  // 警告信（内部 / 学校同表，靠 source 区分）
  for (const w of rowsOf(letters)) {
    const isSchool = w.source === 'school';
    // 日期优先级：事件发生日 > 录入时间 > 签字时间。三者皆空则标「日期未记录」
    const date = w.occurred_on || nzDateOf(w.created_at) || nzDateOf(w.signed_at);
    events.push({
      key: `wl-${w.id}`,
      kind: isSchool ? 'warning_school' : 'warning_internal',
      date,
      title: isSchool
        ? `学校警告信 · ${schoolWarningCatLabel(w.category || '')}`
        : `内部警告信 · 级别 ${w.warning_level ?? '—'}`,
      detail: trimOrNull(w.evidence_content),
      pill: WARNING_PILL[w.status as string],
      staff: who(w.issuer_id), attachmentUrl: w.attachment_url || null,
    });
  }

  // 请假 / 外宿（这张表没有 created_at，用申请的开始时间当业务日期）
  for (const l of rowsOf(leaves)) {
    const start = nzDateOf(l.start_time);
    const end = nzDateOf(l.end_time);
    events.push({
      key: `leave-${l.id}`, kind: 'leave', date: start,
      title: LEAVE_CN[l.leave_type as string] || '请假',
      detail: [end && end !== start ? `至 ${end}` : null, trimOrNull(l.reason)].filter(Boolean).join(' · ') || null,
      pill: APPROVAL_PILL[l.status as string],
      staff: who(l.approver_id), attachmentUrl: l.attachment_url || null,
    });
  }

  // 用药
  for (const m of rowsOf(meds)) {
    events.push({
      key: `med-${m.id}`, kind: 'medication', date: nzDateOf(m.dispensed_at),
      title: `发药 · ${trimOrNull(m.medication_name) || '未填药名'}`,
      detail: trimOrNull(m.dosage), staff: who(m.dispensed_by),
    });
  }

  // 活动参与
  for (const a of rowsOf(acts)) {
    const act = Array.isArray(a.activities) ? a.activities[0] : a.activities;
    events.push({
      key: `act-${a.id}`, kind: 'activity',
      date: act?.activity_date || nzDateOf(a.created_at),
      title: `参加活动 · ${trimOrNull(act?.title) || '未命名活动'}`,
      staff: who(a.added_by),
    });
  }

  // 家校沟通
  for (const c of rowsOf(comms)) {
    const party = PARTY_CN[c.contact_type as string] || c.contact_type || '沟通';
    const ch = c.channel ? (CHANNEL_CN[c.channel as string] || c.channel) : null;
    events.push({
      key: `comm-${c.id}`, kind: 'comm', date: nzDateOf(c.created_at),
      title: `与${party}沟通${ch ? `（${ch}）` : ''}`,
      detail: trimOrNull(c.content), staff: who(c.staff_id),
      attachmentUrl: c.attachment_url || null,
    });
  }

  // 时间倒序；没有日期的排在最后（而不是混在中间造成误读）
  events.sort((a, b) => {
    if (!a.date && !b.date) return a.key.localeCompare(b.key);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date) || a.key.localeCompare(b.key);
  });

  return { events, ratePoints, errors };
}
