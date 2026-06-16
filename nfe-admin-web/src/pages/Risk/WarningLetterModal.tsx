import { useState } from 'react';
import { IconX, IconAlertTriangle, IconLoader2 } from '@tabler/icons-react';

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
  studentId: _studentId,
  studentName,
  currentScore,
  onSubmit
}: WarningLetterModalProps) {
  const [level, setLevel] = useState<number>(1);
  const [evidence, setEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!evidence.trim()) {
      alert('请填写违规事项及佐证');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(level, evidence);
      onClose();
      setEvidence('');
      setLevel(1);
    } catch (err) {
      console.error(err);
      alert('提交失败');
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
            <span className="field-k">违规事项及佐证 <span style={{ color: 'var(--color-danger)' }}>*</span></span>
            <textarea 
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="例如：多次无故缺勤，且宿舍发现违禁品。请附上具体时间及照片链接等佐证..."
              style={{
                width: '100%', height: 100, padding: 12,
                borderRadius: 6, border: '1px solid var(--color-border)',
                resize: 'none', fontFamily: 'inherit'
              }}
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
