// 学管 · 内部警告信生成（出勤版，两级：提醒信 / 正式警告信）
// 选学生 + 级别 → 自动填 姓名/出勤率/日期 → 在线编辑 → 导出 Word(.doc)
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { message, Select } from 'antd';
import { IconFileDownload } from '@tabler/icons-react';
import { Section } from '../ui';

const db = supabase as any;

const SIGN = 'NFE 纽菲尔德学术管理中心';
const todayCN = () => { const d = new Date(); return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`; };

function buildLetter(level: 1 | 2, name: string, rate: number | null) {
  const r = rate != null ? `${rate}%` : '（待填）';
  if (level === 1) {
    return {
      title: `关于 ${name} 出勤情况的提醒`,
      body:
`${name} 同学及家长：

根据 NFE 学术管理中心近期记录，${name} 同学近期出勤情况出现波动（当前出勤率约 ${r}）。本次为第一封提醒，主要起提醒作用，旨在帮助学生及时关注自身出勤，尽快调整学习状态。良好的出勤是顺利完成课程的重要基础，持续缺勤可能影响课程进度与后续学业安排。

希望学生重视本次提醒，在接下来的学习中保持正常出勤，按时参加课程及相关学习活动。NFE 学术管理中心将持续关注并与学生保持沟通，共同协助改善。

${SIGN}
${todayCN()}`,
    };
  }
  return {
    title: `关于 ${name} 同学出勤情况的警告信`,
    body:
`${name} 同学及家长：

近期 ${name} 同学在学习态度与日常管理方面出现较明显的懈怠，多次出现缺勤、旷课等问题。我们已多次与学生沟通、提醒与劝导，但截至目前情况未见明显改善。

根据最新记录，${name} 同学当前出勤率已降至 ${r}，低于学校及新西兰移民局对国际学生的基本出勤要求（95%）。现正式发出警告，望学生及家长高度重视，尽快调整学习态度，按时到校上课，积极配合学校及学术管理团队的要求。

若后续仍出现无故缺勤、旷课等情况，我方将采取进一步管理措施（加强出勤监督、强制学习监管及重新评估后续管理安排）。

${SIGN}
${todayCN()}`,
  };
}

function exportDoc(title: string, body: string) {
  const paras = body.split('\n').map(line => `<p style="margin:0 0 8px;">${line ? line.replace(/&/g, '&amp;').replace(/</g, '&lt;') : '&nbsp;'}</p>`).join('');
  const html =
    `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset="utf-8"></head>` +
    `<body style="font-family:SimSun,'宋体',serif;font-size:14px;line-height:2;">` +
    `<h2 style="text-align:center;font-family:SimHei,'黑体',sans-serif;">${title}</h2>${paras}</body></html>`;
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${title}.doc`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function WarningLetterGen() {
  const [students, setStudents] = useState<{ id: string; name: string; rate: number | null }[]>([]);
  const [sid, setSid] = useState<string | undefined>();
  const [level, setLevel] = useState<1 | 2>(1);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = useCallback(async () => {
    const { data } = await db.from('students_info').select('student_id, school_attendance_rate, profiles(full_name)');
    setStudents(((data || []) as any[]).map(i => ({
      id: i.student_id,
      name: Array.isArray(i.profiles) ? i.profiles[0]?.full_name : i.profiles?.full_name,
      rate: i.school_attendance_rate,
    })).filter(s => s.name).sort((a, b) => a.name.localeCompare(b.name, 'zh')));
  }, []);
  useEffect(() => { load(); }, [load]);

  const regen = (studentId?: string, lv?: 1 | 2) => {
    const s = students.find(x => x.id === (studentId ?? sid));
    if (!s) return;
    const t = buildLetter(lv ?? level, s.name, s.rate);
    setTitle(t.title); setBody(t.body);
  };

  const onPickStudent = (v: string) => { setSid(v); regen(v, level); };
  const onPickLevel = (v: 1 | 2) => { setLevel(v); regen(sid, v); };

  const doExport = () => {
    if (!sid) { message.warning('请先选择学生'); return; }
    exportDoc(title, body);
  };

  return (
    <Section title="警告信生成（出勤）" hint="选学生+级别自动填充，可在线编辑后导出 Word（.doc）打印">
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <Select showSearch optionFilterProp="label" style={{ width: 220 }} placeholder="选择学生"
          value={sid} onChange={onPickStudent}
          options={students.map(s => ({ label: `${s.name}${s.rate != null ? `（出勤${s.rate}%）` : ''}`, value: s.id }))} />
        <Select style={{ width: 160 }} value={level} onChange={onPickLevel}
          options={[{ label: '第一封·提醒信', value: 1 }, { label: '第二封·正式警告信', value: 2 }]} />
        <button className="btn btn-primary" onClick={doExport} disabled={!sid}>
          <IconFileDownload size={16} style={{ marginRight: 6 }} />导出 Word
        </button>
      </div>

      {sid ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label className="form-label">标题</label>
            <input className="input" style={{ width: '100%' }} value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="form-label">正文（可编辑）</label>
            <textarea className="input" style={{ width: '100%', height: 360, fontFamily: 'inherit', lineHeight: 1.9 }}
              value={body} onChange={e => setBody(e.target.value)} />
          </div>
        </div>
      ) : (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>选择学生后自动生成信件草稿，可编辑再导出。</div>
      )}
    </Section>
  );
}
