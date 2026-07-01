// 加权总评算法 —— 供成绩页与学生档案复用
// 节点(academic_milestones)：顶层 weight_percent=占该科总评%，子项=占父节点%
// 分数(grade_records)：按 0–100 百分比处理；missing = 待录

export interface NodeLite {
  id: number;
  parent_id?: number | null;
  weight_percent?: number | null;
  title: string;
  due_date?: string;
  milestone_type?: string;
  term_no?: number | null;
  week_no?: number | null;
  is_major?: boolean | null;
}

export interface GradeRow {
  node: NodeLite;
  weight: number;             // 占总评%
  score: number | null;       // 该节点最终分(0–100)，子项加权算出或直接录入；null=待录
  children: { node: NodeLite; weight: number; score: number | null }[];
}

export interface SubjectResult {
  rows: GradeRow[];
  topWeightSum: number;       // 顶层权重合计(应=100)
  gradedWeight: number;       // 已评的顶层权重
  earnedPoints: number;       // 已得加权分(满分100)
  complete: boolean;          // 顶层是否全部已评
  total: number | null;       // 完成时=总评分，否则 null
  pass: boolean | null;       // total>=passMark
}

// nodes: 该科全部节点(含父子)；scoreOf: 节点id -> 最终分(已录) 或 undefined
export function computeSubject(
  nodes: NodeLite[],
  scoreOf: (milestoneId: number) => number | null | undefined,
  passMark: number
): SubjectResult {
  const tops = nodes.filter(n => !n.parent_id);
  const childrenOf = (pid: number) => nodes.filter(n => n.parent_id === pid);

  const rows: GradeRow[] = tops
    .slice()
    .sort((a, b) => (a.term_no ?? 0) - (b.term_no ?? 0) || (a.week_no ?? 0) - (b.week_no ?? 0) || (a.due_date || '').localeCompare(b.due_date || ''))
    .map(top => {
      const kids = childrenOf(top.id);
      let score: number | null;
      const childRows = kids.map(k => ({ node: k, weight: Number(k.weight_percent) || 0, score: numOrNull(scoreOf(k.id)) }));
      if (kids.length > 0) {
        // 父 Project：所有子项已录才算出；否则待录
        const allGraded = childRows.every(c => c.score != null);
        score = allGraded
          ? childRows.reduce((s, c) => s + (c.weight / 100) * (c.score as number), 0)
          : null;
      } else {
        score = numOrNull(scoreOf(top.id));
      }
      return { node: top, weight: Number(top.weight_percent) || 0, score, children: childRows };
    });

  const topWeightSum = rows.reduce((s, r) => s + r.weight, 0);
  const gradedWeight = rows.filter(r => r.score != null).reduce((s, r) => s + r.weight, 0);
  const earnedPoints = rows.filter(r => r.score != null).reduce((s, r) => s + (r.weight / 100) * (r.score as number), 0);
  const complete = rows.length > 0 && Math.round(gradedWeight) >= 100;
  const total = complete ? round1(earnedPoints) : null;
  const pass = total == null ? null : total >= passMark;

  return { rows, topWeightSum, gradedWeight, earnedPoints: round1(earnedPoints), complete, total, pass };
}

function numOrNull(v: number | null | undefined): number | null {
  return v == null || isNaN(Number(v)) ? null : Number(v);
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
