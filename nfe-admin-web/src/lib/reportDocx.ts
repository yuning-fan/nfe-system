// 家长报告 Word 导出（真 .docx）—— 学术报告 / 出勤报告共用排版件
// 学术：一、本期概览 → 二、各科成绩与分析 → 三、目标差距分析 → 四、考核日历 → 五、辅导与晚自习 → 六、出勤与纪律 → 综合评价
// 出勤：一、本期概览 → 二、学校口径出勤率变化 → 三、晚自习情况 → 四、请假情况 → 五、警告与违规 → 综合评价
// 版式依 Gris 定稿（学术报告--张希珃-2026-10-11 (1).docx）：英文 Times New Roman + 中文仿宋；
// 页眉为公司信纸（左 logo、右联系方式、下边线）+ 斜置浅色 logo 水印；学生信息分两行。
// 预览页（ReportEditor）与导出共用这里的计算函数，保证「系统里看到的」与「导出的 Word」一致。
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, ImageRun,
  WidthType, AlignmentType, ShadingType, BorderStyle, TabStopType,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType,
} from 'docx';
import logoUrl from '../assets/report/logo.png';
import contactUrl from '../assets/report/contact.jpg';
import watermarkUrl from '../assets/report/watermark.png';
import type { ReportRecord, ReportSubject, ReportNode, ReportContent } from '../store/useReportStore';
import { COHORT_MIN_N } from '../store/useReportStore';

// 科目中英对照统一放在 lib/subjectNames.ts（资料库等处共用）
import { cnOf } from './subjectNames';
export { cnOf };

const HEAD_BG = 'D9E2F3';
const SUM_BG = 'F2F2F2';
// FangS-SC 是 Gris 电脑上 WPS 的仿宋，非通用字体名；写标准名「仿宋」，Windows / WPS 都能识别
const FONT = { ascii: 'Times New Roman', hAnsi: 'Times New Roman', cs: 'Times New Roman', eastAsia: '仿宋' };
const RED = 'C00000', AMBER = 'B26B00', GREEN = '2E7D32', GRAY = '808080';

// ───────────────────────── 共用计算（预览页也用） ─────────────────────────

export const fmtDate = (d?: string | null) => (d ? d.slice(0, 10).replace(/-/g, '/') : '—');
const r1 = (x: number) => Math.round(x * 10) / 10;

export type Light = 'green' | 'yellow' | 'red' | 'gray';
export const LIGHT_LABEL: Record<Light, string> = { green: '稳定', yellow: '需努力', red: '高风险', gray: '暂无成绩' };
export const LIGHT_COLOR: Record<Light, string> = { green: GREEN, yellow: AMBER, red: RED, gray: GRAY };

// 加权小结 + 红黄绿状态：与 gradeCalc.computeRequirement 同口径
// 状态口径：后续需均分 ≤ 当前已出均分 → 照现在水平即可过线（绿）；高出 15 分以内（黄）；更高或无法达线（红）
export function summarizeSubject(sub: ReportSubject) {
  const scored = sub.nodes.filter(n => !n.child && n.weight > 0 && n.score != null);
  const gradedWeight = r1(scored.reduce((s, n) => s + n.weight, 0));
  const earned = r1(scored.reduce((s, n) => s + (n.weight / 100) * (n.score as number), 0));
  const remaining = r1(100 - gradedWeight);
  const gap = r1(sub.passMark - earned);
  const avg = gradedWeight ? r1((earned / gradedWeight) * 100) : null;
  let need = '—';
  let requiredAvg: number | null = null;
  let light: Light = 'gray';
  let verdict = '暂无成绩';
  if (avg != null) {
    if (remaining <= 0) {
      light = earned >= sub.passMark ? 'green' : 'red';
      verdict = earned >= sub.passMark ? '已全部出分，已过线' : '已全部出分，未过线';
    } else if (gap <= 0) {
      need = '已锁定过线'; light = 'green'; verdict = '已锁定过线';
    } else {
      requiredAvg = r1((gap / remaining) * 100);
      if (requiredAvg > 100) {
        need = `已无法达线（差 ${gap} 分）`; light = 'red'; verdict = '剩余全满分也无法过线';
      } else {
        need = `${requiredAvg}%`;
        light = requiredAvg <= avg ? 'green' : requiredAvg <= avg + 15 ? 'yellow' : 'red';
        verdict = requiredAvg <= avg
          ? `保持当前水平（${avg}%）即可过线`
          : `后续需比当前均分高 ${r1(requiredAvg - avg)} 分`;
      }
    }
  }
  return { gradedWeight, earned, avg, remaining, need, requiredAvg, light, verdict };
}

const band = (rank: number, n: number) => {
  const p = rank / n;
  return p <= 0.25 ? '前 25%' : p <= 0.5 ? '中上' : p <= 0.75 ? '中下' : '后 25%';
};

// 表格里的短格式：「中位 58 · 第 3/12」
export function cohortShort(n: ReportNode): string {
  const c = n.cohort;
  if (n.score == null || !c) return '—';
  if (c.n < COHORT_MIN_N || c.median == null) return `同批 ${c.n} 人`;
  return `中位 ${c.median} · 第 ${c.rank}/${c.n}`;
}

// 分析段落里的完整说明
export function cohortText(n: ReportNode): string | null {
  const c = n.cohort;
  if (n.score == null || !c) return null;
  if (c.n < COHORT_MIN_N || c.median == null) return `同批已出分仅 ${c.n} 人，样本过少，暂不做层次对比。`;
  const d = r1((n.score as number) - c.median);
  const toTop = r1((c.max as number) - (n.score as number));
  return `基于 NFE 同批 ${c.n} 名学生：中位数 ${c.median}，平均 ${c.mean}，最高 ${c.max}，最低 ${c.min}；`
    + `本人第 ${c.rank}/${c.n} 名（${d === 0 ? '中等' : band(c.rank as number, c.n)}）。`
    + `${d > 0 ? `高于中位数 ${d} 分` : d < 0 ? `低于中位数 ${-d} 分` : '与中位数持平'}${toTop > 0 ? `，距最高分 ${toTop} 分` : '，为同批最高'}。`;
}

export const KIND_CN: Record<string, string> = { exam: '考试', assignment: '作业/项目', report_due: '报告' };

// ───────── 升学对标（奥大 CFS 升本要求，GPA 9 分制，不含 EAP）─────────
const GRADE_BANDS: [number, string, number][] = [
  [90, 'A+', 9], [85, 'A', 8], [80, 'A-', 7], [75, 'B+', 6], [70, 'B', 5],
  [65, 'B-', 4], [60, 'C+', 3], [55, 'C', 2], [50, 'C-', 1], [0, 'D', 0],
];
export const gradeOf = (pct: number) => { const b = GRADE_BANDS.find(([min]) => pct >= min)!; return { letter: b[1], points: b[2] }; };
// GPA → 大致相当的各科均分（每档 5 分，1 分 = 50%）
const gpaToPct = (g: number) => (g <= 0 ? 0 : r1(45 + 5 * g));
const isEap = (name: string) => /^EAP/i.test(name);
const short = (name: string) => name.replace(/ \(English for Academic Purposes\)/, '');

export type Tone = 'good' | 'warn' | 'bad' | undefined;
export interface BenchLine { label: string; value: string; tone?: Tone; }

// 达到任意门槛（如 EAP 65/70）还需的剩余均分；口径同 summarizeSubject
function needFor(sub: ReportSubject, threshold: number): string {
  const s = summarizeSubject(sub);
  if (s.avg == null) return '尚无成绩';
  const gap = r1(threshold - s.earned);
  if (gap <= 0) return '已锁定达标';
  if (s.remaining <= 0) return '已全部出分，未达标';
  const need = r1((gap / s.remaining) * 100);
  return need > 100 ? `剩余全满分也无法达到（差 ${gap} 分）` : `剩余 ${s.remaining}% 需均分 ${need}%`;
}

export function targetBenchmark(c: ReportContent): { title: string | null; lines: BenchLine[] } {
  const t = c.target;
  if (!t) return { title: null, lines: [] };
  const p = t.programme;
  const subs = c.subjects || [];
  const lines: BenchLine[] = [];
  if (!p) {
    if (!t.university && !t.degree) return { title: null, lines: [] };
    lines.push({ label: '目标院校 / 专业', value: [t.university, t.degree].filter(Boolean).join(' · ') });
    lines.push({ label: '录取要求', value: '尚未关联奥大专业要求（学生档案「编辑」里选择目标专业后，这里会自动对比 GPA、EAP 与必修科目）', tone: 'warn' });
    if (t.note) lines.push({ label: '专业要求说明', value: t.note });
    return { title: '升学目标对标', lines };
  }

  lines.push({ label: '目标专业', value: `${p.programme}（${p.faculty}）${t.degree ? `\n学生填写方向：${t.degree}` : ''}` });
  if (p.entry_type === 'no_direct') {
    lines.push({ label: '录取方式', value: `预科不可直录：${p.additional_requirements || ''}`, tone: 'warn' });
    return { title: `升学目标对标（UoA ${p.entry_year} 入学要求）`, lines };
  }
  if (p.entry_type === 'via_other_degree') {
    lines.push({ label: '录取方式', value: p.additional_requirements || '须同时获得另一学位录取', tone: 'warn' });
  }
  const req: string[] = [];
  if (p.gpa_min != null) req.push(`GPA ≥ ${p.gpa_min}（约相当于各科均分 ${gpaToPct(p.gpa_min)}%，不含 EAP）`);
  req.push(p.eap_min != null ? `EAP ≥ ${p.eap_min}%` : (p.english_requirement || ''));
  if (p.intakes.length) req.push(`入学 ${p.intakes.join(' / ')}${p.intake_note ? `（${p.intake_note}）` : ''}`);
  lines.push({ label: '录取要求', value: req.filter(Boolean).join('；') });

  // GPA 估算：各科（不含 EAP）已出成绩均分换算等级点后取平均
  const gpaSubs = subs.map(sub => ({ sub, avg: summarizeSubject(sub).avg })).filter(x => !isEap(x.sub.name) && x.avg != null) as { sub: ReportSubject; avg: number }[];
  if (p.gpa_min != null) {
    if (!gpaSubs.length) lines.push({ label: '当前 GPA 估算', value: '暂无非 EAP 科目成绩' });
    else {
      const pts = gpaSubs.map(x => ({ name: short(x.sub.name), avg: x.avg, ...gradeOf(x.avg) }));
      const gpa = r1(pts.reduce((a, b) => a + b.points, 0) / pts.length);
      const diff = r1(gpa - p.gpa_min);
      lines.push({
        label: '当前 GPA 估算',
        value: `${gpa}　${diff >= 0 ? `已达到要求（高出 ${diff}）` : `距要求差 ${-diff}`}\n${pts.map(x => `${x.name} ${x.avg}% → ${x.letter}(${x.points})`).join('；')}`,
        tone: diff >= 0.5 ? 'good' : diff >= 0 ? 'warn' : 'bad',
      });
    }
  }
  // EAP
  const eap = subs.find(sub => isEap(sub.name));
  if (p.eap_min != null) {
    if (!eap) lines.push({ label: 'EAP', value: `要求 ${p.eap_min}%，本期暂无 EAP 成绩` });
    else {
      const s = summarizeSubject(eap);
      const ok = s.avg != null && s.avg >= p.eap_min;
      lines.push({
        label: 'EAP',
        value: `当前已出均分 ${s.avg ?? '—'}%，要求 ${p.eap_min}%：${needFor(eap, p.eap_min)}${p.english_alternative ? `\n未达标时的替代条件：${p.english_alternative}` : ''}`,
        tone: s.avg == null ? undefined : ok ? 'good' : 'bad',
      });
    }
  }
  // 必修科目
  if (p.required_subjects.length) {
    const sel = t.selected_subjects || [];
    const hit = p.required_subjects.filter(r => sel.includes(r));
    const status = (name: string) => {
      const sub = subs.find(x => x.name === name);
      if (!sub) return '已选，暂无成绩';
      const s = summarizeSubject(sub);
      return `已选，${LIGHT_LABEL[s.light]}`;
    };
    if (p.required_subjects_mode === 'all') {
      const miss = p.required_subjects.filter(r => !sel.includes(r));
      lines.push({
        label: '必修科目',
        value: `须全部通过：${p.required_subjects.map(r => sel.includes(r) ? `${r}（${status(r)}）` : `${r}（未选）`).join('；')}`,
        tone: miss.length ? 'bad' : 'good',
      });
    } else {
      lines.push({
        label: '必修科目',
        value: `须通过其一（${p.required_subjects.join(' / ')}）：${hit.length ? hit.map(r => `${r}（${status(r)}）`).join('；') : '本人未选任何一门'}`,
        tone: hit.length ? 'good' : 'bad',
      });
    }
  }
  if (p.selection_required && p.entry_type === 'direct' && p.additional_requirements) {
    lines.push({ label: '附加要求', value: p.additional_requirements, tone: 'warn' });
  }
  if (t.note) lines.push({ label: '补充说明', value: t.note });
  return { title: `升学目标对标（UoA ${p.entry_year} 入学要求）`, lines };
}

export function rateStatus(v: number) {
  return v < 93 ? { label: '低于学校线 93%', color: RED } : v < 95 ? { label: '低于合约线 95%', color: RED }
    : v < 97 ? { label: '逼近合约线', color: AMBER } : { label: '正常', color: GREEN };
}

// ───────────────────────── docx 排版件 ─────────────────────────

const border = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
};

// opts 里值为 undefined 的键要剔除：否则会把默认字号覆盖成「未设置」，部分阅读器（WPS/预览）按 12 磅渲染，表格折行
const run = (text: unknown, opts: any = {}) =>
  new TextRun({ text: String(text ?? ''), font: FONT, size: 20, ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)) });

type CellOpt = { bold?: boolean; bg?: string; align?: any; color?: string; size?: number };
function cell(text: unknown, w: number, o: CellOpt = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: o.bg ? { type: ShadingType.CLEAR, fill: o.bg, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    borders: border,
    children: String(text ?? '').split('\n').map(line => new Paragraph({
      alignment: o.align ?? AlignmentType.LEFT,
      children: [run(line, { bold: o.bold, color: o.color, size: o.size })],
    })),
  });
}

// 通用表格：cols=列宽（合计 FULL_W），head=表头，rows=每格 [文本, 选项]
type Cell = string | [string, CellOpt];
function table(cols: number[], head: string[], rows: Cell[][], center: number[] = []) {
  const al = (i: number) => (center.includes(i) ? AlignmentType.CENTER : AlignmentType.LEFT);
  return new Table({
    columnWidths: cols,
    width: { size: cols.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, cols[i], { bold: true, bg: HEAD_BG, align: al(i) })) }),
      ...rows.map(r => new TableRow({
        children: r.map((x, i) => {
          const [t, o] = typeof x === 'string' ? [x, {}] : x;
          return cell(t, cols[i], { align: al(i), ...o });
        }),
      })),
    ],
  });
}

const h1 = (t: string) => new Paragraph({ spacing: { before: 360, after: 120 }, children: [run(t, { bold: true, size: 26, color: '1F3864' })] });
const h2 = (t: string) => new Paragraph({ spacing: { before: 220, after: 80 }, children: [run(t, { bold: true, size: 22 })] });
const p = (t: string, o: any = {}) => new Paragraph({ spacing: { after: 60 }, children: [run(t, o)] });
const muted = (t: string) => p(t, { color: GRAY, size: 18 });
// 「标签：内容」段落，内容为空则不出
const kv = (k: string, v?: string | null, indent = 360) => (v && v.trim()
  ? [new Paragraph({ spacing: { after: 40 }, indent: { left: indent }, children: [run(`${k}：`, { bold: true }), run(v)] })]
  : []);

export interface DocxMeta {
  studentName: string;
  studentNo?: string | null;
  program?: string | null;
}

function header(record: ReportRecord, meta: DocxMeta, fallbackTitle: string) {
  const period = [record.period_start, record.period_end].filter(Boolean).map(d => fmtDate(d)).join(' ~ ');
  // 两行：姓名 / 学号；项目 / 报告周期（同边框的相邻段落在 Word 里合成一个框，线落在第二行下方）
  const line1: TextRun[] = [run(`学生姓名：${meta.studentName}`, { bold: true })];
  if (meta.studentNo) line1.push(run(`　　学号：${meta.studentNo}`));
  const line2 = [meta.program && `项目：${meta.program}`, period && `报告周期：${period}`].filter(Boolean).join('　　');
  const border = { bottom: { style: BorderStyle.SINGLE, size: 6, color: '888888' } };
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [run(record.title || fallbackTitle, { bold: true, size: 32 })] }),
    new Paragraph({ border, spacing: { after: line2 ? 0 : 120 }, children: line1 }),
    ...(line2 ? [new Paragraph({ border, spacing: { after: 120 }, children: [run(line2)] })] : []),
  ];
}

function alertsBlock(c: ReportContent) {
  const a = c.alerts || [];
  return a.length
    ? [p(`需关注：${a.join('；')}`, { color: RED })]
    : [p('本期无预警事项。', { color: GREEN })];
}

function footer(c: ReportContent, note: string) {
  const out: any[] = [h1('综合评价')];
  out.push(c.comment ? p(c.comment) : muted('（待学管填写）'));
  out.push(new Paragraph({ spacing: { before: 360 }, children: [run(note, { size: 18, color: GRAY })] }));
  out.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 240 }, children: [run('NFE 纽菲尔德学术管理中心', { color: GRAY })] }));
  return out;
}

const RISK_CN: Record<string, [string, string]> = { green: ['正常', GREEN], yellow: ['需关注', AMBER], red: ['重点干预', RED] };

// 信纸页眉：尺寸取自模版（EMU ÷ 9525 = 像素）；水印锚在页眉段落上，-30° 斜置、衬于文字下方
const fetchBuf = async (url: string) => new Uint8Array(await (await fetch(url)).arrayBuffer());
let letterheadCache: Promise<{ logo: Uint8Array; contact: Uint8Array; watermark: Uint8Array }> | null = null;
const loadLetterhead = () => (letterheadCache ??= Promise.all([fetchBuf(logoUrl), fetchBuf(contactUrl), fetchBuf(watermarkUrl)])
  .then(([logo, contact, watermark]) => ({ logo, contact, watermark })));

async function letterhead() {
  const img = await loadLetterhead();
  return new Header({
    children: [new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'auto', space: 4 } },
      tabStops: [{ type: TabStopType.RIGHT, position: 9026 }],
      children: [
        new ImageRun({
          type: 'png', data: img.watermark,
          transformation: { width: 530, height: 127, rotation: -30 },
          floating: {
            horizontalPosition: { relative: HorizontalPositionRelativeFrom.COLUMN, offset: 491490 },
            verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: 3992245 },
            behindDocument: true, allowOverlap: true, layoutInCell: true, lockAnchor: false,
            wrap: { type: TextWrappingType.NONE },
          },
        }),
        new ImageRun({ type: 'png', data: img.logo, transformation: { width: 184, height: 44 } }),
        new TextRun({ text: '\t' }),
        new ImageRun({ type: 'jpg', data: img.contact, transformation: { width: 281, height: 46 } }),
      ],
    })],
  });
}

async function doc(children: any[]) {
  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [{
      properties: { page: { margin: { top: 1080, bottom: 1080, left: 1440, right: 1440, header: 708, footer: 708 } } },
      headers: { default: await letterhead() },
      children,
    }],
  });
}

// ───────────────────────── 学术报告 ─────────────────────────

function subjectBlock(sub: ReportSubject) {
  const s = summarizeSubject(sub);
  const cn = cnOf(sub.name);
  const COLS = [2900, 800, 900, 1250, 3176];
  const rows: Cell[][] = sub.nodes.map(n => {
    const pending = n.score == null;
    const low = !pending && n.weight > 0 && (n.score as number) < sub.passMark;
    return [
      n.child ? [`　└ ${n.title}`, { color: '555555' }] : n.title,
      n.child ? [`占该项 ${n.weight}%`, { color: GRAY, size: 18 }] : n.weight > 0 ? `${n.weight}%` : ['待确认', { color: RED }],
      pending ? ['待出', { color: GRAY }] : [`${n.score}%`, { bold: low, color: low ? RED : undefined }],
      fmtDate(n.date),
      [cohortShort(n), { color: GRAY, size: 18 }],
    ];
  });
  rows.push([
    ['已出成绩加权小结', { bold: true, bg: SUM_BG }],
    [`${s.gradedWeight}%`, { bold: true, bg: SUM_BG }],
    [s.avg == null ? '—' : `${s.avg}%`, { bold: true, bg: SUM_BG }],
    [`过线 ${sub.passMark}%`, { bg: SUM_BG }],
    [`剩余 ${s.remaining}% 需均分：${s.need}`, { bg: SUM_BG }],
  ]);

  const out: any[] = [
    h2(cn ? `${sub.name}（${cn}）　过线要求：${sub.passMark}%` : `${sub.name}　过线要求：${sub.passMark}%`),
    table(COLS, ['评估项目', '占比', '得分', '日期', '同批对比'], rows, [1, 2, 3]),
  ];

  // 逐项分析：只写已出分、且有任一说明的节点
  const detailed = sub.nodes.filter(n => n.score != null && (n.cohort || n.exam_focus || n.paper_features || n.advice || n.reflection));
  for (const n of detailed) {
    out.push(new Paragraph({
      spacing: { before: 140, after: 40 },
      children: [run(`▸ ${n.title}`, { bold: true }), run(`（${n.child ? '占该项' : '占比'} ${n.weight}%，得分 ${n.score}%${n.kind ? `，${KIND_CN[n.kind] || n.kind}` : ''}）`, { color: GRAY })],
    }));
    out.push(...kv('层次与差距', cohortText(n)));
    out.push(...kv('考察重点', n.exam_focus));
    out.push(...kv('试卷特点', n.paper_features));
    out.push(...kv('改进指导', n.advice));
    out.push(...kv('学生反思', n.reflection));
  }
  return out;
}

function summarySection(c: ReportContent) {
  const subs = c.subjects || [];
  const out: any[] = [h1('一、本期概览')];
  if (subs.length) {
    out.push(table([2700, 1300, 1100, 1400, 2526], ['科目', '已出成绩均分', '过线要求', '状态', '说明'],
      subs.map(sub => {
        const s = summarizeSubject(sub);
        return [
          cnOf(sub.name) ? `${sub.name}（${cnOf(sub.name)}）` : sub.name,
          s.avg == null ? '—' : `${s.avg}%`, `${sub.passMark}%`,
          [LIGHT_LABEL[s.light], { bold: true, color: LIGHT_COLOR[s.light] }],
          s.verdict,
        ];
      }), [1, 2, 3]));
  }
  const facts: string[] = [];
  // 出勤概况与出勤报告同口径（学校出勤率及变化 / 晚自习 / 请假 / 警告违规）
  facts.push(...attendanceFacts(c));
  if (c.risk_level && RISK_CN[c.risk_level]) facts.push(`综合风险：${RISK_CN[c.risk_level][0]}`);
  if (c.upcoming) facts.push(`未来 4 周有 ${c.upcoming.length} 项考核`);
  if (facts.length) out.push(new Paragraph({ spacing: { before: 120, after: 60 }, children: [run(facts.join('　｜　'))] }));
  out.push(...alertsBlock(c));
  return out;
}

function gapSection(c: ReportContent) {
  const subs = c.subjects || [];
  if (!subs.length) return [];
  // 风险高的排前面：家长先看到最要紧的
  const order: Record<Light, number> = { red: 0, yellow: 1, green: 2, gray: 3 };
  const rows = subs.map(sub => ({ sub, s: summarizeSubject(sub) }))
    .sort((a, b) => order[a.s.light] - order[b.s.light] || (b.s.requiredAvg ?? 0) - (a.s.requiredAvg ?? 0));
  const out: any[] = [
    h1('三、目标差距分析'),
    table([2500, 1100, 1300, 1300, 1500, 1326], ['科目', '过线要求', '已获得分数', '剩余权重', '后续需均分', '状态'],
      rows.map(({ sub, s }) => [
        sub.name, `${sub.passMark}%`, `${s.earned}%`, `${s.remaining}%`, s.need,
        [LIGHT_LABEL[s.light], { bold: true, color: LIGHT_COLOR[s.light] }],
      ]), [1, 2, 3, 4, 5]),
    muted('已获得分数 = 各已出分项目「得分 × 占比」之和（满分 100）；后续需均分 = 达到过线还需在剩余项目中取得的平均分。'),
  ];
  const b = targetBenchmark(c);
  if (b.title) {
    out.push(h2(b.title));
    out.push(table([1800, 7226], ['项目', '情况'], b.lines.map(l => [
      [l.label, { bold: true }],
      [l.value, { color: l.tone === 'bad' ? RED : l.tone === 'warn' ? AMBER : l.tone === 'good' ? GREEN : undefined }],
    ])));
    out.push(muted('GPA 估算：各科（不含 EAP）按已出成绩加权均分换算 UoA 9 分制等级点（A+ ≥90 = 9 … C- ≥50 = 1，<50 = 0）后取平均；未出分项目尚未计入，仅供参考，以学校最终成绩为准。'));
  }
  return out;
}

function upcomingSection(c: ReportContent) {
  if (!c.upcoming) return [];
  const out: any[] = [h1('四、考核日历（未来 4 周）')];
  if (!c.upcoming.length) { out.push(muted('未来 4 周暂无已排期的考核。')); return out; }
  out.push(table([1200, 1700, 2826, 800, 1000, 1500], ['日期', '科目', '考核项目', '占比', '类型', '晚自习备考'],
    c.upcoming.map(u => [fmtDate(u.date), cnOf(u.subject) || u.subject, u.title, u.weight > 0 ? `${u.weight}%` : '—',
      u.kind ? (KIND_CN[u.kind] || u.kind) : '—', [u.prep?.length ? u.prep.join('\n') : '—', { size: 18 }]]),
    [0, 3, 4]));
  return out;
}

export const NIGHT_KIND_CN: Record<string, string> = { exam_prep: '考前课', review: '复习', qa: '答疑', workshop: '写作/批改', intro: '课程导论', admin: '事务' };

// 晚自习课程汇总句：「本期与所选科目相关的晚自习 8 节（考前课 5、答疑 2…），当晚出勤 7 节」
export function nightSummary(ns: NonNullable<ReportContent['night_sessions']>) {
  const byKind = new Map<string, number>();
  ns.forEach(x => byKind.set(x.kind, (byKind.get(x.kind) || 0) + 1));
  const kinds = [...byKind].map(([k, n]) => `${NIGHT_KIND_CN[k] || k} ${n}`).join('、');
  const checked = ns.filter(x => x.attended !== '未点名' && x.attended !== '—');
  const came = checked.filter(x => x.attended === '出勤' || x.attended === '迟到').length;
  const unchecked = ns.length - checked.length;
  return `本期与所选科目相关的晚自习 ${ns.length} 节（${kinds}）`
    + (checked.length ? `，当晚出勤 ${came}/${checked.length} 节` : '')
    + (unchecked ? `${checked.length ? '；' : '，'}${unchecked} 节当晚未点名` : '') + '。';
}

function nightSection(c: ReportContent) {
  const ns = c.night_sessions;
  if (!ns) return [];
  const out: any[] = [h2('晚自习课程')];
  if (!ns.length) { out.push(muted('本期暂无与所选科目相关的晚自习课程。')); return out; }
  out.push(p(nightSummary(ns)));
  out.push(table([1100, 1300, 900, 3326, 1100, 1300], ['日期', '科目', '类型', '内容', '老师', '当晚出勤'],
    ns.map(x => [
      `${fmtDate(x.date)}${x.time ? `\n${x.time}` : ''}`, short(cnOf(x.subject) || x.subject), NIGHT_KIND_CN[x.kind] || x.kind,
      [`${x.topic}${x.exam ? `\n→ ${x.exam}` : ''}`, { size: 18 }], x.teacher || '—',
      [x.attended, { color: x.attended === '缺勤' ? RED : x.attended === '出勤' ? GREEN : x.attended === '未点名' ? GRAY : AMBER }],
    ]), [0, 2, 5]));
  out.push(muted('晚自习为小班课 + 自习形式；「当晚出勤」按晚自习点名记录，表示学生当晚到场。'));
  return out;
}

function sessionsSection(c: ReportContent) {
  const out: any[] = [h1('五、辅导与晚自习'), ...nightSection(c), h2('一对一辅导')];
  const ss = c.sessions;
  if (!ss) {
    // 旧版报告：只有公开反馈
    const fb = c.tutoring_feedback || [];
    if (!fb.length) out.push(muted('本期暂无一对一辅导记录。'));
    fb.forEach(f => out.push(p(`${f.date}　${f.subject}：${f.feedback}`)));
    return out;
  }
  if (!ss.length) { out.push(muted('本期暂无一对一辅导记录。')); return out; }
  const done = ss.filter(x => x.status === '已上');
  const total = r1(done.reduce((a, b) => a + b.hours, 0));
  const bySubj = new Map<string, number>();
  done.forEach(x => bySubj.set(x.subject || '其他', r1((bySubj.get(x.subject || '其他') || 0) + x.hours)));
  out.push(p(`本期共上辅导课 ${done.length} 次、${total} 小时：${Array.from(bySubj).map(([k, v]) => `${k} ${v} 小时`).join('，')}${ss.length > done.length ? `；缺勤 ${ss.length - done.length} 次` : ''}。`));
  out.push(table([1200, 1500, 700, 3726, 1900], ['日期', '科目', '时长', '授课内容与重难点', '重要提醒'],
    ss.map(x => [
      fmtDate(x.date), x.subject, x.status === '已上' ? `${x.hours}h` : ['缺勤', { color: RED }],
      [x.content || x.feedback || '—', { size: 18 }],
      [[x.reminders, x.homework ? `作业：${x.homework}` : ''].filter(Boolean).join('\n') || '—', { size: 18 }],
    ]), [0, 2]));
  const mats = ss.filter(x => x.material);
  if (mats.length) {
    out.push(h2('配套资料'));
    mats.forEach(x => out.push(p(`${fmtDate(x.date)} ${x.subject}：${x.material}`)));
    out.push(muted('资料原件可向负责学管索取。'));
  }
  return out;
}

export function buildAcademicDocx(record: ReportRecord, meta: DocxMeta): Promise<Document> {
  const c = record.content;
  const subjects = c.subjects || [];
  const children: any[] = [...header(record, meta, '学生学业进展报告'), ...summarySection(c), h1('二、各科成绩与分析')];
  if (subjects.length === 0) children.push(muted('（本周期暂无成绩记录）'));
  subjects.forEach(s => children.push(...subjectBlock(s)));
  children.push(...gapSection(c), ...upcomingSection(c), ...sessionsSection(c));
  // 出勤与纪律（旧报告快照没有出勤明细，不出这一节）
  if (c.rate_history || c.leaves || c.night_checks) {
    children.push(h1('六、出勤与纪律'));
    children.push(...attendanceParts(c, h2, ['学校口径出勤率变化', '晚自习出勤', '请假情况', '警告与违规']));
  }
  children.push(...footer(c, `说明：得分标红为低于该科过线分；「待出」为尚未公布成绩；占比标「待确认」的项尚未取得官方评分表权重，暂不计入小结。同批对比基于 NFE 同科同入学批次学生的成绩计算（少于 ${COHORT_MIN_N} 人不做对比），非学校官方年级数据。`));
  return doc(children);
}

// ───────────────────────── 出勤报告 ─────────────────────────

// 出勤各章节：出勤报告单独成文用一级标题（二、三、四、五），学术报告并入「六、出勤与纪律」用二级标题
function attendanceFacts(c: ReportContent): string[] {
  const a = c.attendance || { rate: null, present: 0, absent: 0, leave: 0 };
  const hist = c.rate_history || [];
  const inPeriod = hist.filter(h => h.in_period);
  const before = hist.filter(h => !h.in_period);
  const facts: string[] = [];
  if (a.official_rate != null) {
    const last = inPeriod[inPeriod.length - 1];
    const base = before[before.length - 1] ?? (inPeriod.length > 1 ? inPeriod[0] : undefined);
    const delta = last && base && last !== base ? r1(last.rate - base.rate) : null;
    facts.push(`学校出勤率 ${a.official_rate}%（${rateStatus(a.official_rate).label}${delta == null ? '' : delta === 0 ? '，与上次持平' : `，较上次${delta > 0 ? '上升' : '下降'} ${Math.abs(delta)}`}）`);
  }
  const nsTotal = a.present + a.absent + a.leave + (a.late ?? 0);
  if (nsTotal) facts.push(`晚自习 ${nsTotal} 次，出勤率 ${a.rate ?? '—'}%`);
  if (c.leaves) facts.push(`请假 ${c.leaves.length} 人次`);
  if (c.warnings || c.violations?.length) {
    const disc = (c.warnings?.length || 0) + (c.violations?.length || 0);
    facts.push(disc ? `警告/违规 ${disc} 项` : '无警告/违规');
  }
  return facts;
}

function attendanceParts(c: ReportContent, heading: (t: string) => Paragraph, titles: [string, string, string, string]) {
  const a = c.attendance || { rate: null, present: 0, absent: 0, leave: 0 };
  const hist = c.rate_history || [];
  const before = hist.filter(h => !h.in_period);
  const out: any[] = [];

  // 学校口径出勤率变化
  out.push(heading(titles[0]));
  if (!hist.length) out.push(muted(a.official_rate != null ? `当前学校出勤率 ${a.official_rate}%（暂无历史记录）。` : '暂无学校出勤率记录。'));
  else {
    out.push(table([1400, 1100, 1100, 1700, 3726], ['采集日期', '出勤率', '较上次', '状态', '措施 / 说明'],
      hist.map((h, i) => {
        const prev = hist[i - 1];
        const d = prev ? r1(h.rate - prev.rate) : null;
        const st = rateStatus(h.rate);
        return [
          [fmtDate(h.date), h.in_period ? { bold: true } : { color: GRAY }],
          [`${h.rate}%`, { bold: true, color: st.color }],
          d == null ? '—' : [`${d > 0 ? '↑' : d < 0 ? '↓' : '→'} ${Math.abs(d)}`, { color: d < 0 ? RED : d > 0 ? GREEN : undefined }],
          [st.label, { color: st.color }],
          [h.note || '—', { size: 18 }],
        ];
      }), [0, 1, 2, 3]));
    if (before.length) out.push(muted('灰色日期为本期之前的记录，供对比趋势。合约要求学校出勤率 ≥ 95%，学校红线 93%。'));
  }

  // 晚自习
  out.push(heading(titles[1]));
  const nsTotal = a.present + a.absent + a.leave + (a.late ?? 0);
  if (!nsTotal) out.push(muted('本期暂无晚自习点名记录。'));
  else {
    out.push(table([1805, 1805, 1805, 1805, 1806], ['应到次数', '在场', '迟到', '请假', '缺席'],
      [[String(nsTotal), String(a.present), String(a.late ?? 0), String(a.leave), [String(a.absent), { bold: a.absent > 0, color: a.absent > 0 ? RED : undefined }]]],
      [0, 1, 2, 3, 4]));
    const ab = c.night_checks || [];
    if (ab.length) {
      out.push(p('异常记录：', { bold: true }));
      out.push(table([1600, 1400, 6026], ['日期', '状态', '备注'],
        ab.map(x => [fmtDate(x.date), [x.status, { color: x.status === '缺席' ? RED : AMBER }], x.note || '—']), [0, 1]));
    } else out.push(p('本期晚自习无迟到、请假、缺席记录。', { color: GREEN }));
  }

  // 请假
  out.push(heading(titles[2]));
  const lv = c.leaves;
  if (!lv) out.push(muted('（本报告生成时未统计请假）'));
  else if (!lv.length) out.push(muted('本期无请假记录。'));
  else {
    const byType = new Map<string, number>();
    lv.forEach(l => byType.set(l.type, (byType.get(l.type) || 0) + 1));
    out.push(p(`本期请假 ${lv.length} 人次：${Array.from(byType).map(([k, v]) => `${k} ${v} 次`).join('，')}。`));
    out.push(table([800, 2300, 1000, 2326, 1100, 1500], ['类型', '起止时间', '时长', '事由', '审批', '证明材料'],
      lv.map(l => [
        l.type, [`${l.start}\n~ ${l.end}`, { size: 18 }], l.duration, l.reason || '—',
        [`${l.status}${l.approver ? `\n${l.approver}` : ''}`, { size: 18, color: l.status === '已批准' ? undefined : AMBER }],
        l.has_proof ? '已提交' : (l.type === '病假' ? ['未提交', { color: RED }] : '—'),
      ]), [0, 2, 4, 5]));
  }

  // 警告与违规
  out.push(heading(titles[3]));
  const ws = c.warnings || [];
  const vs = c.violations || [];
  if (!ws.length && !vs.length) out.push(p('本期无警告信与违规记录。', { color: GREEN }));
  ws.forEach(w => out.push(p(`${fmtDate(w.date)}　${w.source}警告信（${w.level} 级）${w.category ? `：${w.category}` : ''}`, { color: RED })));
  vs.forEach(v => out.push(p(`${fmtDate(v.date)}　${v.type}${v.note ? `：${v.note}` : ''}`)));
  return out;
}

export function buildAttendanceDocx(record: ReportRecord, meta: DocxMeta): Promise<Document> {
  const c = record.content;
  const children: any[] = [...header(record, meta, '学生出勤情况报告'), h1('一、本期概览')];
  children.push(p(attendanceFacts(c).join('　｜　')));
  children.push(muted('合约要求学校出勤率 ≥ 95%，学校红线 93%。'));
  children.push(...alertsBlock(c));
  children.push(...attendanceParts(c, h1, ['二、学校口径出勤率变化', '三、晚自习情况', '四、请假情况', '五、警告与违规']));
  children.push(...footer(c, '说明：学校出勤率以学校账户数据为准，由学管定期采集；晚自习与请假为 NFE 内部记录。'));
  return doc(children);
}

// ───────────────────────── 下载 ─────────────────────────

export async function downloadReportDocx(record: ReportRecord, meta: DocxMeta): Promise<void> {
  const isAcademic = record.report_type === 'monthly';
  const d = await (isAcademic ? buildAcademicDocx(record, meta) : buildAttendanceDocx(record, meta));
  const blob = await Packer.toBlob(d);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${isAcademic ? '学术报告' : '出勤报告'}--${meta.studentName}${record.period_end ? '-' + record.period_end : ''}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
// 兼容旧调用点
export const downloadAcademicDocx = downloadReportDocx;
