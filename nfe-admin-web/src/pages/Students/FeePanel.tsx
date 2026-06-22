import { useEffect, useState } from 'react';
import { message } from 'antd';
import { IconWallet, IconPlus, IconTrash, IconCircleCheck, IconCircle } from '@tabler/icons-react';
import { useFeeStore, FEE_TYPE_LABELS, type FeeType } from '../../store/useFeeStore';

const FEE_TYPES = Object.entries(FEE_TYPE_LABELS) as [FeeType, string][];

export default function FeePanel({ studentId, legacyNote }: { studentId: string; legacyNote?: string | null }) {
  const { fees, fetchFees, addFee, togglePaid, deleteFee } = useFeeStore();
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<FeeType>('supervision');
  const [newPeriod, setNewPeriod] = useState('');

  useEffect(() => { fetchFees(studentId); }, [studentId, fetchFees]);

  const submit = async () => {
    if (!newPeriod.trim()) { message.warning('请填写时段，如 2026秋季 / 2026 T1'); return; }
    const ok = await addFee(studentId, newType, newPeriod.trim());
    if (ok) { message.success('已添加费用项'); setNewPeriod(''); setAdding(false); }
    else message.error('添加失败（可能该类别+时段已存在）');
  };

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}><IconWallet size={16} />费用明细</div>
        <button className="btn" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => setAdding(v => !v)}>
          <IconPlus size={14} style={{ marginRight: 2 }} />添加费用项
        </button>
      </div>

      {legacyNote && (
        <div style={{ fontSize: 12, color: '#854F0B', background: '#FFF8EB', border: '0.5px solid #FAC775', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
          历史缴费备注（待结构化）：<b>{legacyNote}</b>　—　请据此把各类费用按时段登记到下方
        </div>
      )}

      {adding && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12, padding: 12, background: 'var(--color-background-secondary)', borderRadius: 8 }}>
          <div style={{ flex: '0 0 110px' }}>
            <label className="form-label">费用类别</label>
            <select className="input" value={newType} onChange={e => setNewType(e.target.value as FeeType)}>
              {FEE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">时段</label>
            <input className="input" value={newPeriod} onChange={e => setNewPeriod(e.target.value)} placeholder="如 2026秋季 / 2026 T1" />
          </div>
          <button className="btn btn-primary" onClick={submit}>添加</button>
        </div>
      )}

      {fees.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>暂无费用记录，点「添加费用项」开始登记</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr><th>费用类别</th><th>时段</th><th>缴费状态</th><th>缴费日期</th><th>操作</th></tr>
          </thead>
          <tbody>
            {fees.map(f => (
              <tr key={f.id}>
                <td style={{ fontWeight: 500 }}>{FEE_TYPE_LABELS[f.fee_type]}</td>
                <td>{f.period}</td>
                <td>
                  <span
                    onClick={() => togglePaid(f.id, !f.is_paid)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                    title="点击切换"
                  >
                    {f.is_paid
                      ? <><IconCircleCheck size={15} style={{ color: 'var(--color-success)' }} /><span className="pill p-green">已缴</span></>
                      : <><IconCircle size={15} style={{ color: 'var(--color-text-tertiary)' }} /><span className="pill p-amber">未缴</span></>}
                  </span>
                </td>
                <td style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>{f.paid_date || '—'}</td>
                <td>
                  <button className="btn" style={{ padding: '2px 6px', background: 'transparent', border: 'none' }} onClick={() => deleteFee(f.id)} title="删除">
                    <IconTrash size={13} color="var(--color-danger)" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
