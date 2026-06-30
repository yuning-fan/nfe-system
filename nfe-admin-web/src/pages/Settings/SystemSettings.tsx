// 系统配置 · 风险评分参数（对应《风险等级判定表》，可调）
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { recomputeAll } from '../../lib/riskEngine';
import { message, Modal } from 'antd';
import { IconLoader2, IconDeviceFloppy, IconSettings } from '@tabler/icons-react';

const db = supabase as any;

interface Cfg { key: string; value: number; label: string; category: string; }

export default function SystemSettings() {
  const [rows, setRows] = useState<Cfg[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from('risk_config').select('*').order('category').order('key');
    setRows((data as Cfg[]) || []);
    setEdited({});
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const setVal = (key: string, v: string) => setEdited(e => ({ ...e, [key]: v }));
  const curVal = (r: Cfg) => (edited[r.key] !== undefined ? edited[r.key] : String(r.value));
  const dirty = Object.keys(edited).length > 0;

  const save = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(edited).map(([key, v]) => ({ key, value: Number(v) }))
        .filter(u => !isNaN(u.value));
      for (const u of updates) {
        const { error } = await db.from('risk_config').update({ value: u.value, updated_at: new Date().toISOString() }).eq('key', u.key);
        if (error) throw error;
      }
      message.success('已保存');
      await load();
      Modal.confirm({
        title: '是否立即重算全员风险分？',
        content: '参数改了，建议按新口径重算所有学生的风险分与等级。',
        okText: '立即重算', cancelText: '稍后',
        onOk: async () => { await recomputeAll(); message.success('已按新参数重算全员'); },
      });
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally { setSaving(false); }
  };

  const group = (cat: string) => rows.filter(r => r.category === cat);

  const renderGroup = (title: string, cat: string, hint: string) => (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-title" style={{ marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>{hint}</div>
      <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
        <tbody>
          {group(cat).map(r => (
            <tr key={r.key} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
              <td style={{ padding: '8px 12px' }}>{r.label || r.key}</td>
              <td style={{ padding: '8px 12px', width: 120 }}>
                <input className="input" type="number" step="0.5" style={{ width: 100, minHeight: 0, padding: '4px 8px' }}
                  value={curVal(r)} onChange={e => setVal(r.key, e.target.value)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;

  return (
    <div className="page active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}><IconSettings size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />风险评分参数</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>对应《风险等级判定表》。改完保存可立即按新口径重算全员。</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={!dirty || saving}>
          {saving ? <IconLoader2 size={16} className="spinner" /> : <><IconDeviceFloppy size={16} style={{ marginRight: 6 }} />保存{dirty ? `（${Object.keys(edited).length}）` : ''}</>}
        </button>
      </div>

      {renderGroup('扣分项（每项扣多少分）', 'deduct', '累积扣分压低分数，影响红黄绿等级。')}
      {renderGroup('阈值 / 红线', 'threshold', '等级分界、出勤红线、警告信红线张数、连续缺勤/证件临期天数等。')}
    </div>
  );
}
