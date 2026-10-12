import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { getVisibleStudentIds } from '../lib/guardedStudents';
import { message } from 'antd';
import { useAuthStore } from './useAuthStore';
import { computeRisk } from '../lib/riskEngine';
import { computeSubject } from '../lib/gradeCalc';
import { resolveNodeDate, type IntakeDate } from '../lib/intakeDates';
import type { Json } from '../types/database.types';
import { nzToday } from '../lib/nzDate';


// 报告结构化内容（出勤报告 biweekly / 学术报告 monthly 共用超集，按 report_type 取用相应字段）
// 2026-10-11 扩充：所有新增字段均为可选 —— 旧报告的 content 快照里没有，读取处一律兜底。
export interface ReportGrade { subject: string; score: string; note: string; }
export interface ReportViolation { type: string; date: string; note: string; }

// 同批对比：基于 NFE 自己同批（同科 × 同入学批次）学生成绩实时算，不是学校官方数据
export interface CohortStats {
  n: number;                    // 同批已出分人数（含本人）
  median?: number; mean?: number; max?: number; min?: number;
  rank?: number;                // 本人名次（1=最高）
}
export const COHORT_MIN_N = 3;  // 少于 3 人不做对比：中位数/排名没有意义，写给家长反而误导

export interface ReportNode {
  title: string; weight: number; score: number | null; date?: string | null;
  milestone_id?: number;        // 回写考核说明用
  grade_id?: number | null;     // 回写改进指导/学生反思用；子项加权算出的父节点没有单条成绩
  kind?: string | null;         // exam / assignment / report_due
  cohort?: CohortStats | null;
  exam_focus?: string;          // 考察重点（按节点×批次共用）
  paper_features?: string;      // 试卷特点（按节点×批次共用）
  advice?: string;              // 改进指导（辅导老师侧）
  reflection?: string;          // 学生自我反馈与反思
}
// nodes.date = 考核日期（academic_milestones.due_date，按批次解析）
export interface ReportSubject {
  name: string; total: number | null; passMark: number; pass: boolean | null;
  intake?: string | null;       // 该科所属批次（报名 start_date）
  nodes: ReportNode[];
}
export interface ReportFeedback { date: string; subject: string; feedback: string; }
export interface ReportSession {
  date: string; subject: string; hours: number; tutor: string; status: string;
  content: string; reminders: string; homework: string; feedback: string; material: string;
}
export interface ReportUpcoming {
  date: string; subject: string; title: string; weight: number; kind: string | null;
  milestone_id?: number;
  prep?: string[];              // 已排的晚自习考前课 / 答疑，如「10/8 考前课」
}
// 升学对标：目标专业挂 uoa_programmes（GPA 9 分制，不含 EAP）
export interface ReportProgramme {
  code: string; programme: string; faculty: string; entry_year: number; entry_type: string;
  gpa_min: number | null; eap_min: number | null;
  english_requirement: string | null; english_alternative: string | null;
  intakes: string[]; intake_note: string | null; selection_required: boolean;
  required_subjects: string[]; required_subjects_mode: string | null; additional_requirements: string | null;
}
export interface ReportTarget {
  university: string | null; degree: string | null; note: string | null;
  programme?: ReportProgramme | null;
  selected_subjects?: string[];  // 本人所选科目（判断必修科目是否已选）
}
// 晚自习课程：本期与本人所选科目相关的每节课 + 当晚点名
export interface ReportNightSession {
  date: string; time: string; subject: string; kind: string; topic: string;
  teacher: string; exam: string | null; attended: string;
}
export interface ReportRatePoint { date: string; rate: number; note: string; in_period: boolean; }
export interface ReportCheck { date: string; status: string; note: string; }
export interface ReportLeave {
  type: string; start: string; end: string; duration: string; reason: string;
  status: string; approver: string; has_proof: boolean;
}
export interface ReportWarning { date: string; source: string; level: number; category: string; }

export interface ReportContent {
  // late 可选：历史报告的 content 里没有这个字段，读取处一律用 ?? 0
  attendance: { rate: number | null; official_rate?: number | null; present: number; absent: number; leave: number; late?: number };
  grades: ReportGrade[];
  tutoring: { sessions: number; hours: number; note: string };
  violations: ReportViolation[];
  subjects?: ReportSubject[];        // 学术报告：各科加权总评 + 节点分析
  tutoring_feedback?: ReportFeedback[]; // 旧版学术报告：辅导公开反馈（新版用 sessions）
  sessions?: ReportSession[];        // 学术报告：辅导课记录（内容/重难点/提醒/资料）
  upcoming?: ReportUpcoming[];       // 学术报告：未来 4 周考核日历
  night_sessions?: ReportNightSession[]; // 学术报告：晚自习课程
  target?: ReportTarget | null;      // 学术报告：升学对标
  risk_level?: string | null;        // 概览用
  rate_history?: ReportRatePoint[];  // 出勤报告：学校口径出勤率变化
  night_checks?: ReportCheck[];      // 出勤报告：晚自习异常明细（在场不列）
  leaves?: ReportLeave[];            // 出勤报告：请假明细
  warnings?: ReportWarning[];        // 出勤报告：本期警告信
  alerts?: string[];                 // 预警提示区（自动）
  comment: string; // 老师综合评价
}

export const emptyContent = (): ReportContent => ({
  attendance: { rate: null, official_rate: null, present: 0, absent: 0, leave: 0, late: 0 },
  grades: [],
  tutoring: { sessions: 0, hours: 0, note: '' },
  violations: [],
  subjects: [],
  tutoring_feedback: [],
  alerts: [],
  comment: '',
});

export interface ReportRecord {
  id: number;
  student_id: string;
  report_type: 'biweekly' | 'monthly' | 'semester';
  title: string | null;
  period_start: string | null;
  period_end: string | null;
  content: ReportContent;
  generated_by: string | null;
  generated_at: string;
  reviewer_id: string | null;
  reviewed_at: string | null;
  sent_at: string | null;
  pdf_url: string | null;
  status: 'draft' | 'reviewed' | 'sent';
  student: { full_name: string; avatar_url: string | null } | null;
}

interface ReportStore {
  reports: ReportRecord[];
  isLoading: boolean;
  fetchReports: () => Promise<void>;
  generateReports: (reportType: 'biweekly' | 'monthly', periodStart: string, periodEnd: string, studentIds?: string[]) => Promise<boolean>;
  updateReport: (id: number, patch: Partial<Pick<ReportRecord, 'content' | 'period_start' | 'period_end' | 'title'>>) => Promise<boolean>;
  deleteReport: (id: number) => Promise<boolean>;
  publishReport: (id: number) => Promise<boolean>;
  attachPdf: (id: number, key: string) => Promise<boolean>;
}

const NIGHT_KIND: Record<string, string> = { exam_prep: '考前课', review: '复习课', qa: '答疑', workshop: '写作/批改', intro: '导论课', admin: '事务' };
const LEAVE_CN: Record<string, string> = { sick_leave: '病假', personal_leave: '事假', overnight_stay: '外宿' };
const APPROVAL_CN: Record<string, string> = { pending: '待审批', approved: '已批准', rejected: '已驳回' };
export const CHECK_CN: Record<string, string> = { present: '在场', absent: '缺席', leave: '请假', late: '迟到' };

const round1 = (x: number) => Math.round(x * 10) / 10;
const addDays = (d: string, n: number) => {
  const t = new Date(`${d}T00:00:00`); t.setDate(t.getDate() + n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y); const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

// 预警提示区：复用风险引擎（硬触发/屡教不改/等级）
async function buildAlerts(studentId: string): Promise<{ alerts: string[]; level: string | null }> {
  try {
    const r = await computeRisk(studentId);
    const out: string[] = [];
    if (r.hardTriggers.length) out.push(...r.hardTriggers);
    if (r.notes && r.notes.length) out.push(...r.notes);
    if (!out.length) {
      if (r.level === 'yellow') out.push('风险等级：需关注（黄）');
      else if (r.level === 'red') out.push('风险等级：重点干预（红）');
    }
    return { alerts: out, level: r.level ?? null };
  } catch { return { alerts: [], level: null }; }
}

// 出勤明细：学校口径出勤率变化 + 晚自习 + 请假 + 警告/违规。出勤报告与学术报告（「六、出勤与纪律」）共用
async function fillAttendance(c: ReportContent, studentId: string, start: string, end: string): Promise<void> {
  const endTs = `${end}T23:59:59`;
  {
    const [{ data: info }, { data: rates }, { data: checks }, { data: leaves }, { data: letters }, { data: vios }] = await Promise.all([
      supabase.from('students_info').select('school_attendance_rate').eq('student_id', studentId).single(),
      // 取到期末为止的全部历史：变化趋势要看得到本期之前的起点
      supabase.from('attendance_persuasions').select('recorded_on, created_at, rate, note')
        .eq('student_id', studentId).lte('recorded_on', end).order('recorded_on').order('created_at'),
      // 按 check_date（业务日期）圈报告周期，补录的记录才会落在它本该属于的那一期
      supabase.from('daily_checks').select('check_date, status, notes')
        .eq('student_id', studentId).eq('check_type', 'night_study')
        .gte('check_date', start).lte('check_date', end).order('check_date'),
      // 与周期有交集的请假（跨期的也算）
      supabase.from('leave_applications')
        .select('leave_type, reason, start_time, end_time, status, attachment_url, approver:profiles!leave_applications_approver_id_fkey(full_name)')
        .eq('student_id', studentId).lte('start_time', endTs).gte('end_time', start).order('start_time'),
      supabase.from('warning_letters').select('occurred_on, source, warning_level, category, status')
        .eq('student_id', studentId).gte('occurred_on', start).lte('occurred_on', end),
      supabase.from('violation_logs').select('violation_type, reason, created_at')
        .eq('student_id', studentId).gte('created_at', start).lte('created_at', endTs),
    ]);
    c.attendance.official_rate = info?.school_attendance_rate ?? null;

    // 只保留最近 8 次：报告周期内的全部 + 之前的作为对比起点
    const pts = (rates || []).filter(r => r.rate != null).map(r => ({
      date: r.recorded_on || (r.created_at || '').slice(0, 10), rate: Number(r.rate), note: r.note || '',
      in_period: (r.recorded_on || '') >= start,
    }));
    c.rate_history = pts.slice(-Math.max(8, pts.filter(p => p.in_period).length + 1));

    const ck = checks || [];
    const cnt = (st: string) => ck.filter(x => x.status === st).length;
    const present = cnt('present'), absent = cnt('absent'), leave = cnt('leave'), late = cnt('late');
    const total = present + absent + leave + late;
    // 迟到算「在场」（人到了），计入分子与分母；报告里另行单列迟到次数
    c.attendance = { ...c.attendance, present, absent, leave, late, rate: total ? Math.round(((present + late) / total) * 100) : null };
    c.night_checks = ck.filter(x => x.status !== 'present')
      .map(x => ({ date: x.check_date, status: CHECK_CN[x.status] || x.status, note: x.notes || '' }));

    c.leaves = (leaves || []).map((l: any) => {
      const ms = new Date(l.end_time).getTime() - new Date(l.start_time).getTime();
      const hours = ms / 3600000;
      return {
        type: LEAVE_CN[l.leave_type] || l.leave_type, reason: l.reason || '',
        start: (l.start_time || '').slice(0, 16).replace('T', ' '), end: (l.end_time || '').slice(0, 16).replace('T', ' '),
        duration: hours >= 24 ? `${round1(hours / 24)} 天` : `${round1(hours)} 小时`,
        status: APPROVAL_CN[l.status] || l.status || '', approver: l.approver?.full_name || '',
        has_proof: !!l.attachment_url,
      };
    });

    // 只放已生效的：内部信需已下发/已签字，学校信未被驳回；待审批的不进家长报告
    c.warnings = (letters || [])
      .filter(w => w.source === 'school' ? w.status !== 'rejected' : (w.status === 'issued' || w.status === 'signed_onsite'))
      .map(w => ({ date: w.occurred_on || '', source: w.source === 'school' ? '学校' : 'NFE', level: w.warning_level, category: w.category || '' }));
    if (vios) c.violations = vios.map(v => ({ type: v.violation_type || '违规', date: (v.created_at || '').slice(0, 10), note: v.reason || '' }));
  }
}

// 出勤报告预填：出勤明细 + 预警
async function prefillAttendance(studentId: string, start: string, end: string): Promise<ReportContent> {
  const c = emptyContent();
  try {
    await fillAttendance(c, studentId, start, end);
    const r = await buildAlerts(studentId);
    c.alerts = r.alerts; c.risk_level = r.level;
  } catch (e) { console.warn('prefill attendance error', e); }
  return c;
}

// 学术报告预填：各科成绩 + 同批对比 + 考核说明/改进指导/学生反思 + 考核日历 + 升学对标 + 辅导课记录 + 预警
async function prefillAcademic(studentId: string, start: string, end: string): Promise<ReportContent> {
  const c = emptyContent();
  const endTs = `${end}T23:59:59`;
  try {
    const [{ data: mine }, { data: nodes }, { data: subjMeta }, { data: intakeDates }, { data: sels }, { data: info }] = await Promise.all([
      supabase.from('grade_records').select('id, milestone_id, program_subject_id, score, improvement_advice, student_reflection').eq('student_id', studentId),
      supabase.from('academic_milestones').select('id, title, parent_id, weight_percent, program_subject_id, term_no, week_no, due_date, milestone_type'),
      supabase.from('program_subjects').select('id, subject_name, pass_mark, node_dates_intake'),
      supabase.from('milestone_intake_dates').select('milestone_id, intake_start, due_date, due_time'),
      supabase.from('student_subject_selections')
        .select('program_subject_id, status, student_enrollments!student_subject_selections_enrollment_id_fkey!inner(student_id, start_date)')
        .eq('student_enrollments.student_id', studentId),
      supabase.from('students_info')
        .select('target_university, target_degree, target_requirement_note, target_programme_id')
        .eq('student_id', studentId).single(),
    ]);
    // 该生各科所属批次（选课 → 报名 start_date），节点日期 / 同批对比都按批次取
    const subjIntake = new Map<number, string>();
    for (const x of (sels || []) as any[]) {
      const en = Array.isArray(x.student_enrollments) ? x.student_enrollments[0] : x.student_enrollments;
      if (en?.start_date && !subjIntake.has(x.program_subject_id)) subjIntake.set(x.program_subject_id, en.start_date);
    }
    // 本人在读的全部科目（含尚未出分的；退课的不算）
    const selectedIds = Array.from(new Set(((sels || []) as any[]).filter(x => x.status !== 'dropped').map(x => x.program_subject_id as number)));
    const gr = mine || [];
    const subjectIds = Array.from(new Set(gr.map(g => g.program_subject_id).filter((x): x is number => x != null)));

    // 同批：同科所有选课学生 × 同批次；成绩取这些人在该科的全部记录
    const [{ data: cohortSels }, { data: cohortGrades }, { data: notes }] = subjectIds.length ? await Promise.all([
      supabase.from('student_subject_selections')
        .select('program_subject_id, student_enrollments!student_subject_selections_enrollment_id_fkey!inner(student_id, start_date)')
        .in('program_subject_id', subjectIds),
      supabase.from('grade_records').select('student_id, milestone_id, program_subject_id, score').in('program_subject_id', subjectIds),
      supabase.from('milestone_exam_notes').select('milestone_id, intake_start, exam_focus, paper_features'),
    ]) : [{ data: [] }, { data: [] }, { data: [] }] as any[];

    const allNodes = (nodes || []) as any[];
    const upcoming: ReportUpcoming[] = [];
    const horizon = addDays(end, 28);

    c.subjects = subjectIds.map(sid => {
      const meta = (subjMeta || []).find(s => s.id === sid);
      const passMark = meta?.pass_mark ?? 50;
      const intake = subjIntake.get(sid) ?? null;
      const subjectNodes = allNodes.filter(n => n.program_subject_id === sid);
      const myScore = (nodeId: number) => { const g = gr.find(x => x.milestone_id === nodeId); return g?.score != null ? Number(g.score) : null; };
      const r = computeSubject(subjectNodes, myScore, passMark);

      // 同批同学：同科、同批次、不含无批次者；每人跑一遍 computeSubject，父节点（子项加权）也能比
      const peers = new Set<string>();
      for (const x of (cohortSels || []) as any[]) {
        if (x.program_subject_id !== sid) continue;
        const en = Array.isArray(x.student_enrollments) ? x.student_enrollments[0] : x.student_enrollments;
        if (en?.student_id && intake && en.start_date === intake) peers.add(en.student_id);
      }
      peers.add(studentId);
      const peerRows = Array.from(peers).map(pid => {
        const pg = ((cohortGrades || []) as any[]).filter(g => g.student_id === pid && g.program_subject_id === sid);
        const sc = (nodeId: number) => { const g = pg.find(x => x.milestone_id === nodeId); return g?.score != null ? Number(g.score) : null; };
        return { pid, rows: computeSubject(subjectNodes, sc, passMark).rows };
      });

      const resolve = (n: any) => {
        const rd = resolveNodeDate(n, intake, (intakeDates || []) as IntakeDate[], meta?.node_dates_intake);
        // 批次不符且未设本批次日期：报告面向家长，宁可不写日期也不写错
        return rd.date_source === 'unverified' ? null : (rd.due_date || null);
      };

      const outNodes: ReportNode[] = r.rows.map((row, idx) => {
        const n = row.node as any;
        const g = gr.find(x => x.milestone_id === n.id);
        let cohort: CohortStats | null = null;
        if (row.score != null) {
          const scores = peerRows.map(p => p.rows[idx]?.score).filter((x): x is number => x != null);
          cohort = { n: scores.length };
          if (scores.length >= COHORT_MIN_N) {
            cohort = {
              n: scores.length,
              median: round1(median(scores)),
              mean: round1(scores.reduce((a, b) => a + b, 0) / scores.length),
              max: round1(Math.max(...scores)), min: round1(Math.min(...scores)),
              rank: 1 + scores.filter(x => x > (row.score as number)).length,
            };
          }
        }
        const note = intake ? ((notes || []) as any[]).find(x => x.milestone_id === n.id && x.intake_start === intake) : null;
        return {
          title: n.title, weight: row.weight, score: row.score, date: resolve(n),
          milestone_id: n.id, grade_id: g?.id ?? null, kind: n.milestone_type ?? null, cohort,
          exam_focus: note?.exam_focus || '', paper_features: note?.paper_features || '',
          advice: g?.improvement_advice || '', reflection: g?.student_reflection || '',
        };
      });

      // 考核日历：未出分、日期落在期末后 4 周内；有子项的按子项列（子项各有截止日）
      for (const row of r.rows) {
        const items = row.children.length ? row.children : [{ node: row.node, weight: row.weight, score: row.score }];
        for (const it of items) {
          if (it.score != null) continue;
          const d = resolve(it.node);
          if (d && d > end && d <= horizon) {
            upcoming.push({ date: d, subject: meta?.subject_name || '科目', title: it.node.title, weight: it.weight, kind: (it.node as any).milestone_type ?? null, milestone_id: it.node.id });
          }
        }
      }

      return { name: meta?.subject_name || '科目', total: r.total, passMark, pass: r.pass, intake, nodes: outNodes };
    });
    c.upcoming = upcoming.sort((a, b) => a.date.localeCompare(b.date));

    // 出勤与纪律：与出勤报告同口径
    await fillAttendance(c, studentId, start, end);

    // 升学对标
    let programme: ReportProgramme | null = null;
    if (info?.target_programme_id) {
      const { data: p } = await supabase.from('uoa_programmes').select('*').eq('id', info.target_programme_id).maybeSingle();
      if (p) programme = {
        code: p.code, programme: p.programme, faculty: p.faculty, entry_year: p.entry_year, entry_type: p.entry_type,
        gpa_min: p.gpa_min != null ? Number(p.gpa_min) : null, eap_min: p.eap_min != null ? Number(p.eap_min) : null,
        english_requirement: p.english_requirement, english_alternative: p.english_alternative,
        intakes: p.intakes || [], intake_note: p.intake_note, selection_required: p.selection_required,
        required_subjects: p.required_subjects || [], required_subjects_mode: p.required_subjects_mode,
        additional_requirements: p.additional_requirements,
      };
    }
    c.target = info ? {
      university: info.target_university, degree: info.target_degree, note: info.target_requirement_note, programme,
      selected_subjects: selectedIds.map(id => (subjMeta || []).find(s => s.id === id)?.subject_name).filter((x): x is string => !!x),
    } : null;

    // 晚自习课程：本期、与本人所选科目相关（不限科目的跨科答疑/事务不进个人报告）；出勤按当晚点名
    if (selectedIds.length) {
      const [{ data: ns }, { data: nightChecks }, { data: prep }] = await Promise.all([
        supabase.from('night_study_sessions')
          .select('session_date, start_time, end_time, subject, kind, topic, teacher_name, milestone:academic_milestones(title)')
          .in('program_subject_id', selectedIds).gte('session_date', start).lte('session_date', end)
          .order('session_date').order('start_time', { nullsFirst: true }),
        supabase.from('daily_checks').select('check_date, status')
          .eq('student_id', studentId).eq('check_type', 'night_study').gte('check_date', start).lte('check_date', end),
        // 考核日历上的考试，已排了哪些晚自习（不限本期）
        c.upcoming.length
          ? supabase.from('night_study_sessions').select('session_date, kind, milestone_id')
            .in('milestone_id', c.upcoming.map(u => u.milestone_id).filter((x): x is number => x != null))
          : Promise.resolve({ data: [] as { session_date: string; kind: string; milestone_id: number | null }[] }),
      ]);
      const ATT: Record<string, string> = { present: '出勤', late: '迟到', leave: '请假', absent: '缺勤' };
      const today = nzToday();
      c.night_sessions = (ns || []).map((x: any) => {
        const ck = (nightChecks || []).find(k => k.check_date === x.session_date);
        return {
          date: x.session_date,
          time: x.start_time ? `${x.start_time.slice(0, 5)}${x.end_time ? `–${x.end_time.slice(0, 5)}` : ''}` : '',
          subject: x.subject || '', kind: x.kind, topic: x.topic || '', teacher: x.teacher_name || '',
          exam: (Array.isArray(x.milestone) ? x.milestone[0] : x.milestone)?.title ?? null,
          attended: ck ? (ATT[ck.status] || ck.status) : x.session_date > today ? '—' : '未点名',
        };
      });
      for (const u of c.upcoming) {
        const hits = ((prep || []) as any[]).filter(p => p.milestone_id === u.milestone_id);
        if (hits.length) u.prep = hits.map(h => `${Number(h.session_date.slice(5, 7))}/${Number(h.session_date.slice(8, 10))} ${NIGHT_KIND[h.kind] || '晚自习'}`);
      }
    } else c.night_sessions = [];

    // 辅导课记录（周期内已上 / 缺勤的课；取消、待上不列）
    const { data: sch } = await supabase.from('schedules')
      .select('start_time, end_time, status, subject_label, lesson_content, reminders, homework_content, feedback_public, material_url, tutor:profiles!schedules_tutor_id_fkey(full_name)')
      .eq('student_id', studentId).in('status', ['completed', 'absent'])
      .gte('start_time', start).lte('start_time', endTs).order('start_time');
    c.sessions = (sch || []).map((x: any) => ({
      date: (x.start_time || '').slice(0, 10), subject: x.subject_label || '',
      hours: round1((new Date(x.end_time).getTime() - new Date(x.start_time).getTime()) / 3600000),
      tutor: x.tutor?.full_name || '', status: x.status === 'absent' ? '缺勤' : '已上',
      content: x.lesson_content || '', reminders: x.reminders || '', homework: x.homework_content || '',
      feedback: x.feedback_public || '',
      // 课件存在私有桶里，报告只写文件名；家长要原件由学管另发
      material: x.material_url ? String(x.material_url).split('/').pop() || '' : '',
    }));

    const r = await buildAlerts(studentId);
    c.alerts = r.alerts; c.risk_level = r.level;
  } catch (e) { console.warn('prefill academic error', e); }
  return c;
}

// 报告编辑器里改的「考核说明 / 改进指导 / 学生反思」回写到源表，下期报告与同批其他学生自动带出。
// 只写本次编辑里真正改动过的字段：报告 content 是生成时的快照，整份回写会把别处后来录入的内容覆盖成旧值。
export async function syncNodeNotes(before: ReportContent, after: ReportContent, operatorId: string | null): Promise<number> {
  const now = new Date().toISOString();
  const jobs: PromiseLike<{ error: any }>[] = [];
  (after.subjects || []).forEach((s, si) => s.nodes.forEach((n, ni) => {
    const o = before.subjects?.[si]?.nodes?.[ni];
    if (!o || o.milestone_id !== n.milestone_id) return;
    if (n.milestone_id && s.intake && ((o.exam_focus || '') !== (n.exam_focus || '') || (o.paper_features || '') !== (n.paper_features || ''))) {
      jobs.push(n.exam_focus || n.paper_features
        ? supabase.from('milestone_exam_notes').upsert({
            milestone_id: n.milestone_id, intake_start: s.intake, exam_focus: n.exam_focus || null,
            paper_features: n.paper_features || null, updated_by: operatorId, updated_at: now,
          }, { onConflict: 'milestone_id,intake_start' })
        : supabase.from('milestone_exam_notes').delete().eq('milestone_id', n.milestone_id).eq('intake_start', s.intake));
    }
    if (n.grade_id) {
      const patch: { improvement_advice?: string | null; student_reflection?: string | null } = {};
      if ((o.advice || '') !== (n.advice || '')) patch.improvement_advice = n.advice || null;
      if ((o.reflection || '') !== (n.reflection || '')) patch.student_reflection = n.reflection || null;
      if (Object.keys(patch).length) jobs.push(supabase.from('grade_records').update(patch).eq('id', n.grade_id));
    }
  }));
  const res = await Promise.all(jobs);
  const err = res.find(r => r.error)?.error;
  if (err) throw err;
  return jobs.length;
}

export const useReportStore = create<ReportStore>((set, get) => ({
  reports: [],
  isLoading: false,

  fetchReports: async () => {
    set({ isLoading: true });
    try {
      const visibleIds = await getVisibleStudentIds(useAuthStore.getState().profile?.id);
      let q = supabase
        .from('reports')
        .select('*, student:profiles!reports_student_id_fkey(full_name, avatar_url)')
        .order('generated_at', { ascending: false });
      if (visibleIds) q = q.in('student_id', visibleIds.length ? visibleIds : ['00000000-0000-0000-0000-000000000000']);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []).map((r: any) => ({ ...r, content: { ...emptyContent(), ...(r.content || {}) } }));
      set({ reports: rows as ReportRecord[] });
    } catch (err: any) {
      console.error('Fetch reports error:', err);
      message.error('获取报告列表失败');
    } finally {
      set({ isLoading: false });
    }
  },

  generateReports: async (reportType, periodStart, periodEnd, studentIds) => {
    try {
      const user = useAuthStore.getState().user;
      const isAcademic = reportType === 'monthly';
      const label = isAcademic ? '学术月报' : '出勤双周报';
      // 生成范围也按可见范围兜底：没显式选人时不能扫全体
      const visibleIds = await getVisibleStudentIds(user?.id);
      let q = supabase.from('profiles').select('id, full_name').eq('role', 'student');
      if (studentIds && studentIds.length) q = q.in('id', studentIds);
      else if (visibleIds) q = q.in('id', visibleIds.length ? visibleIds : ['00000000-0000-0000-0000-000000000000']);
      const { data: students, error: sErr } = await q;
      if (sErr) throw sErr;
      if (!students || students.length === 0) { message.warning('暂无在读学生'); return false; }

      // 去重：同学生 + 同周期 + 同类型已存在则跳过
      const { data: existing } = await supabase.from('reports').select('student_id')
        .eq('report_type', reportType).eq('period_start', periodStart).eq('period_end', periodEnd);
      const skip = new Set((existing || []).map((e: any) => e.student_id));
      const targets = students.filter((s: any) => !skip.has(s.id));
      if (targets.length === 0) { message.info('该周期报告已全部生成'); return false; }

      const rows = [];
      for (const s of targets) {
        const content = isAcademic
          ? await prefillAcademic(s.id, periodStart, periodEnd)
          : await prefillAttendance(s.id, periodStart, periodEnd);
        rows.push({
          student_id: s.id, report_type: reportType,
          title: `${s.full_name} · ${label}`,
          period_start: periodStart, period_end: periodEnd,
          // ReportContent 存 Json 列，接口无索引签名需定点桥接
          content: content as unknown as Json,
          status: 'draft' as const, generated_by: user?.id ?? null,
        });
      }
      const { error } = await supabase.from('reports').insert(rows);
      if (error) throw error;
      message.success(`已生成 ${rows.length} 份${label}草稿（已预填可得数据）`);
      get().fetchReports();
      return true;
    } catch (err: any) {
      console.error('Generate reports error:', err);
      message.error(err.message || '生成报告失败');
      return false;
    }
  },

  updateReport: async (id, patch) => {
    try {
      const { error } = await supabase.from('reports')
        .update({ ...patch, content: patch.content as unknown as Json }).eq('id', id);
      if (error) throw error;
      message.success('报告已保存');
      get().fetchReports();
      return true;
    } catch (err: any) {
      message.error(err.message || '保存失败');
      return false;
    }
  },

  deleteReport: async (id) => {
    try {
      const { error } = await supabase.from('reports').delete().eq('id', id);
      if (error) throw error;
      message.success('报告已删除');
      get().fetchReports();
      return true;
    } catch (err: any) {
      message.error(err.message || '删除失败');
      return false;
    }
  },

  publishReport: async (id) => {
    try {
      const user = useAuthStore.getState().user;
      const now = new Date().toISOString();
      const { error } = await supabase.from('reports')
        .update({ status: 'sent', reviewer_id: user?.id ?? null, reviewed_at: now, sent_at: now })
        .eq('id', id);
      if (error) throw error;
      message.success('报告已审核并发布');
      get().fetchReports();
      return true;
    } catch (err: any) {
      message.error(err.message || '发布失败');
      return false;
    }
  },

  attachPdf: async (id, key) => {
    try {
      const { error } = await supabase.from('reports').update({ pdf_url: key }).eq('id', id);
      if (error) throw error;
      get().fetchReports();
      return true;
    } catch (err: any) {
      message.error(err.message || '保存PDF失败');
      return false;
    }
  },
}));

// Word 抬头信息：NFE 学号 + 当前在读项目
export async function loadDocxMeta(studentId: string, studentName: string) {
  const [{ data: info }, { data: enr }] = await Promise.all([
    supabase.from('students_info').select('nfe_no').eq('student_id', studentId).maybeSingle(),
    supabase.from('v_student_current_enrollment').select('program_name').eq('student_id', studentId).maybeSingle(),
  ]);
  return {
    studentName,
    studentNo: info?.nfe_no != null ? `NFE-${String(info.nfe_no).padStart(6, '0')}` : null,
    program: enr?.program_name ?? null,
  };
}
