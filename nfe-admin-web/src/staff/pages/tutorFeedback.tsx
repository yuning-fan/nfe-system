// 巡查 · 辅导反馈（只读）—— 关注辅导老师课后反馈及任务安排（Follow-up 第二部分）
// 读 schedules 已销课记录：公开反馈 + 作业安排；据此督促学生完成任务并记入「学习跟进」。
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconLoader2 } from '@tabler/icons-react';
import { supabase } from '../../lib/supabase';
import { Section, pill } from '../ui';
import StudentSelect from '../../components/common/StudentSelect';

const db = supabase as any;

const STATUS_PILL: Record<string, [string, string]> = {
  completed: ['p-green', '已完成'],
  absent: ['p-red', '无故缺勤'],
  leave: ['p-amber', '请假'],
};

interface FeedbackRow {
  id: number;
  student_id: string;
  status: string;
  start_time: string;
  subject_label: string | null;
  homework_content: string | null;
  feedback_public: string | null;
  student?: { full_name: string } | Array<{ full_name: string }>;
  tutor?: { full_name: string } | Array<{ full_name: string }>;
  course?: { name: string } | Array<{ name: string }>;
}

const one = (p: any) => (Array.isArray(p) ? p[0] : p);
const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function TutorFeedbackView() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [fStudent, setFStudent] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: sch } = await db.from('schedules')
      .select(`id, student_id, status, start_time, subject_label, homework_content, feedback_public,
        student:profiles!schedules_student_id_fkey(full_name),
        tutor:profiles!schedules_tutor_id_fkey(full_name),
        course:courses(name)`)
      .in('status', ['completed', 'absent', 'leave'])
      .gte('start_time', since)
      .order('start_time', { ascending: false });
    setRows((sch || []) as FeedbackRow[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => !fStudent || r.student_id === fStudent);
  const withHomework = filtered.filter(r => r.homework_content?.trim()).length;

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;

  return (
    <Section
      title="辅导反馈"
      hint={`近 30 天已销课记录（只读）· 共 ${filtered.length} 节，其中 ${withHomework} 节有作业安排 · 督促结果记入「学习跟进」`}
      action={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <StudentSelect allowClear placeholder="按学生筛选" style={{ width: 160 }}
            value={fStudent} onChange={setFStudent} />
          <button className="btn btn-primary" onClick={() => navigate('../follow-ups')}>去记跟进</button>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>近 30 天暂无已销课记录</div>
      ) : (
        <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
          <thead><tr>
            <th style={{ padding: '10px 12px' }}>时间</th>
            <th style={{ padding: '10px 12px' }}>学生</th>
            <th style={{ padding: '10px 12px' }}>科目</th>
            <th style={{ padding: '10px 12px' }}>辅导老师</th>
            <th style={{ padding: '10px 12px' }}>结果</th>
            <th style={{ padding: '10px 12px' }}>课后反馈</th>
            <th style={{ padding: '10px 12px' }}>作业安排</th>
          </tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--color-border-tertiary)', background: r.homework_content?.trim() ? 'rgba(58,131,244,0.04)' : undefined }}>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: 13 }}>{fmt(r.start_time)}</td>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{one(r.student)?.full_name || '—'}</td>
                <td style={{ padding: '10px 12px' }}>{r.subject_label || one(r.course)?.name || '—'}</td>
                <td style={{ padding: '10px 12px', fontSize: 13 }}>{one(r.tutor)?.full_name || '—'}</td>
                <td style={{ padding: '10px 12px' }}>{pill(STATUS_PILL[r.status]?.[0] || 'p-gray', STATUS_PILL[r.status]?.[1] || r.status)}</td>
                <td style={{ padding: '10px 12px', maxWidth: 260, color: 'var(--color-text-secondary)' }}>{r.feedback_public || '—'}</td>
                <td style={{ padding: '10px 12px', maxWidth: 200 }}>{r.homework_content?.trim() ? r.homework_content : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
