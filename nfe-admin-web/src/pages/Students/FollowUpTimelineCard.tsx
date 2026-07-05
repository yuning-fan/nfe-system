// 学生档案 · 学业 tab 学习跟进时间线：作业核查/晚自习跟进/带背考察/个辅记录/重难点梳理（study_follow_ups）
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { IconLoader2 } from '@tabler/icons-react';

const db = supabase as any;

const CAT_LABEL: Record<string, string> = {
  homework_check: '作业核查', night_study: '晚自习跟进', recitation: '带背考察',
  mini_tutoring: '个辅记录', key_points: '重难点梳理',
};
const CAT_PILL: Record<string, string> = {
  homework_check: 'p-blue', night_study: 'p-amber', recitation: 'p-purple',
  mini_tutoring: 'p-green', key_points: 'p-gray',
};

interface FollowUp {
  id: number;
  category: string;
  subject: string | null;
  content: string;
  result: string | null;
  needs_followup: boolean;
  created_at: string;
  recorder?: { full_name: string } | Array<{ full_name: string }>;
}

const one = (p: any) => (Array.isArray(p) ? p[0] : p);
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function FollowUpTimelineCard({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await db
        .from('study_follow_ups')
        .select('id, category, subject, content, result, needs_followup, created_at, recorder:profiles!study_follow_ups_recorder_id_fkey(full_name)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50);
      setRows((data || []) as FollowUp[]);
      setLoading(false);
    })();
  }, [studentId]);

  const pendingCount = rows.filter(r => r.needs_followup).length;

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 12 }}>
        学习跟进
        {pendingCount > 0 && <span className="pill p-amber" style={{ marginLeft: 8 }}>待跟进 {pendingCount}</span>}
      </div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><IconLoader2 className="spinner" size={20} style={{ color: 'var(--color-primary)' }} /></div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '20px 0', textAlign: 'center' }}>暂无跟进记录</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 420, overflowY: 'auto' }}>
          {rows.map(r => (
            <div key={r.id} style={{ display: 'flex', gap: 10, padding: '10px 4px', borderBottom: '1px solid var(--color-border-tertiary)' }}>
              <div style={{ width: 42, fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{fmtDate(r.created_at)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span className={`pill ${CAT_PILL[r.category] || 'p-gray'}`}>{CAT_LABEL[r.category] || r.category}</span>
                  {r.subject && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{r.subject}</span>}
                  {r.needs_followup && <span className="pill p-amber">待跟进</span>}
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>{one(r.recorder)?.full_name || ''}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text)' }}>{r.content}</div>
                {r.result && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>结果：{r.result}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
