import { useState, useEffect, useCallback } from 'react';
import { IconX, IconAlertTriangle, IconLoader2, IconRefresh } from '@tabler/icons-react';
import { message } from 'antd';
import { supabase } from '../../lib/supabase';

const db = supabase as any;

// 拉该生近 15 天违规 + 缺勤，拼成佐证文本
async function buildEvidence(studentId: string): Promise<string> {
  const since = new Date(Date.now() - 15 * 86400000).toISOString();
  const lines: string[] = [];
  const { data: vios } = await db.from('violation_logs')
    .select('violation_type, reason, created_at').eq('student_id', studentId).neq('status', 'archived').gte('created_at', since).order('created_at', { ascending: false });
  for (const v of (vios || []) as any[]) {
    lines.push(`· ${(v.created_at || '').slice(5, 10)} ${v.violation_type || '违规'}${v.reason ? '：' + v.reason : ''}`);
  }
  const { data: checks } = await db.from('daily_checks')
    .select('check_type, status, created_at').eq('student_id', studentId).eq('status', 'absent').gte('created_at', since);
  const label: Record<string, string> = { night_study: '晚自习缺勤', morning: '学校上课缺勤', tutoring: '辅导课缺勤', dorm_check: '查寝异常' };
  const cnt: Record<string, number> = {};
  for (const c of (checks || []) as any[]) cnt[c.check_type] = (cnt[c.check_type] || 0) + 1;
  for (const [t, n] of Object.entries(cnt)) lines.push(`· 近15天${label[t] || t} ${n} 次`);
  return lines.length ? `近期记录（自动汇总，可修改）：\n${lines.join('\n')}` : '';
}

interface WarningLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  currentScore: number;
  onSubmit: (level: number, evidence: string) => Promise<void>;
}

export default function WarningLetterModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  currentScore,
  onSubmit
}: WarningLetterModalProps) {
  const [level, setLevel] = useState<number>(1);
  const [evidence, setEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);

  const regenerate = useCallback(async () => {
    if (!studentId) return;
    setAutoLoading(true);
    try { setEvidence(await buildEvidence(studentId)); } finally { setAutoLoading(false); }
  }, [studentId]);

  // 打开时自动带出佐证
  useEffect(() => {
    if (isOpen && studentId) {
      setAutoLoading(true);
      buildEvidence(studentId).then(txt => setEvidence(txt)).finally(() => setAutoLoading(false));
    }
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!evidence.trim()) {
      message.warning('请填写违规事项及佐证');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(level, evidence);
      onClose();
      setEvidence('');
      setLevel(1);
    } catch (error: any) {
      console.error(error);
      message.error(error.message || '提交失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="card" style={{ width: 500, margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 600 }}>
            <IconAlertTriangle size={24} style={{ color: 'var(--color-danger)' }} />
            发起三步走警告信
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 4, border: 'none' }}>
            <IconX size={20} />
          </button>
        </div>

        <div className="g3">
          <div className="field">
            <span className="field-k">处罚对象</span>
            <span className="field-v" style={{ fontWeight: 500 }}>{studentName} <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 8 }}>(当前风险分: {currentScore})</span></span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="field-k">警告级别</span>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className={`btn ${level === 1 ? 'btn-primary' : ''}`}
                onClick={() => setLevel(1)}
                style={{ flex: 1 }}
              >
                1级警告 (Verbal)
              </button>
              <button 
                className={`btn ${level === 2 ? 'btn-primary' : ''}`}
                onClick={() => setLevel(2)}
                style={{ flex: 1, backgroundColor: level === 2 ? '#EF9F27' : undefined, borderColor: level === 2 ? '#EF9F27' : undefined }}
              >
                2级警告 (Written)
              </button>
              <button 
                className={`btn ${level === 3 ? 'btn-primary' : ''}`}
                onClick={() => setLevel(3)}
                style={{ flex: 1, backgroundColor: level === 3 ? 'var(--color-danger)' : undefined, borderColor: level === 3 ? 'var(--color-danger)' : undefined }}
              >
                3级警告 (Final)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="field-k">违规事项及佐证 <span style={{ color: 'var(--color-danger)' }}>*</span></span>
              <span className="link" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={regenerate}>
                {autoLoading ? <IconLoader2 size={12} className="spinner" /> : <IconRefresh size={12} />} 重新生成佐证
              </span>
            </div>
            <textarea
              className="input"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder={autoLoading ? '正在汇总近期记录…' : '自动汇总该生近 15 天违规/缺勤，可手动修改补充…'}
              style={{ height: 120 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button className="btn" onClick={onClose} disabled={isSubmitting}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting} style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
            {isSubmitting ? <IconLoader2 size={16} className="spinner" /> : '提交审批'}
          </button>
        </div>
      </div>
    </div>
  );
}
