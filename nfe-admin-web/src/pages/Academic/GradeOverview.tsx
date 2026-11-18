// 成绩总表 —— 全员横比的四个视图：学生总览 / 分科明细 / 风险名单 / 逐节点成绩。
// 计算全在 lib/gradeOverview.ts，本文件只管渲染与筛选。
// 口径（页面上也写了一遍给学管看）：加权均分 = 已评部分的加权均分，与家长报告同口径；
// GPA 不含 EAP；科内排名 1 = 最高分。
import { useEffect, useMemo, useState } from 'react';
import { Table, Select, Input, Tooltip, Select as AntSelect, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { IconTableExport, IconLoader2, IconChartBar } from '@tabler/icons-react';
import { useAcademicStore } from '../../store/useAcademicStore';
import { fmtNfeNo } from '../Students/StudentList';
import { fetchGradeOverviewRaw, type OverviewRaw } from '../../lib/gradeOverviewData';
import { downloadXlsx, type CellValue, type SheetSpec } from '../../lib/xlsx';
import {
  buildGradeOverview, buildRiskLists, riskTrigger, MIN_COHORT, DEFAULT_TAKE,
  type SubjectCell, type StudentRow, type NodeScoreRow,
} from '../../lib/gradeOverview';

type View = 'overview' | 'bySubject' | 'risk' | 'byNode';

const LIGHT_PILL: Record<string, string> = { green: 'p-green', yellow: 'p-amber', red: 'p-red', gray: 'p-gray' };
const pct = (v: number) => `${Math.round(v * 10) / 10}%`;

/** 分数染色：低于过线红、≥90 绿、其余默认。 */
const scoreStyle = (v: number | null | undefined, passMark: number) =>
  v == null ? undefined
    : v < passMark ? { color: 'var(--color-danger)', fontWeight: 600 }
    : v >= 90 ? { color: 'var(--color-success, #1E6B45)', fontWeight: 600 }
    : undefined;

export default function GradeOverview() {
  // 节点/科目/项目三张表库里对所有已登录员工开放，继续用公共 store；
  // 学生名单与成绩走 gradeOverviewData 的全员通道（见那里的注释，别改回 useStudentStore——
  // 它按可见范围收窄，学管会拿子集算出错误的科均分和排名）。
  const { milestones, programSubjects, programs, fetchMilestones, fetchProgramsAndSubjects } = useAcademicStore();
  const [raw, setRaw] = useState<OverviewRaw>({ students: [], grades: [] });
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [view, setView] = useState<View>('overview');
  const [search, setSearch] = useState('');
  const [fProgram, setFProgram] = useState<string | undefined>();
  const [fAdvisor, setFAdvisor] = useState<string | undefined>();
  const [fSubject, setFSubject] = useState<string | undefined>();
  const [fullOnly, setFullOnly] = useState(false);
  const [take, setTake] = useState(DEFAULT_TAKE);
  const [nodeMode, setNodeMode] = useState<'scores' | 'stats'>('scores');

  useEffect(() => {
    fetchMilestones(); fetchProgramsAndSubjects();
  }, [fetchMilestones, fetchProgramsAndSubjects]);

  useEffect(() => {
    let alive = true;
    fetchGradeOverviewRaw()
      .then(r => { if (alive) { setRaw(r); setLoadErr(null); } })
      .catch(e => { if (alive) setLoadErr(e.message || String(e)); })
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  const data = useMemo(
    () => buildGradeOverview({
      students: raw.students, gradeRecords: raw.grades, milestones, programSubjects, programs,
    }),
    [raw, milestones, programSubjects, programs]
  );
  const risk = useMemo(() => buildRiskLists(data.cells, take), [data.cells, take]);

  const programOpts = useMemo(
    () => [...new Set(data.students.map(s => s.program).filter(Boolean))].sort().map(v => ({ label: v, value: v })),
    [data.students]
  );
  const advisorOpts = useMemo(
    () => [...new Set(data.students.map(s => s.advisor).filter(Boolean) as string[])].sort().map(v => ({ label: v, value: v })),
    [data.students]
  );
  const subjectOpts = useMemo(
    () => data.subjectNames.map(v => ({ label: v, value: v })), [data.subjectNames]
  );

  const kw = search.trim();
  const matchStu = (s: { name: string; nfeNo: number | null; program: string; advisor: string | null }) =>
    (!kw || s.name.includes(kw) || fmtNfeNo(s.nfeNo).includes(kw.toUpperCase()))
    && (!fProgram || s.program === fProgram)
    && (!fAdvisor || s.advisor === fAdvisor);

  const stuRows = useMemo(
    () => data.students.filter(s => matchStu(s) && (!fullOnly || s.nonEapCount >= 4)),
    [data.students, kw, fProgram, fAdvisor, fullOnly]
  );
  const cellRows = useMemo(
    () => data.cells.filter(c => matchStu(c) && (!fSubject || c.subject === fSubject))
      .sort((a, b) => a.program.localeCompare(b.program, 'zh') || a.subject.localeCompare(b.subject) || a.rank - b.rank),
    [data.cells, kw, fProgram, fAdvisor, fSubject]
  );
  const nodeRows = useMemo(
    () => data.nodeRows.filter(r => matchStu(r) && (!fSubject || r.subject === fSubject)),
    [data.nodeRows, kw, fProgram, fAdvisor, fSubject]
  );
  const nodeStats = useMemo(
    () => data.nodeStats.filter(r => (!fProgram || true) && (!fSubject || r.subject === fSubject)),
    [data.nodeStats, fSubject, fProgram]
  );

  // ---------- 导出（6 个 sheet，和 scripts/生成_成绩总表.py 同构） ----------
  const doExport = () => {
    if (!data.students.length) { message.warning('当前没有可导出的成绩'); return; }
    const today = new Date().toLocaleDateString('sv');   // sv 即 YYYY-MM-DD
    const subj = data.subjectNames;

    const sheets: SheetSpec[] = [
      {
        sheetName: '学生总览',
        headers: ['学号', '姓名', '项目', '学管', '已出分科目', '非EAP科目', 'GPA(非EAP)', '平均加权均分', ...subj],
        colWidths: [12, 10, 16, 9, 11, 11, 11, 12, ...subj.map(s => Math.max(11, Math.min(22, s.length + 2)))],
        colFormats: [null, null, null, null, null, null, null, 'num1', ...subj.map(() => 'num1' as const)],
        rows: data.students.map(s => [
          fmtNfeNo(s.nfeNo), s.name, s.program, s.advisor ?? '', s.subjectCount, s.nonEapCount, s.gpa, s.avgAll,
          ...subj.map(n => s.bySubject[n]?.avg ?? null),
        ] as CellValue[]),
      },
      {
        sheetName: '分科明细',
        headers: ['项目', '科目', '科内排名', '学号', '姓名', '学管', '加权均分', '等级', '绩点',
          '科均分', '科中位', '过线分', '低于过线', '已评权重', '顶层权重合计', '已得加权分', '达标预测', '成绩明细'],
        colWidths: [16, 30, 9, 12, 10, 9, 9, 7, 7, 8, 8, 7, 9, 9, 12, 11, 34, 70],
        colFormats: [null, null, null, null, null, null, 'num1', null, null, 'num1', 'num1', null, null, 'pct0', 'pct0', 'num1', null, null],
        rows: data.cells
          .slice()
          .sort((a, b) => a.program.localeCompare(b.program, 'zh') || a.subject.localeCompare(b.subject) || a.rank - b.rank)
          .map(c => [
            c.program, c.subject, `${c.rank}/${c.n}`, fmtNfeNo(c.nfeNo), c.name, c.advisor ?? '',
            c.avg, c.letter, c.points, c.mean, c.median, c.passMark, c.belowPass ? '是' : '',
            c.gradedWeight / 100, c.topWeight / 100, c.earned, c.verdict, c.detail,
          ] as CellValue[]),
      },
      {
        sheetName: '风险名单',
        headers: ['项目', '科目', '科内排名', '学号', '姓名', '学管', '加权均分', '科均分', '科中位',
          '与均分差', '触发条件', '过线分', '低于过线', '已评权重', '成绩明细'],
        colWidths: [16, 30, 9, 12, 10, 9, 9, 8, 8, 9, 12, 7, 9, 9, 70],
        colFormats: [null, null, null, null, null, null, 'num1', 'num1', 'num1', 'num1', null, null, null, 'pct0', null],
        rows: risk.list.map(c => [
          c.program, c.subject, `${c.rank}/${c.n}`, fmtNfeNo(c.nfeNo), c.name, c.advisor ?? '',
          c.avg, c.mean, c.median, Math.round((c.avg - c.mean) * 10) / 10, riskTrigger(c),
          c.passMark, c.belowPass ? '是' : '', c.gradedWeight / 100, c.detail,
        ] as CellValue[]),
      },
      {
        sheetName: `人数不足_少于${MIN_COHORT}人`,
        headers: ['项目', '科目', '学号', '姓名', '学管', '加权均分', '过线分', '已评权重', '成绩明细'],
        colWidths: [16, 30, 12, 10, 9, 10, 7, 9, 70],
        colFormats: [null, null, null, null, null, 'num1', null, 'pct0', null],
        rows: risk.soloBelowPass.map(c => [
          c.program, c.subject, fmtNfeNo(c.nfeNo), c.name, c.advisor ?? '',
          c.avg, c.passMark, c.gradedWeight / 100, c.detail,
        ] as CellValue[]),
      },
      {
        sheetName: '逐节点成绩',
        headers: ['项目', '科目', '节点', '父节点', '占总评权重', '节点内权重', '截止日期', '学期', '周次',
          '学号', '姓名', '学管', '分数', '状态', '节点均分', '节点内排名', '录入日期'],
        colWidths: [16, 26, 40, 26, 11, 11, 11, 7, 7, 12, 10, 9, 8, 8, 9, 10, 11],
        colFormats: [null, null, null, null, 'pct1', 'pct1', null, null, null, null, null, null, 'num1', null, 'num1', null, null],
        rows: data.nodeRows.map(r => [
          r.program, r.subject, r.title, r.parentTitle ?? '', r.totalWeight / 100,
          r.ownWeight == null ? null : r.ownWeight / 100,
          r.dueDate ?? '', r.termNo, r.weekNo, fmtNfeNo(r.nfeNo), r.name, r.advisor ?? '',
          r.score, r.missed ? '缺考' : '已评', r.nodeMean, `${r.nodeRank}/${r.nodeN}`, r.recordedAt ?? '',
        ] as CellValue[]),
      },
      {
        sheetName: '节点概况',
        headers: ['项目', '科目', '节点', '父节点', '占总评权重', '截止日期', '学期', '周次',
          '有分人数', '均分', '中位数', '最低', '最高', '过线分', '低于过线人数'],
        colWidths: [16, 26, 40, 26, 11, 11, 7, 7, 10, 8, 8, 7, 7, 7, 12],
        colFormats: [null, null, null, null, 'pct1', null, null, null, null, 'num1', 'num1', 'num1', 'num1', null, null],
        rows: data.nodeStats.map(s => [
          s.program, s.subject, s.title, s.parentTitle ?? '', s.totalWeight / 100, s.dueDate ?? '',
          s.termNo, s.weekNo, s.n, s.mean, s.median, s.min, s.max, s.passMark, s.belowPass,
        ] as CellValue[]),
      },
      {
        sheetName: '未出分学生',
        headers: ['学号', '姓名', '项目', '在读状态', '开学日期', '学管'],
        colWidths: [12, 10, 20, 11, 12, 9],
        rows: data.ungraded.map(s => [
          fmtNfeNo(s.nfeNo), s.name, s.program || '', s.status ?? '无在读记录', s.startDate ?? '', s.advisor ?? '',
        ] as CellValue[]),
      },
    ];

    downloadXlsx(`成绩总表_${today}.xlsx`, sheets);
    message.success(`已导出 ${sheets.length} 个 sheet · ${data.students.length} 名出分学生`);
  };

  // ---------- 列定义 ----------
  const stuCols: ColumnsType<StudentRow> = [
    { title: '学号', dataIndex: 'nfeNo', width: 110, fixed: 'left', render: (v: number | null) => fmtNfeNo(v) },
    { title: '姓名', dataIndex: 'name', width: 90, fixed: 'left', render: (v: string) => <b>{v}</b> },
    { title: '项目', dataIndex: 'program', width: 150 },
    { title: '学管', dataIndex: 'advisor', width: 80, render: (v: string | null) => v || '—' },
    {
      title: <Tooltip title="已出分科目数 / 其中非 EAP 科目数。GPA 只按非 EAP 算，所以这个数不同的人 GPA 不能直接比。">科目数 ⓘ</Tooltip>,
      key: 'cnt', width: 90, align: 'center',
      render: (_: unknown, s) => <span>{s.subjectCount}<span style={{ color: 'var(--color-text-tertiary)' }}> / {s.nonEapCount}</span></span>,
    },
    {
      title: <Tooltip title="已出分非 EAP 科目的平均绩点（A+ = 9 … C- = 1，<50 = 0）。出分科目数不同的人之间不可比——用上面的「只看四门全出分」筛一下再排。">GPA ⓘ</Tooltip>,
      dataIndex: 'gpa', width: 85, align: 'right',
      sorter: (a, b) => (a.gpa ?? -1) - (b.gpa ?? -1),
      render: (v: number | null, s) => v == null ? '—' :
        <span style={{ fontWeight: 600, color: s.nonEapCount < 4 ? 'var(--color-text-tertiary)' : undefined }}>{v.toFixed(2)}</span>,
    },
    {
      title: '平均均分', dataIndex: 'avgAll', width: 95, align: 'right',
      sorter: (a, b) => (a.avgAll ?? -1) - (b.avgAll ?? -1),
      render: (v: number | null) => v == null ? '—' : v.toFixed(1),
    },
    ...data.subjectNames.map<ColumnsType<StudentRow>[number]>(subject => ({
      title: subject.length > 14 ? <Tooltip title={subject}>{subject.slice(0, 12)}…</Tooltip> : subject,
      key: `s_${subject}`, width: 110, align: 'right',
      sorter: (a: StudentRow, b: StudentRow) => (a.bySubject[subject]?.avg ?? -1) - (b.bySubject[subject]?.avg ?? -1),
      render: (_: unknown, s: StudentRow) => {
        const c = s.bySubject[subject];
        if (!c) return <span style={{ color: 'var(--color-border)' }}>—</span>;
        return (
          <Tooltip title={<div style={{ maxWidth: 420 }}>{c.detail}<br />已评 {pct(c.gradedWeight)} · {c.verdict}</div>}>
            <span style={scoreStyle(c.avg, c.passMark)}>{c.avg.toFixed(1)}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}> {c.letter}</span>
          </Tooltip>
        );
      },
    })),
  ];

  const cellCols = (withTrigger: boolean): ColumnsType<SubjectCell> => [
    { title: '项目', dataIndex: 'program', width: 140 },
    { title: '科目', dataIndex: 'subject', width: 180 },
    {
      title: <Tooltip title="1 = 科内最高分">科内排名 ⓘ</Tooltip>, key: 'rank', width: 95, align: 'center',
      render: (_: unknown, c) => `${c.rank}/${c.n}`,
    },
    { title: '学号', dataIndex: 'nfeNo', width: 110, render: (v: number | null) => fmtNfeNo(v) },
    { title: '姓名', dataIndex: 'name', width: 85, render: (v: string) => <b>{v}</b> },
    { title: '学管', dataIndex: 'advisor', width: 75, render: (v: string | null) => v || '—' },
    {
      title: '加权均分', dataIndex: 'avg', width: 95, align: 'right',
      sorter: (a, b) => a.avg - b.avg,
      render: (v: number, c) => <span style={scoreStyle(v, c.passMark)}>{v.toFixed(1)}</span>,
    },
    { title: '等级', dataIndex: 'letter', width: 65, align: 'center' },
    { title: '科均分', dataIndex: 'mean', width: 80, align: 'right', render: (v: number) => v.toFixed(1) },
    { title: '科中位', dataIndex: 'median', width: 80, align: 'right', render: (v: number) => v.toFixed(1) },
    ...(withTrigger ? [
      {
        title: '与均分差', key: 'diff', width: 95, align: 'right' as const,
        render: (_: unknown, c: SubjectCell) => {
          const d = Math.round((c.avg - c.mean) * 10) / 10;
          return <span style={{ color: d < 0 ? 'var(--color-danger)' : undefined }}>{d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1)}</span>;
        },
      },
      {
        title: '触发条件', key: 'trig', width: 110,
        render: (_: unknown, c: SubjectCell) => {
          const t = riskTrigger(c);
          return <span style={t === '均分+中位' ? undefined : { color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>{t}</span>;
        },
      },
    ] : []),
    {
      title: '已评权重', dataIndex: 'gradedWeight', width: 95, align: 'right',
      render: (v: number, c) => <Tooltip title={`顶层权重合计 ${pct(c.topWeight)}${Math.round(c.topWeight) === 100 ? '' : '（未配满 100%）'}`}>{pct(v)}</Tooltip>,
    },
    {
      title: '低于过线', key: 'pass', width: 90, align: 'center',
      render: (_: unknown, c) => c.belowPass
        ? <span className="pill p-red">是 ({c.passMark})</span>
        : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>,
    },
    {
      title: '达标预测', key: 'verdict', width: 240,
      render: (_: unknown, c) => <span className={`pill ${LIGHT_PILL[c.light]}`}>{c.verdict}</span>,
    },
    { title: '成绩明细', dataIndex: 'detail', render: (v: string) => <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{v}</span> },
  ];

  const nodeCols: ColumnsType<NodeScoreRow> = [
    { title: '项目', dataIndex: 'program', width: 140 },
    { title: '科目', dataIndex: 'subject', width: 160 },
    {
      title: '节点', key: 'title', width: 280,
      render: (_: unknown, r) => (
        <span>
          {r.parentTitle && <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>{r.parentTitle} ↳ </span>}
          {r.title}
        </span>
      ),
    },
    {
      title: <Tooltip title="该节点占该科总评的权重。子项已按「父权重 × 子占父%」折算。">占总评 ⓘ</Tooltip>,
      dataIndex: 'totalWeight', width: 95, align: 'right', render: (v: number) => pct(v),
    },
    { title: '截止日期', dataIndex: 'dueDate', width: 110, render: (v: string | null) => v || '—' },
    { title: '学号', dataIndex: 'nfeNo', width: 110, render: (v: number | null) => fmtNfeNo(v) },
    { title: '姓名', dataIndex: 'name', width: 85, render: (v: string) => <b>{v}</b> },
    { title: '学管', dataIndex: 'advisor', width: 75, render: (v: string | null) => v || '—' },
    {
      title: '分数', dataIndex: 'score', width: 80, align: 'right',
      sorter: (a, b) => a.score - b.score,
      render: (v: number, r) => <span style={{ fontWeight: 600, color: r.belowPass ? 'var(--color-danger)' : undefined }}>{v}</span>,
    },
    {
      title: '状态', key: 'st', width: 80, align: 'center',
      render: (_: unknown, r) => r.missed ? <span className="pill p-red">缺考</span> : <span style={{ color: 'var(--color-text-tertiary)' }}>已评</span>,
    },
    { title: '节点均分', dataIndex: 'nodeMean', width: 95, align: 'right', render: (v: number) => v.toFixed(1) },
    {
      title: <Tooltip title="1 = 该节点最高分">节点内排名 ⓘ</Tooltip>, key: 'nr', width: 110, align: 'center',
      render: (_: unknown, r) => `${r.nodeRank}/${r.nodeN}`,
    },
    { title: '录入日期', dataIndex: 'recordedAt', width: 110, render: (v: string | null) => v || '—' },
  ];

  const statCols: ColumnsType<(typeof data.nodeStats)[number]> = [
    { title: '项目', dataIndex: 'program', width: 140 },
    { title: '科目', dataIndex: 'subject', width: 160 },
    {
      title: '节点', key: 'title', width: 300,
      render: (_: unknown, r) => (
        <span>
          {r.parentTitle && <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>{r.parentTitle} ↳ </span>}
          {r.title}
        </span>
      ),
    },
    { title: '占总评', dataIndex: 'totalWeight', width: 90, align: 'right', render: (v: number) => pct(v) },
    { title: '截止日期', dataIndex: 'dueDate', width: 110, render: (v: string | null) => v || '—' },
    { title: '有分人数', dataIndex: 'n', width: 95, align: 'center' },
    { title: '均分', dataIndex: 'mean', width: 80, align: 'right', sorter: (a, b) => a.mean - b.mean, render: (v: number) => v.toFixed(1) },
    { title: '中位数', dataIndex: 'median', width: 85, align: 'right', render: (v: number) => v.toFixed(1) },
    { title: '最低', dataIndex: 'min', width: 75, align: 'right', render: (v: number) => v.toFixed(1) },
    { title: '最高', dataIndex: 'max', width: 75, align: 'right', render: (v: number) => v.toFixed(1) },
    {
      title: '低于过线', key: 'bp', width: 120, align: 'center',
      render: (_: unknown, r) => r.belowPass === 0
        ? <span style={{ color: 'var(--color-text-tertiary)' }}>0</span>
        : <span className={`pill ${r.belowPass / r.n >= 0.3 ? 'p-red' : 'p-amber'}`}>{r.belowPass} / {r.n}</span>,
    },
  ];

  const ungradedCols: ColumnsType<StudentRow> = [
    { title: '学号', dataIndex: 'nfeNo', width: 110, render: (v: number | null) => fmtNfeNo(v) },
    { title: '姓名', dataIndex: 'name', width: 90, render: (v: string) => <b>{v}</b> },
    {
      title: '项目', dataIndex: 'program', width: 200,
      render: (v: string) => v || <span className="pill p-red">无在读记录</span>,
    },
    { title: '在读状态', dataIndex: 'status', width: 100, render: (v: string | null) => v || '—' },
    { title: '开学日期', dataIndex: 'startDate', width: 120, render: (v: string | null) => v || '—' },
    { title: '学管', dataIndex: 'advisor', width: 90, render: (v: string | null) => v || '—' },
  ];

  const loading = !loaded;

  return (
    <div className="tabpage active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>
            <IconChartBar size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> 成绩总表
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 2 }}>
            {data.gradeCount} 条成绩 · {data.students.length} 名学生出分 · {data.subjectStats.length} 个科目（{data.ungraded.length} 人未出分）
          </p>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>
            加权均分 = 已评部分的加权均分，与家长报告同口径（父节点子项未录全时，已录子项按「父权重 × 子占父%」计入）；
            GPA 不含 EAP；科内排名 1 = 最高分。
          </p>
        </div>
        <button className="btn" onClick={doExport} title="导出全部数据（不受下面筛选影响）">
          <IconTableExport stroke={1.5} size={16} style={{ marginRight: 4 }} />导出 Excel
        </button>
      </div>

      <div className="tab-bar" style={{ marginBottom: 14 }}>
        <div className={`tab ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>学生总览</div>
        <div className={`tab ${view === 'bySubject' ? 'active' : ''}`} onClick={() => setView('bySubject')}>分科明细</div>
        <div className={`tab ${view === 'risk' ? 'active' : ''}`} onClick={() => setView('risk')}>风险名单</div>
        <div className={`tab ${view === 'byNode' ? 'active' : ''}`} onClick={() => setView('byNode')}>逐节点成绩</div>
      </div>

      {/* 筛选条 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input allowClear placeholder="搜索姓名或学号" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 190 }} />
        <Select allowClear placeholder="按项目筛选" value={fProgram} onChange={setFProgram} options={programOpts} style={{ width: 170 }} />
        <Select allowClear placeholder="按学管筛选" value={fAdvisor} onChange={setFAdvisor} options={advisorOpts} style={{ width: 140 }} />
        {view !== 'overview' && view !== 'risk' && (
          <Select allowClear showSearch optionFilterProp="label" placeholder="按科目筛选"
            value={fSubject} onChange={setFSubject} options={subjectOpts} style={{ width: 200 }} />
        )}
        {view === 'overview' && (
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={fullOnly} onChange={e => setFullOnly(e.target.checked)} />
            只看四门全出分（GPA 可横比）
          </label>
        )}
        {view === 'risk' && (
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            每科取
            <AntSelect value={take} onChange={setTake} style={{ width: 72 }}
              options={[3, 5, 7, 10].map(n => ({ label: `${n} 人`, value: n }))} />
          </label>
        )}
        {view === 'byNode' && (
          <AntSelect value={nodeMode} onChange={setNodeMode} style={{ width: 130 }}
            options={[{ label: '逐条成绩', value: 'scores' }, { label: '节点概况', value: 'stats' }]} />
        )}
      </div>

      {loadErr ? (
        <div className="card" style={{ padding: 24, color: 'var(--color-danger)', fontSize: 13 }}>
          {loadErr}
        </div>
      ) : loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><IconLoader2 className="spinner" size={24} /></div>
      ) : (
        <>
          {view === 'overview' && (
            <>
              <Table<StudentRow>
                rowKey="studentId" size="small" dataSource={stuRows} columns={stuCols}
                pagination={false} scroll={{ x: 'max-content', y: 560 }} sticky
                footer={() => <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>共 {stuRows.length} 人 · 「—」表示该科目尚无成绩</span>}
              />
              {data.ungraded.length > 0 && (
                <details style={{ marginTop: 18 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    未出分学生（{data.ungraded.length} 人）
                  </summary>
                  <div style={{ marginTop: 10 }}>
                    <Table<StudentRow> rowKey="studentId" size="small" dataSource={data.ungraded}
                      columns={ungradedCols} pagination={false} scroll={{ x: 'max-content', y: 320 }} />
                  </div>
                </details>
              )}
            </>
          )}

          {view === 'bySubject' && (
            <Table<SubjectCell>
              rowKey={c => `${c.studentId}_${c.psId}`} size="small" dataSource={cellRows}
              columns={cellCols(false)} pagination={false} scroll={{ x: 'max-content', y: 600 }} sticky
              footer={() => <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>共 {cellRows.length} 条（学生 × 科目）</span>}
            />
          )}

          {view === 'risk' && (
            <>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
                每科按加权均分从低到高，取低于科均分或科中位的最低 {take} 人。
              </div>
              <Table<SubjectCell>
                rowKey={c => `${c.studentId}_${c.psId}`} size="small"
                dataSource={risk.list.filter(matchStu)} columns={cellCols(true)}
                pagination={false} scroll={{ x: 'max-content', y: 560 }} sticky
                footer={() => <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>共 {risk.list.filter(matchStu).length} 人次</span>}
              />
              <div style={{ marginTop: 22 }}>
                <div className="card-title" style={{ marginBottom: 6 }}>人数不足（少于 {MIN_COHORT} 人）· 按过线分判断</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
                  这些科目出分人数太少，均分和中位数没有参考价值，所以只列低于过线分的人。
                </div>
                {risk.soloBelowPass.filter(matchStu).length === 0 ? (
                  <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                    无
                  </div>
                ) : (
                  <Table<SubjectCell>
                    rowKey={c => `${c.studentId}_${c.psId}`} size="small"
                    dataSource={risk.soloBelowPass.filter(matchStu)} columns={cellCols(false)}
                    pagination={false} scroll={{ x: 'max-content' }}
                  />
                )}
              </div>
            </>
          )}

          {view === 'byNode' && (nodeMode === 'scores' ? (
            <Table<NodeScoreRow>
              rowKey={r => `${r.studentId}_${r.milestoneId}`} size="small" dataSource={nodeRows}
              columns={nodeCols} pagination={{ pageSize: 100, showSizeChanger: true, pageSizeOptions: ['50', '100', '200', '500'] }}
              scroll={{ x: 'max-content', y: 560 }} sticky
            />
          ) : (
            <Table rowKey="milestoneId" size="small" dataSource={nodeStats} columns={statCols}
              pagination={false} scroll={{ x: 'max-content', y: 600 }} sticky
              footer={() => <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>共 {nodeStats.length} 个节点</span>}
            />
          ))}
        </>
      )}
    </div>
  );
}
