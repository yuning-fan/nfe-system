// 学术报告 Word 导出 —— 版式对齐线下《成绩记录表》：
// 学生信息行 → 各科小标题 + 表格(评估项|占比|得分|记录时间|措施) + 加权小结行
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, ShadingType, BorderStyle,
} from 'docx';
import type { ReportRecord, ReportSubject } from '../store/useReportStore';

const COLS = [3100, 800, 1000, 1250, 2876];        // 合计 9026 = A4 正文宽
const TOTAL_W = COLS.reduce((a, b) => a + b, 0);
const HEAD_BG = 'D9E2F3';
const SUM_BG = 'F2F2F2';
const FONT = '微软雅黑';

// 科目中英对照统一放在 lib/subjectNames.ts（资料库等处共用）
import { cnOf } from './subjectNames';
export { cnOf };

const border = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' },
};

const run = (text: unknown, opts: any = {}) =>
  new TextRun({ text: String(text ?? ''), font: FONT, size: 20, ...opts });

function cell(text: unknown, o: { w: number; bold?: boolean; bg?: string; align?: any; color?: string }) {
  return new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    shading: o.bg ? { type: ShadingType.CLEAR, fill: o.bg, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    borders: border,
    children: [new Paragraph({
      alignment: o.align ?? AlignmentType.LEFT,
      children: [run(text, { bold: o.bold, color: o.color })],
    })],
  });
}

// 加权小结：与 gradeCalc / computeRequirement 同口径
// 导出给预览页复用，确保「系统里看到的」与「导出的 Word」完全一致
export function summarizeSubject(sub: ReportSubject) {
  const scored = sub.nodes.filter(n => n.weight > 0 && n.score != null);
  const gradedWeight = scored.reduce((s, n) => s + n.weight, 0);
  const earned = scored.reduce((s, n) => s + (n.weight / 100) * (n.score as number), 0);
  const remaining = Math.round((100 - gradedWeight) * 10) / 10;
  const gap = Math.round((sub.passMark - earned) * 10) / 10;
  let need = '—';
  if (remaining > 0 && gap > 0) {
    const r = Math.round((gap / remaining) * 1000) / 10;
    need = r > 100 ? `已无法达线（差 ${gap} 分）` : String(r);
  } else if (remaining > 0) {
    need = '已锁定过线';
  }
  return {
    gradedWeight: Math.round(gradedWeight * 10) / 10,
    avg: gradedWeight ? Math.round((earned / gradedWeight) * 1000) / 10 : null,
    remaining, need,
  };
}

export const fmtDate = (d?: string | null) => (d ? d.slice(0, 10).replace(/-/g, '/') : '—');

function subjectBlock(sub: ReportSubject) {
  const s = summarizeSubject(sub);
  const cn = cnOf(sub.name);
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        cell('评估项', { w: COLS[0], bold: true, bg: HEAD_BG }),
        cell('占比', { w: COLS[1], bold: true, bg: HEAD_BG, align: AlignmentType.CENTER }),
        cell('得分', { w: COLS[2], bold: true, bg: HEAD_BG, align: AlignmentType.CENTER }),
        cell('记录时间', { w: COLS[3], bold: true, bg: HEAD_BG, align: AlignmentType.CENTER }),
        cell('措施', { w: COLS[4], bold: true, bg: HEAD_BG }),
      ],
    }),
    ...sub.nodes.map(n => {
      const pending = n.score == null;
      const low = !pending && n.weight > 0 && (n.score as number) < sub.passMark;
      return new TableRow({
        children: [
          cell(n.title, { w: COLS[0] }),
          cell(n.weight > 0 ? `${n.weight}%` : '待确认', {
            w: COLS[1], align: AlignmentType.CENTER,
            color: n.weight > 0 ? undefined : 'C00000',
          }),
          cell(pending ? '待录' : `${n.score}%`, {
            w: COLS[2], align: AlignmentType.CENTER,
            bold: low, color: low ? 'C00000' : pending ? '808080' : undefined,
          }),
          cell(fmtDate(n.date), { w: COLS[3], align: AlignmentType.CENTER }),
          cell('', { w: COLS[4] }),   // 措施：留空，导出后由学管手填

        ],
      });
    }),
    new TableRow({
      children: [
        cell('已出成绩加权小结', { w: COLS[0], bold: true, bg: SUM_BG }),
        cell(`${s.gradedWeight}%`, { w: COLS[1], bold: true, bg: SUM_BG, align: AlignmentType.CENTER }),
        cell(s.avg == null ? '—' : `${s.avg}%`, { w: COLS[2], bold: true, bg: SUM_BG, align: AlignmentType.CENTER }),
        cell(`过线 ${sub.passMark}`, { w: COLS[3], bg: SUM_BG, align: AlignmentType.CENTER }),
        cell(`剩余 ${s.remaining}% 需均分：${s.need}`, { w: COLS[4], bg: SUM_BG }),
      ],
    }),
  ];

  return [
    new Paragraph({
      spacing: { before: 240, after: 100 },
      children: [run(cn ? `${sub.name}（${cn}）` : sub.name, { bold: true, size: 24 })],
    }),
    new Table({ columnWidths: COLS, width: { size: TOTAL_W, type: WidthType.DXA }, rows }),
  ];
}

export interface DocxMeta {
  studentName: string;
  studentNo?: string | null;
  program?: string | null;
}

export function buildAcademicDocx(record: ReportRecord, meta: DocxMeta): Document {
  const subjects = record.content.subjects || [];
  const period = [record.period_start, record.period_end].filter(Boolean).join(' ~ ');

  const info: TextRun[] = [run(`学生姓名：${meta.studentName}`, { bold: true })];
  if (meta.studentNo) info.push(run(`　　学号：${meta.studentNo}`));
  if (meta.program) info.push(run(`　　项目：${meta.program}`));
  if (period) info.push(run(`　　周期：${period}`));

  const children: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [run(record.title || '学生学业成绩记录表', { bold: true, size: 32 })],
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '888888' } },
      spacing: { after: 200 },
      children: info,
    }),
    new Paragraph({ spacing: { after: 60 }, children: [run('科目成绩：', { bold: true, size: 24 })] }),
  ];

  if (subjects.length === 0) {
    children.push(new Paragraph({ children: [run('（本周期暂无成绩记录）', { color: '808080' })] }));
  } else {
    subjects.forEach(s => children.push(...subjectBlock(s)));
  }

  // 辅导反馈（有则附上）
  const fb = record.content.tutoring_feedback || [];
  if (fb.length > 0) {
    children.push(new Paragraph({ spacing: { before: 360, after: 100 }, children: [run('辅导课反馈：', { bold: true, size: 24 })] }));
    fb.forEach(f => children.push(new Paragraph({
      spacing: { after: 60 },
      children: [run(`${f.date}　${f.subject}：${f.feedback}`)],
    })));
  }

  // 老师综合评价
  if (record.content.comment) {
    children.push(new Paragraph({ spacing: { before: 360, after: 100 }, children: [run('综合评价：', { bold: true, size: 24 })] }));
    children.push(new Paragraph({ children: [run(record.content.comment)] }));
  }

  children.push(new Paragraph({
    spacing: { before: 360 },
    children: [run('说明：得分标红为低于该科过线分；占比标「待确认」的项尚未取得官方评分表权重，暂不计入加权小结。', { size: 18, color: '808080' })],
  }));

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [{
      properties: { page: { margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 } } },
      children,
    }],
  });
}

// 浏览器端下载
export async function downloadAcademicDocx(record: ReportRecord, meta: DocxMeta): Promise<void> {
  const blob = await Packer.toBlob(buildAcademicDocx(record, meta));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `学术报告--${meta.studentName}${record.period_end ? '-' + record.period_end : ''}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
