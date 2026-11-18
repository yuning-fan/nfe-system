// 成绩总表页的取数层 —— 全员口径，**不走** useStudentStore 的可见范围收窄。
//
// 为什么单独开一条取数通道：
//   成绩总表的产出是「科均分 / 科中位 / 科内排名 / 每科最低 N 人」，这些统计量只有
//   基于**全体**学生才成立。而 10-26 之后 grade_records 有 can_see_student RLS、
//   useStudentStore 前端又按 getVisibleStudentIds 收窄，学管看到的是自己名下那一小撮：
//   Gris 只有 39 名出分学生里的 5 个，Statistics 科均分会被算成 89.4（实际 71.0）。
//   按子集算出来的「低于均分」名单是错的，比看不到更糟。
//
//   所以成绩行改走 SECURITY DEFINER 的 grade_overview_grades() RPC（迁移
//   20261118120000，仅 admin/manager/patrol 可执行）；名单直接查表——students_info /
//   profiles / student_enrollments 在库里本来就对所有已登录员工开放，
//   只有前端在收窄，这里不收窄即可。
//
//   grade_records 表自身的 RLS **原样不动**：学生档案、家长报告、违规记录等
//   其它入口仍按 can_see_student 走。这次放宽只针对本页这一个函数。
import { supabase } from './supabase';
import { pickCurrentFirst } from '../store/useStudentStore';

const db = supabase as any;

export interface OverviewStudent {
  student_id: string;
  nfe_no: number | null;
  profiles: { full_name: string } | null;
  nz_advisor_name: string | null;
  current_phase: {
    status: string | null;
    start_date: string | null;
    programs: { name: string } | null;
  } | null;
}

export interface OverviewGrade {
  student_id: string;
  milestone_id: number;
  score: number | null;
  status: string | null;
  recorded_at: string | null;
}

export interface OverviewRaw {
  students: OverviewStudent[];
  grades: OverviewGrade[];
}

/** 全员名单 + 全员成绩。任一步出错直接抛，不静默退化成空表——空表会被误读成「大家都没出分」。 */
export async function fetchGradeOverviewRaw(): Promise<OverviewRaw> {
  const [infoRes, staffRes, enrollRes, gradeRes] = await Promise.all([
    db.from('students_info').select('student_id, nfe_no, nz_advisor_id'),
    db.from('profiles').select('id, full_name, role'),
    db.from('student_enrollments')
      .select('student_id, status, start_date, end_date, programs(name)'),
    db.rpc('grade_overview_grades'),
  ]);

  for (const [what, res] of [
    ['学生档案', infoRes], ['员工/学生姓名', staffRes], ['报名阶段', enrollRes], ['成绩', gradeRes],
  ] as const) {
    if (res.error) {
      const e = res.error;
      // 42501 = 被 RLS/权限拒绝；RPC 未部署时是 PGRST202（找不到函数）
      const hint = e.code === '42501' ? '（当前账号无权限）'
        : e.code === 'PGRST202' ? '（grade_overview_grades 函数未部署，见迁移 20261118120000）'
        : '';
      throw new Error(`成绩总表取数失败：${what}${hint} — ${e.message}`);
    }
  }

  // 一张表同时用于学生姓名和学管姓名（nz_advisor_id 是指向 profiles 的 FK）
  const nameById = new Map<string, string>();
  const studentIds = new Set<string>();
  for (const p of staffRes.data || []) {
    nameById.set(p.id, p.full_name);
    if (p.role === 'student') studentIds.add(p.id);
  }

  const enrollByStudent = new Map<string, any[]>();
  for (const e of enrollRes.data || []) {
    if (!e.student_id) continue;
    const list = enrollByStudent.get(e.student_id) ?? [];
    list.push({ ...e, programs: Array.isArray(e.programs) ? e.programs[0] : e.programs });
    enrollByStudent.set(e.student_id, list);
  }

  const students: OverviewStudent[] = (infoRes.data || [])
    .filter((i: any) => studentIds.has(i.student_id))    // 只要 role='student' 且还有 profiles 行的
    .map((i: any) => {
      const cur = pickCurrentFirst(enrollByStudent.get(i.student_id) || [])[0] ?? null;
      return {
        student_id: i.student_id,
        nfe_no: i.nfe_no ?? null,
        profiles: { full_name: nameById.get(i.student_id) as string },
        nz_advisor_name: i.nz_advisor_id ? (nameById.get(i.nz_advisor_id) ?? null) : null,
        current_phase: cur
          ? { status: cur.status ?? null, start_date: cur.start_date ?? null, programs: cur.programs ?? null }
          : null,
      };
    });

  const grades: OverviewGrade[] = (gradeRes.data || []).map((g: any) => ({
    student_id: g.student_id,
    milestone_id: g.milestone_id,
    score: g.score == null ? null : Number(g.score),
    status: g.status ?? null,
    recorded_at: g.recorded_at ?? null,
  }));

  return { students, grades };
}
