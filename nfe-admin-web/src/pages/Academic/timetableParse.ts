// 课表粘贴解析：把「星期 开始 结束 科目 [教室]」的表格文本转成课节。
// 分隔符同时支持制表符（从 Excel/表格复制）和 2 个以上空格（从聊天记录/文本对齐粘贴）。
// 纯函数，不碰 React，便于单测。

export interface ParsedRow {
  line: number;            // 原文行号，报错时指给用户看
  day_of_week: number;
  start_time: string;      // HH:mm
  end_time: string;
  subject: string;         // 原文里的科目写法
  program_subject_id: number | null;
  room: string | null;
}

export interface ParseError { line: number; text: string; reason: string }

export interface ParseResult { rows: ParsedRow[]; errors: ParseError[] }

const DAY_MAP: Record<string, number> = {
  '周一': 1, '星期一': 1, '礼拜一': 1, '一': 1, 'mon': 1, 'monday': 1, '1': 1,
  '周二': 2, '星期二': 2, '礼拜二': 2, '二': 2, 'tue': 2, 'tues': 2, 'tuesday': 2, '2': 2,
  '周三': 3, '星期三': 3, '礼拜三': 3, '三': 3, 'wed': 3, 'wednesday': 3, '3': 3,
  '周四': 4, '星期四': 4, '礼拜四': 4, '四': 4, 'thu': 4, 'thur': 4, 'thurs': 4, 'thursday': 4, '4': 4,
  '周五': 5, '星期五': 5, '礼拜五': 5, '五': 5, 'fri': 5, 'friday': 5, '5': 5,
  '周六': 6, '星期六': 6, '礼拜六': 6, '六': 6, 'sat': 6, 'saturday': 6, '6': 6,
  '周日': 7, '周天': 7, '星期日': 7, '星期天': 7, '日': 7, '天': 7, 'sun': 7, 'sunday': 7, '7': 7,
};

// 全角标点/空格归一化，粘贴中文表格时常见
const normalize = (s: string) =>
  s.replace(/[　]/g, ' ').replace(/[：]/g, ':').trim();

export function parseDay(raw: string): number | null {
  const k = normalize(raw).toLowerCase().replace(/[.\s]/g, '');
  return DAY_MAP[k] ?? null;
}

// 认 9:00 / 09:00 / 9.00 / 9am / 1:30pm / 0900
export function parseTime(raw: string): string | null {
  let t = normalize(raw).toLowerCase().replace(/\s/g, '');
  let pm = false, am = false;
  if (t.endsWith('pm')) { pm = true; t = t.slice(0, -2); }
  else if (t.endsWith('am')) { am = true; t = t.slice(0, -2); }

  let h: number, m: number;
  const withSep = t.match(/^(\d{1,2})[:.](\d{2})$/);
  const bare = t.match(/^(\d{3,4})$/);
  const hourOnly = t.match(/^(\d{1,2})$/);
  if (withSep) { h = +withSep[1]; m = +withSep[2]; }
  else if (bare) { const v = bare[1].padStart(4, '0'); h = +v.slice(0, 2); m = +v.slice(2); }
  else if (hourOnly) { h = +hourOnly[1]; m = 0; }
  else return null;

  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// 表头行（第一列是「星期」之类）直接跳过
const isHeader = (cells: string[]) =>
  /^(星期|周$|day|weekday)/i.test(cells[0] || '') && parseDay(cells[0] || '') === null;

/**
 * @param text     粘贴的原文
 * @param subjects 该学生已选科目 [{ value: program_subject_id, label: subject_name }]
 */
export function parseTimetable(
  text: string,
  subjects: { value: number; label: string }[],
): ParseResult {
  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];

  // 科目按小写去空格匹配，容忍 "maths" ↔ "Maths"、多余空格
  const key = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  const byKey = new Map(subjects.map(s => [key(s.label), s.value]));

  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = i + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) return;

    // 制表符优先；没有制表符时用 2 个以上空格切（科目名里可能含单个空格）
    const cells = (trimmed.includes('\t') ? trimmed.split('\t') : trimmed.split(/\s{2,}/))
      .map(c => normalize(c)).filter(c => c !== '');

    if (isHeader(cells)) return;

    if (cells.length < 4) {
      errors.push({ line, text: trimmed, reason: `只认出 ${cells.length} 列，至少需要 星期/开始/结束/科目 四列（列之间用 Tab 或 2 个以上空格隔开）` });
      return;
    }

    const [dayCell, startCell, endCell, subjectCell, roomCell] = cells;
    const day = parseDay(dayCell);
    const start = parseTime(startCell);
    const end = parseTime(endCell);

    if (day === null) { errors.push({ line, text: trimmed, reason: `看不懂星期「${dayCell}」` }); return; }
    if (!start) { errors.push({ line, text: trimmed, reason: `看不懂开始时间「${startCell}」` }); return; }
    if (!end) { errors.push({ line, text: trimmed, reason: `看不懂结束时间「${endCell}」` }); return; }
    if (start >= end) { errors.push({ line, text: trimmed, reason: `结束时间不晚于开始时间（${start} → ${end}）` }); return; }

    const sid = byKey.get(key(subjectCell)) ?? null;
    if (sid === null) {
      errors.push({ line, text: trimmed, reason: `科目「${subjectCell}」不在该学生的选课里。可选：${subjects.map(s => s.label).join('、') || '（该学生还没选课）'}` });
      return;
    }

    rows.push({
      line, day_of_week: day, start_time: start, end_time: end,
      subject: subjectCell, program_subject_id: sid,
      room: roomCell ? roomCell : null,
    });
  });

  return { rows, errors };
}

/** 同一天时间区间相交的行号（首尾相接不算冲突） */
export function conflictLines(rows: ParsedRow[]): Set<number> {
  const bad = new Set<number>();
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i], b = rows[j];
      if (a.day_of_week !== b.day_of_week) continue;
      if (a.start_time < b.end_time && b.start_time < a.end_time) { bad.add(a.line); bad.add(b.line); }
    }
  }
  return bad;
}

export const DAY_LABEL = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 已有课表 → 粘贴框文本，便于在原地改了再存 */
export function rowsToText(
  rows: { day_of_week: number; start_time: string; end_time: string; room?: string | null; subject: string }[],
): string {
  return rows
    .slice()
    .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
    .map(r => [DAY_LABEL[r.day_of_week], r.start_time.slice(0, 5), r.end_time.slice(0, 5), r.subject, r.room || '']
      .filter((c, i) => i < 4 || c).join('\t'))
    .join('\n');
}
