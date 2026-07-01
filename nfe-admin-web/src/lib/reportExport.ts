// 报告导出 Word(.doc) —— 浏览器原生，零依赖
import type { ReportRecord } from '../store/useReportStore';

const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function exportReportDoc(r: ReportRecord) {
  const c: any = r.content || {};
  const isAcademic = r.report_type === 'monthly';
  const period = r.period_start && r.period_end ? `${r.period_start} 至 ${r.period_end}` : '—';
  const sec = (title: string, body: string) =>
    `<h3 style="border-left:4px solid #444;padding-left:8px;margin:16px 0 6px;">${esc(title)}</h3>${body}`;

  const alertsHtml = (c.alerts && c.alerts.length)
    ? `<div style="border:1px solid #d33;background:#fff5f5;padding:8px 12px;margin:8px 0;">
         <b>需关注：</b>${(c.alerts as string[]).map(esc).join('；')}</div>`
    : `<div style="color:#2a2;">本期表现正常。</div>`;

  let body = '';
  if (isAcademic) {
    const subj = (c.subjects || []) as any[];
    body += sec('学术表现（各科总评）', subj.length ? subj.map(s =>
      `<p style="margin:6px 0;"><b>${esc(s.name)}</b>：总评 ${s.total != null ? s.total : '进行中'} / 过线 ${s.passMark}
        ${s.pass == null ? '' : s.pass ? '（已过线）' : '（未过线）'}<br/>` +
      `<span style="color:#666;font-size:13px;">` +
      (s.nodes || []).map((n: any) => `${esc(n.title)}(${n.weight}%): ${n.score == null ? '待录' : n.score}`).join('　') +
      `</span></p>`).join('') : '本期暂无成绩。');
    const fb = (c.tutoring_feedback || []) as any[];
    body += sec('辅导课反馈', fb.length ? fb.map(f => `<p style="margin:4px 0;">${esc(f.date)} ${esc(f.subject)}：${esc(f.feedback)}</p>`).join('') : '本期暂无辅导反馈。');
  } else {
    body += sec('出勤情况',
      `<p>官方出勤率：${c.attendance?.official_rate != null ? c.attendance.official_rate + '%' : '—'}
        （合约要求 ≥95%）　内部点名出勤率：${c.attendance?.rate != null ? c.attendance.rate + '%' : '—'}<br/>
        在场 ${c.attendance?.present ?? 0}　缺席 ${c.attendance?.absent ?? 0}　请假 ${c.attendance?.leave ?? 0}</p>`);
    const v = (c.violations || []) as any[];
    body += sec('违规情况', v.length ? v.map(x => `<p style="margin:4px 0;">${esc(x.date)} ${esc(x.type)} ${esc(x.note)}</p>`).join('') : '本期无违规记录。');
  }
  body += sec('老师综合评价', `<p>${esc(c.comment) || '—'}</p>`);

  const html =
    `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"></head>` +
    `<body style="font-family:SimSun,'宋体',serif;font-size:14px;line-height:1.8;">` +
    `<h2 style="text-align:center;">${esc(r.title || (isAcademic ? '学术月报' : '出勤双周报'))}</h2>` +
    `<div style="text-align:center;color:#666;">${esc(r.student?.full_name || '')} · 报告周期 ${esc(period)}</div>` +
    sec('预警提示', alertsHtml) + body +
    `<p style="text-align:right;margin-top:24px;color:#666;">NFE 纽菲尔德学术管理中心</p></body></html>`;

  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${r.title || '报告'}.doc`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
