// 全员成绩横比 —— 成绩总表页（/academic → 成绩总表 tab）的全部计算都在这里，页面只负责渲染。
//
// 口径（重要，别改成别的）：
//  · 加权均分 = 已评部分的加权均分，**复用 reportDocx.summarizeSubject**，和家长报告逐分对齐。
//    父节点子项没录全时，已录子项按「父权重 × 子占父%」先行计入（Communication 的
//    Common Test 1 按 5%×50%=2.5% 计入）。这和 gradeCalc.computeSubject 的严格口径
//    **不一样** —— 成绩录入页的「加权总评」仍用严格口径，因为半录完的父节点不该算出总评分。
//    两边数字在 Communication / Fast-track EAP 上会有出入，是故意的。
//  · 等级与 GPA 照搬 reportDocx 的 GRADE_BANDS（A+ ≥90 = 9 … C- ≥50 = 1，<50 = 0），GPA 不含 EAP。
//  · 科内排名 1 = 最高分（全页统一，风险名单里也是，所以最差的那个显示 29/29）。
//
// 数据全部来自现成 store，不新增查询：useAcademicStore 的 gradeRecords / milestones /
// programSubjects / programs，useStudentStore 的 students（后者已做可见范围收窄）。
import { computeSubject, type NodeLite } from './gradeCalc';
import { summarizeSubject, gradeOf, isEap } from './reportDocx';
import type { ReportSubject } from '../store/useReportStore';

/** 少于这么多人就没法横向比较：中位数和排名没有意义，改按过线分判断。 */
export const MIN_COHORT = 4;
/** 风险名单每科默认取几人。 */
export const DEFAULT_TAKE = 7;

export type Light = 'green' | 'yellow' | 'red' | 'gray';

/** 一个「学生 × 科目」格。 */
export interface SubjectCell {
  studentId: string;
  psId: number;
  nfeNo: number | null;
  name: string;
  advisor: string | null;
  program: string;
  subject: string;
  passMark: number;
  /** 已评部分的加权均分（报告口径）。 */
  avg: number;
  gradedWeight: number;
  topWeight: number;
  /** 已得加权分（满分 100）。 */
  earned: number;
  /** 顶层是否已评满 100%——只有评满才有真正的总评分。 */
  complete: boolean;
  light: Light;
  verdict: string;
  letter: string;
  points: number;
  detail: string;
  // 科内横比
  n: number;
  mean: number;
  median: number;
  /** 1 = 科内最高分。 */
  rank: number;
  belowMean: boolean;
  belowMedian: boolean;
  belowPass: boolean;
}

export interface StudentRow {
  studentId: string;
  nfeNo: number | null;
  name: string;
  program: string;
  advisor: string | null;
  status: string | null;
  startDate: string | null;
  /** 本人各科格子，按科目名排序后的顺序由页面自己取。 */
  cells: SubjectCell[];
  bySubject: Record<string, SubjectCell>;
  subjectCount: number;
  /** 非 EAP 且已出分的科目数——GPA 能不能横比全看这个。 */
  nonEapCount: number;
  gpa: number | null;
  avgAll: number | null;
}

export interface SubjectStat {
  program: string;
  subject: string;
  passMark: number;
  n: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  belowPass: number;
  /** 组内已评权重区间，全组一致时 lo === hi。 */
  gradedWeightLo: number;
  gradedWeightHi: number;
  comparable: boolean;
}

export interface NodeScoreRow {
  milestoneId: number;
  program: string;
  subject: string;
  title: string;
  parentTitle: string | null;
  /** 该节点占总评的权重（%）：顶层 = 自身权重；子项 = 父权重 × 子占父%。 */
  totalWeight: number;
  /** 子项的「占父节点%」，顶层节点为 null。 */
  ownWeight: number | null;
  dueDate: string | null;
  termNo: number | null;
  weekNo: number | null;
  studentId: string;
  nfeNo: number | null;
  name: string;
  advisor: string | null;
  score: number;
  missed: boolean;
  nodeMean: number;
  /** 1 = 该节点最高分。 */
  nodeRank: number;
  nodeN: number;
  recordedAt: string | null;
  belowPass: boolean;
}

export interface NodeStat {
  milestoneId: number;
  program: string;
  subject: string;
  title: string;
  parentTitle: string | null;
  totalWeight: number;
  dueDate: string | null;
  termNo: number | null;
  weekNo: number | null;
  passMark: number;
  n: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  belowPass: number;
}

export interface OverviewInput {
  students: any[];
  gradeRecords: any[];
  milestones: any[];
  programSubjects: any[];
  programs: { id: number; name: string }[];
}

export interface GradeOverview {
  cells: SubjectCell[];
  students: StudentRow[];
  ungraded: StudentRow[];
  subjectStats: SubjectStat[];
  nodeRows: NodeScoreRow[];
  nodeStats: NodeStat[];
  /** 科目列顺序：有人数多的在前，EAP 垫底。 */
  subjectNames: string[];
  gradeCount: number;
}

export interface RiskLists {
  /** 可横比科目（n ≥ MIN_COHORT）里低于均分或中位的最低若干人。 */
  list: SubjectCell[];
  /** 人数不足的科目：改按过线分判断。 */
  soloBelowPass: SubjectCell[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 风险名单的触发条件文案。 */
export function riskTrigger(c: SubjectCell): string {
  if (c.belowMean && c.belowMedian) return '均分+中位';
  return c.belowMean ? '仅低于均分' : '仅低于中位';
}

export function buildGradeOverview(input: OverviewInput): GradeOverview {
  const { students, gradeRecords, milestones, programSubjects, programs } = input;

  const programName = new Map<number, string>(programs.map(p => [p.id, p.name]));
  const psById = new Map<number, any>(programSubjects.map(p => [p.id, p]));
  const nodeById = new Map<number, any>(milestones.map(m => [m.id, m]));

  const nodesByPs = new Map<number, NodeLite[]>();
  for (const m of milestones) {
    if (m.program_subject_id == null) continue;
    const list = nodesByPs.get(m.program_subject_id) ?? [];
    list.push(m as NodeLite);
    nodesByPs.set(m.program_subject_id, list);
  }

  // 节点占总评权重：顶层 = 自身；子项 = 父 × 自身/100
  const totalWeightOf = (n: any): number => {
    const own = Number(n.weight_percent) || 0;
    if (!n.parent_id) return own;
    const p = nodeById.get(n.parent_id);
    return p ? r2(((Number(p.weight_percent) || 0) * own) / 100) : own;
  };

  const stuById = new Map<string, any>(students.map(s => [s.student_id, s]));

  // 成绩索引。同一 (学生, 节点) 库里有唯一索引，重复取后者即可。
  const scoreByKey = new Map<string, number>();
  const recByKey = new Map<string, any>();
  for (const g of gradeRecords) {
    if (g.score == null || g.milestone_id == null) continue;
    const k = `${g.student_id}:${g.milestone_id}`;
    scoreByKey.set(k, Number(g.score));
    recByKey.set(k, g);
  }

  // 哪些 (科目, 学生) 有分。节点归属以 milestone 为准，不信 grade_records.program_subject_id。
  const sidsByPs = new Map<number, Set<string>>();
  for (const g of gradeRecords) {
    if (g.score == null) continue;
    const n = nodeById.get(g.milestone_id);
    if (!n?.program_subject_id) continue;
    // 可见范围之外的学生（学管只看名下）不参与统计
    if (!stuById.has(g.student_id)) continue;
    const set = sidsByPs.get(n.program_subject_id) ?? new Set<string>();
    set.add(g.student_id);
    sidsByPs.set(n.program_subject_id, set);
  }

  // ---------- 学生 × 科目 ----------
  const cells: SubjectCell[] = [];
  for (const [psId, sids] of sidsByPs) {
    const ps = psById.get(psId);
    const nodes = nodesByPs.get(psId);
    if (!ps || !nodes?.length) continue;
    const passMark = ps.pass_mark == null ? 50 : Number(ps.pass_mark);
    const program = programName.get(ps.program_id) ?? '—';

    const group: SubjectCell[] = [];
    for (const sid of sids) {
      const stu = stuById.get(sid);
      const r = computeSubject(nodes, id => scoreByKey.get(`${sid}:${id}`) ?? null, passMark);

      // summarizeSubject 只读 nodes[].{title,weight,score,child} 和 passMark，
      // 所以把 computeSubject 的 rows 摊平成「父项一行 + 子项逐行」即可直接复用，
      // 不必在这里重写一遍报告口径（重写就会慢慢漂移）。
      const flat = r.rows.flatMap(row => [
        { title: row.node.title, weight: row.weight, score: row.score },
        ...row.children.map(c => ({ title: c.node.title, weight: c.weight, score: c.score, child: true })),
      ]);
      const s = summarizeSubject({
        name: ps.subject_name, passMark, total: r.total, pass: r.pass, nodes: flat,
      } as unknown as ReportSubject);
      if (s.avg == null) continue;

      const g = gradeOf(s.avg);
      // 明细只列已出分的项：父项出全按父项写，父项没出全按已录子项写（与均分口径一致）
      const detail = r.rows.flatMap(row => {
        if (row.score != null) return [`${row.node.title} ${row.weight}% → ${r1(row.score)}`];
        return row.children
          .filter(c => c.score != null)
          .map(c => `${c.node.title} ${r2((row.weight * c.weight) / 100)}% → ${r1(c.score as number)}`);
      }).join('；');

      group.push({
        studentId: sid, psId,
        nfeNo: stu?.nfe_no ?? null,
        name: stu?.profiles?.full_name ?? '—',
        advisor: stu?.nz_advisor_name ?? null,
        program, subject: ps.subject_name, passMark,
        avg: s.avg, gradedWeight: s.gradedWeight, topWeight: r.topWeightSum,
        earned: s.earned, complete: r.complete,
        light: s.light, verdict: s.verdict,
        letter: g.letter, points: g.points,
        detail,
        // 下面四项先占位，整组算完再填
        n: 0, mean: 0, median: 0, rank: 0,
        belowMean: false, belowMedian: false,
        belowPass: s.avg < passMark,
      });
    }

    if (!group.length) continue;
    const vals = group.map(c => c.avg);
    const mean = r1(vals.reduce((a, b) => a + b, 0) / vals.length);
    const med = r1(median(vals));
    group.sort((a, b) => b.avg - a.avg);          // rank 1 = 最高
    group.forEach((c, i) => {
      c.n = group.length; c.mean = mean; c.median = med; c.rank = i + 1;
      c.belowMean = c.avg < mean; c.belowMedian = c.avg < med;
    });
    cells.push(...group);
  }

  // ---------- 科目概况 ----------
  const bySubjectKey = new Map<string, SubjectCell[]>();
  for (const c of cells) {
    const k = `${c.program}|${c.subject}`;
    (bySubjectKey.get(k) ?? bySubjectKey.set(k, []).get(k)!).push(c);
  }
  const subjectStats: SubjectStat[] = [...bySubjectKey.values()].map(g => {
    const vals = g.map(c => c.avg);
    const gw = g.map(c => c.gradedWeight);
    return {
      program: g[0].program, subject: g[0].subject, passMark: g[0].passMark,
      n: g.length, mean: g[0].mean, median: g[0].median,
      min: r1(Math.min(...vals)), max: r1(Math.max(...vals)),
      belowPass: g.filter(c => c.belowPass).length,
      gradedWeightLo: r1(Math.min(...gw)), gradedWeightHi: r1(Math.max(...gw)),
      comparable: g.length >= MIN_COHORT,
    };
  }).sort((a, b) => b.n - a.n || a.program.localeCompare(b.program, 'zh') || a.subject.localeCompare(b.subject));

  // ---------- 学生行 ----------
  const cellsByStudent = new Map<string, SubjectCell[]>();
  for (const c of cells) {
    (cellsByStudent.get(c.studentId) ?? cellsByStudent.set(c.studentId, []).get(c.studentId)!).push(c);
  }

  const toRow = (stu: any, list: SubjectCell[]): StudentRow => {
    const nonEap = list.filter(c => !isEap(c.subject));
    const bySubject: Record<string, SubjectCell> = {};
    for (const c of list) bySubject[c.subject] = c;
    return {
      studentId: stu.student_id,
      nfeNo: stu.nfe_no ?? null,
      name: stu.profiles?.full_name ?? '—',
      program: stu.current_phase?.programs?.name ?? list[0]?.program ?? '',
      advisor: stu.nz_advisor_name ?? null,
      status: stu.current_phase?.status ?? null,
      startDate: stu.current_phase?.start_date ?? null,
      cells: [...list].sort((a, b) => a.subject.localeCompare(b.subject)),
      bySubject,
      subjectCount: list.length,
      nonEapCount: nonEap.length,
      // GPA 只按非 EAP 科目算；各人出分科目数不同，不能直接拿来排名
      gpa: nonEap.length ? r2(nonEap.reduce((a, c) => a + c.points, 0) / nonEap.length) : null,
      avgAll: list.length ? r1(list.reduce((a, c) => a + c.avg, 0) / list.length) : null,
    };
  };

  const graded: StudentRow[] = [];
  const ungraded: StudentRow[] = [];
  for (const stu of students) {
    const list = cellsByStudent.get(stu.student_id);
    if (list?.length) graded.push(toRow(stu, list));
    else ungraded.push(toRow(stu, []));
  }
  const byNo = (a: StudentRow, b: StudentRow) =>
    (a.program || 'zz').localeCompare(b.program || 'zz', 'zh') ||
    (a.nfeNo ?? Number.MAX_SAFE_INTEGER) - (b.nfeNo ?? Number.MAX_SAFE_INTEGER);
  graded.sort(byNo);
  ungraded.sort(byNo);

  // ---------- 逐节点 ----------
  const nodeRows: NodeScoreRow[] = [];
  const nodeStats: NodeStat[] = [];
  const scoresByNode = new Map<number, { sid: string; score: number; rec: any }[]>();
  for (const [k, score] of scoreByKey) {
    const [sid, midStr] = k.split(':');
    const mid = Number(midStr);
    if (!nodeById.has(mid) || !stuById.has(sid)) continue;
    (scoresByNode.get(mid) ?? scoresByNode.set(mid, []).get(mid)!).push({ sid, score, rec: recByKey.get(k) });
  }

  for (const [mid, list] of scoresByNode) {
    const n = nodeById.get(mid);
    const ps = psById.get(n.program_subject_id);
    if (!ps) continue;
    const program = programName.get(ps.program_id) ?? '—';
    const passMark = ps.pass_mark == null ? 50 : Number(ps.pass_mark);
    const parent = n.parent_id ? nodeById.get(n.parent_id) : null;
    const tw = totalWeightOf(n);
    const vals = list.map(x => x.score);
    const mean = r1(vals.reduce((a, b) => a + b, 0) / vals.length);
    const desc = [...vals].sort((a, b) => b - a);

    for (const x of list) {
      const stu = stuById.get(x.sid);
      nodeRows.push({
        milestoneId: mid, program, subject: ps.subject_name,
        title: n.title, parentTitle: parent?.title ?? null,
        totalWeight: tw,
        ownWeight: n.parent_id ? (Number(n.weight_percent) || 0) : null,
        dueDate: n.due_date ?? null, termNo: n.term_no ?? null, weekNo: n.week_no ?? null,
        studentId: x.sid, nfeNo: stu?.nfe_no ?? null,
        name: stu?.profiles?.full_name ?? '—', advisor: stu?.nz_advisor_name ?? null,
        score: x.score, missed: x.rec?.status === 'missed',
        nodeMean: mean, nodeRank: desc.indexOf(x.score) + 1, nodeN: list.length,
        recordedAt: x.rec?.recorded_at ? String(x.rec.recorded_at).slice(0, 10) : null,
        belowPass: x.score < passMark,
      });
    }

    nodeStats.push({
      milestoneId: mid, program, subject: ps.subject_name,
      title: n.title, parentTitle: parent?.title ?? null, totalWeight: tw,
      dueDate: n.due_date ?? null, termNo: n.term_no ?? null, weekNo: n.week_no ?? null,
      passMark, n: list.length, mean, median: r1(median(vals)),
      min: r1(Math.min(...vals)), max: r1(Math.max(...vals)),
      belowPass: vals.filter(v => v < passMark).length,
    });
  }

  const byNode = (a: { program: string; subject: string; dueDate: string | null; title: string }, b: typeof a) =>
    a.program.localeCompare(b.program, 'zh') || a.subject.localeCompare(b.subject) ||
    (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || a.title.localeCompare(b.title);
  nodeStats.sort(byNode);
  nodeRows.sort((a, b) => byNode(a, b) || b.score - a.score);

  // 科目列顺序：人多的在前，EAP 垫底
  const countBySubject = new Map<string, number>();
  for (const c of cells) countBySubject.set(c.subject, (countBySubject.get(c.subject) ?? 0) + 1);
  const subjectNames = [...countBySubject.keys()].sort((a, b) =>
    Number(isEap(a)) - Number(isEap(b)) ||
    (countBySubject.get(b) ?? 0) - (countBySubject.get(a) ?? 0) ||
    a.localeCompare(b));

  return {
    cells, students: graded, ungraded, subjectStats, nodeRows, nodeStats, subjectNames,
    gradeCount: scoreByKey.size,
  };
}

/**
 * 风险名单：每科按加权均分从低到高，取低于均分或中位数的最低 take 人。
 * 人数不足 MIN_COHORT 的科目没法横比，改列低于过线分的人。
 */
export function buildRiskLists(cells: SubjectCell[], take = DEFAULT_TAKE): RiskLists {
  const groups = new Map<string, SubjectCell[]>();
  for (const c of cells) {
    const k = `${c.program}|${c.subject}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(c);
  }
  const ordered = [...groups.values()].sort((a, b) =>
    b.length - a.length || a[0].program.localeCompare(b[0].program, 'zh') || a[0].subject.localeCompare(b[0].subject));

  const list: SubjectCell[] = [];
  const soloBelowPass: SubjectCell[] = [];
  for (const g of ordered) {
    const asc = [...g].sort((a, b) => a.avg - b.avg);
    if (g.length >= MIN_COHORT) {
      list.push(...asc.filter(c => c.belowMean || c.belowMedian).slice(0, take));
    } else {
      soloBelowPass.push(...asc.filter(c => c.belowPass));
    }
  }
  soloBelowPass.sort((a, b) => a.avg - b.avg);
  return { list, soloBelowPass };
}
