// 学管周看板 · DDL 中心：本周名下学生的考核截止（按节点聚合，列涉及学生）/ 证件到期
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useVisibleStudents } from '../../lib/useVisibleStudents';
import { IconLoader2, IconChevronLeft, IconChevronRight, IconTargetArrow, IconId, IconCake } from '@tabler/icons-react';
import { Section } from '../ui';
import { resolveNodeDate, type IntakeDate } from '../../lib/intakeDates';

const db = supabase as any;

function weekRange(offset: number) {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 周一=0
  const monday = new Date(now); monday.setDate(now.getDate() - day + offset * 7); monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mdCn = (s: string) => { const d = new Date(s + 'T00:00:00'); return `${d.getMonth() + 1}/${d.getDate()} ${'日一二三四五六'[d.getDay()]}`; };

interface Item {
  date: string;
  kind: '考核' | '证件' | '生日';
  title: string;
  students: { id: string; name: string; unverified?: boolean }[];   // 考核：涉及学生（unverified=批次日期待核）；证件/生日：单个学生
  note?: string;                                // 证件：到期/已过期
}

export function WeeklyBoard() {
  const { ids: scopeIds, ready } = useVisibleStudents();
  const nav = useNavigate();
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    const { monday, sunday } = weekRange(offset);
    const s = ymd(monday), e = ymd(sunday), today = ymd(new Date());
    const scope = scopeIds;
    const list: Item[] = [];

    const nameMap: Record<string, string> = {};
    const profQ = db.from('profiles').select('id, full_name').eq('role', 'student');
    const { data: profs } = await (scope ? profQ.in('id', scope) : profQ);
    (profs || []).forEach((p: any) => { nameMap[p.id] = p.full_name; });
    const inScope = (sid: string) => !scope || scope.includes(sid);

    // 1) 考核截止（本周）——节点日期按学生所在入学批次解析（milestone_intake_dates），按「节点 × 实际日期」聚合列涉及学生
    //    候选节点 = 默认日期落在本周 ∪ 有批次单独日期落在本周；再逐生算实际日期，落在本周才列入
    const [{ data: baseMs }, { data: weekOverrides }] = await Promise.all([
      db.from('academic_milestones').select('id').gte('due_date', s).lte('due_date', e),
      db.from('milestone_intake_dates').select('milestone_id').gte('due_date', s).lte('due_date', e),
    ]);
    const candIds = Array.from(new Set([
      ...(baseMs || []).map((x: any) => x.id),
      ...(weekOverrides || []).map((x: any) => x.milestone_id),
    ]));
    if (candIds.length) {
      const [{ data: ms }, { data: allOverrides }] = await Promise.all([
        db.from('academic_milestones')
          .select('id, title, due_date, due_time, program_subject_id, program_subjects(subject_name, node_dates_intake)')
          .in('id', candIds),
        db.from('milestone_intake_dates').select('milestone_id, intake_start, due_date, due_time').in('milestone_id', candIds),
      ]);
      const milestones = (ms || []) as any[];
      const overrides = (allOverrides || []) as IntakeDate[];
      const psIds = Array.from(new Set(milestones.map(m => m.program_subject_id).filter(Boolean)));
      const { data: sels } = psIds.length
        ? await db.from('student_subject_selections')
            .select('program_subject_id, status, student_enrollments!student_subject_selections_enrollment_id_fkey!inner(student_id, start_date)')
            .in('program_subject_id', psIds)
        : { data: [] };
      // 科目 → 名下选了这科的学生及其批次
      const subjStudents: Record<number, { sid: string; intake: string | null }[]> = {};
      (sels || []).forEach((x: any) => {
        if (x.status === 'dropped') return;
        const en = Array.isArray(x.student_enrollments) ? x.student_enrollments[0] : x.student_enrollments;
        const sid = en?.student_id;
        if (!sid || !inScope(sid)) return;
        const arr = (subjStudents[x.program_subject_id] ||= []);
        if (!arr.some(a => a.sid === sid)) arr.push({ sid, intake: en?.start_date ?? null });
      });
      const grouped: Record<string, Item> = {};
      for (const m of milestones) {
        const subj = Array.isArray(m.program_subjects) ? m.program_subjects[0] : m.program_subjects;
        for (const st of subjStudents[m.program_subject_id] || []) {
          const r = resolveNodeDate(m, st.intake, overrides, subj?.node_dates_intake);
          if (!r.due_date || r.due_date < s || r.due_date > e) continue;
          const key = `${m.id}|${r.due_date}`;
          const item = (grouped[key] ||= { date: r.due_date, kind: '考核', title: `${subj?.subject_name || ''} · ${m.title}`, students: [] });
          item.students.push({ id: st.sid, name: nameMap[st.sid] || '—', unverified: r.date_source === 'unverified' });
        }
      }
      for (const it of Object.values(grouped)) {
        it.students.sort((x, y) => x.name.localeCompare(y.name, 'zh'));
        if (it.students.some(x => x.unverified)) it.note = '含日期待核';
        list.push(it);
      }
    }

    // 2) 证件到期（本周）——每个学生一条
    let docQ = db.from('student_documents').select('student_id, doc_type, expiry_date').gte('expiry_date', s).lte('expiry_date', e);
    if (scope) docQ = docQ.in('student_id', scope);
    const { data: docs } = await docQ;
    (docs || []).forEach((d: any) => {
      if (!inScope(d.student_id)) return;
      list.push({
        date: d.expiry_date, kind: '证件', title: `证件到期：${d.doc_type || ''}`,
        students: [{ id: d.student_id, name: nameMap[d.student_id] || '—' }],
        note: d.expiry_date < today ? '已过期' : '到期',
      });
    });

    // 3) 本周生日提醒（仅 admin：scope=null）
    if (scope === null) {
      const mmddToDate: Record<string, string> = {};
      for (let k = 0; k < 7; k++) { const dt = new Date(monday); dt.setDate(monday.getDate() + k); mmddToDate[ymd(dt).slice(5)] = ymd(dt); }
      const { data: infos } = await db.from('students_info').select('student_id, date_of_birth').not('date_of_birth', 'is', null);
      (infos || []).forEach((r: any) => {
        const dd = mmddToDate[(r.date_of_birth || '').slice(5, 10)];
        if (dd) list.push({ date: dd, kind: '生日', title: '🎂 生日', students: [{ id: r.student_id, name: nameMap[r.student_id] || '—' }] });
      });
    }

    list.sort((a, b) => a.date.localeCompare(b.date));
    setItems(list);
    setLoading(false);
  }, [offset, ready, scopeIds]);
  useEffect(() => { load(); }, [load]);

  const { monday, sunday } = weekRange(offset);
  const todayY = ymd(new Date());
  const tomorrowY = ymd(new Date(Date.now() + 86400000));
  const soonCount = items.filter(i => i.date === todayY || i.date === tomorrowY).length;
  const days = Array.from(new Set(items.map(i => i.date))).sort();

  const row = (i: Item, idx: number) => (
    <div key={idx} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: idx ? '1px solid var(--color-border-tertiary)' : 'none' }}>
      {i.kind === '考核' ? <IconTargetArrow size={15} style={{ color: 'var(--color-primary)', marginTop: 2, flexShrink: 0 }} />
        : i.kind === '生日' ? <IconCake size={15} style={{ color: '#c2410c', marginTop: 2, flexShrink: 0 }} />
        : <IconId size={15} style={{ color: 'var(--color-text-tertiary)', marginTop: 2, flexShrink: 0 }} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {i.title}
          {i.note && <span className={`pill ${i.note === '已过期' ? 'p-red' : 'p-amber'}`} style={{ marginLeft: 8, fontSize: 10 }}>{i.note}</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
          {i.kind === '考核' && <span style={{ color: 'var(--color-text-tertiary)' }}>涉及 {i.students.length} 人：</span>}
          {i.students.map((st, k) => (
            <span key={st.id}>
              <span className="link" onClick={() => nav(`/students/${st.id}`)}>{st.name}</span>{st.unverified && <span style={{ color: '#854F0B', fontSize: 11 }}>（日期待核）</span>}{k < i.students.length - 1 ? '、' : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => setOffset(o => o - 1)}><IconChevronLeft size={16} /></button>
        <span style={{ fontWeight: 600 }}>{ymd(monday).slice(5)} ~ {ymd(sunday).slice(5)}{offset === 0 ? ' · 本周' : ''}</span>
        <button className="btn" onClick={() => setOffset(o => o + 1)}><IconChevronRight size={16} /></button>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 13 }}>
          <span>本周 DDL <b>{items.length}</b></span>
          <span>今明到期 <b>{soonCount}</b></span>
        </span>
      </div>

      <Section title="本周 DDL 时间线" hint="名下学生的考核截止（按考核列出涉及学生）/ 证件到期。点学生名进档案。">
        {days.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>本周名下学生暂无 DDL。</div>
        ) : days.map(d => (
          <div key={d} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: d === todayY ? 'var(--color-primary)' : 'var(--color-text-secondary)', margin: '6px 0' }}>
              {mdCn(d)}{d === todayY ? ' · 今天' : ''}
            </div>
            {items.filter(i => i.date === d).map((i, idx) => row(i, idx))}
          </div>
        ))}
      </Section>

      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
        提示：考核截止依据「考核节点」的日期，并按学生所在入学批次取值；「日期待核」表示该生批次尚未单独设置日期，显示的是默认批次的日期。节点日期未配好会不显示。
      </div>
    </div>
  );
}
