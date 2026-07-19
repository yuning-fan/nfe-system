// 生活老师 · 住宿管理 - 卫生检查（按房间 + 整改闭环）
// 待整改：不合格且未复检的房间，显示整改截止倒计时 + 复检通过
// 新建检查：选房间 → 合格/不合格 → 不合格填整改截止 + 备注 + 照片
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { getGuardedDorms, type GuardedDorm } from '../../lib/guardedStudents';
import { uploadFile, getDownloadUrl } from '../../lib/r2';
import { Section } from '../ui';
import { message } from 'antd';
import { IconLoader2, IconCamera, IconPhoto } from '@tabler/icons-react';

const db = supabase as any;

interface Check {
  id: number;
  dorm_id: number;
  check_date: string;
  result: string;
  rectify_deadline: string | null;
  status: string;
  notes: string | null;
  photo_url: string | null;
}

function today(): string { return new Date().toISOString().slice(0, 10); }
function defaultDeadline(): string {
  // 默认次日 23:00
  const d = new Date(Date.now() + 86400000);
  return `${d.toISOString().slice(0, 10)}T23:00`;
}
function countdown(deadline: string | null): { text: string; over: boolean } {
  if (!deadline) return { text: '—', over: false };
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return { text: '已超时', over: true };
  const h = Math.floor(ms / 3600000);
  if (h >= 24) return { text: `剩 ${Math.floor(h / 24)} 天`, over: false };
  return { text: `剩 ${h} 小时`, over: false };
}

export function LifeDormHygiene() {
  const staffId = useAuthStore(s => s.user?.id ?? null);
  const [dorms, setDorms] = useState<GuardedDorm[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Check[]>([]);
  const [recent, setRecent] = useState<Check[]>([]);

  // 表单
  const [dormId, setDormId] = useState<number | ''>('');
  const [result, setResult] = useState<'pass' | 'fail'>('pass');
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const dormLabel = useCallback((id: number) => {
    const d = dorms.find(x => x.id === id);
    return d ? `${d.building_name} · ${d.room_number}` : `房间#${id}`;
  }, [dorms]);

  const load = useCallback(async () => {
    const ds = await getGuardedDorms(staffId);
    setDorms(ds);
    setDormId(prev => (prev === '' ? (ds[0]?.id ?? '') : prev));
    const ids = ds.map(d => d.id);
    if (ids.length) {
      const [{ data: pend }, { data: rec }] = await Promise.all([
        db.from('hygiene_checks').select('*').in('dorm_id', ids).eq('result', 'fail').eq('status', 'pending').order('rectify_deadline', { ascending: true }),
        db.from('hygiene_checks').select('*').in('dorm_id', ids).order('check_date', { ascending: false }).order('id', { ascending: false }).limit(30),
      ]);
      setPending((pend || []) as Check[]);
      setRecent((rec || []) as Check[]);
    } else { setPending([]); setRecent([]); }
    setLoading(false);
  }, [staffId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (dormId === '') { message.warning('请选择房间'); return; }
    setSaving(true);
    try {
      let photo_url: string | null = null;
      if (file) { const { key } = await uploadFile('resources', 'hygiene', file); photo_url = key; }
      const { error } = await db.from('hygiene_checks').insert({
        dorm_id: dormId, check_date: today(), result,
        rectify_deadline: result === 'fail' && deadline ? new Date(deadline).toISOString() : null,
        status: 'pending', notes: notes || null, photo_url, recorded_by: staffId,
      });
      if (error) throw error;
      message.success(result === 'fail' ? '已登记不合格，进入待整改' : '已登记合格');
      setNotes(''); setFile(null); setResult('pass');
      load();
    } catch (e: any) { message.error(e.message || '登记失败'); }
    finally { setSaving(false); }
  };

  const recheck = async (c: Check) => {
    const { error } = await db.from('hygiene_checks').update({ status: 'rectified', rechecked_at: new Date().toISOString() }).eq('id', c.id);
    if (error) { message.error('操作失败'); return; }
    message.success('已复检通过');
    load();
  };

  const viewPhoto = async (key: string) => {
    try { window.open(await getDownloadUrl('resources', key), '_blank'); }
    catch (e: any) { message.error(e.message || '获取照片失败'); }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;
  }
  if (dorms.length === 0) {
    return <Section title="卫生检查"><div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无名下房间</div></Section>;
  }

  return (
    <>
      {/* 待整改 */}
      <Section title="待整改项" hint="不合格且未复检 · 到期倒计时">
        {pending.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无待整改项 🎉</div>
        ) : pending.map(c => {
          const cd = countdown(c.rectify_deadline);
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--color-border-tertiary)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{dormLabel(c.dorm_id)} <span className="pill p-red" style={{ marginLeft: 6 }}>不合格</span></div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  检查 {c.check_date} · 整改截止 {c.rectify_deadline ? c.rectify_deadline.slice(0, 16).replace('T', ' ') : '—'}
                  {c.notes ? ' · ' + c.notes : ''}
                </div>
              </div>
              <span className={`pill ${cd.over ? 'p-red' : 'p-amber'}`}>{cd.text}</span>
              {c.photo_url && <span className="link" onClick={() => viewPhoto(c.photo_url!)}><IconPhoto size={14} style={{ verticalAlign: 'middle' }} /></span>}
              <button className="btn btn-primary" style={{ padding: '4px 12px', minHeight: 0 }} onClick={() => recheck(c)}>复检通过</button>
            </div>
          );
        })}
      </Section>

      {/* 新建检查 */}
      <Section title="新建卫生检查"
        action={<button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '登记中…' : '登记'}</button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="input" style={{ minWidth: 220 }} value={dormId} onChange={e => setDormId(Number(e.target.value))}>
              {dorms.map(d => <option key={d.id} value={d.id}>{d.building_name} · {d.room_number}</option>)}
            </select>
            <select className="input" value={result} onChange={e => setResult(e.target.value as 'pass' | 'fail')}>
              <option value="pass">合格</option>
              <option value="fail">不合格</option>
            </select>
            {result === 'fail' && (
              <>
                <label style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>整改截止</label>
                <input className="input" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input className="input" style={{ flex: 1 }} placeholder="备注（问题描述 / 整改要求）" value={notes} onChange={e => setNotes(e.target.value)} />
            <label className="btn" style={{ minHeight: 0, padding: '6px 12px', cursor: 'pointer' }}>
              <IconCamera size={15} style={{ verticalAlign: 'middle' }} /> {file ? '已选照片' : '拍照'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>
      </Section>

      {/* 近期检查 */}
      <Section title="近期检查记录">
        {recent.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无检查记录</div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>{['日期', '房间', '结果', '状态', '备注', '照片'].map(c => (
                <th key={c} style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{c}</th>
              ))}</tr>
            </thead>
            <tbody>
              {recent.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '10px 12px' }}>{c.check_date}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{dormLabel(c.dorm_id)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`pill ${c.result === 'pass' ? 'p-green' : 'p-red'}`}>{c.result === 'pass' ? '合格' : '不合格'}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {c.result === 'fail'
                      ? <span className={`pill ${c.status === 'rectified' ? 'p-green' : 'p-amber'}`}>{c.status === 'rectified' ? '已复检' : '待整改'}</span>
                      : <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{c.notes || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {c.photo_url
                      ? <span className="link" onClick={() => viewPhoto(c.photo_url!)}><IconPhoto size={14} style={{ verticalAlign: 'middle' }} /> 查看</span>
                      : <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </>
  );
}
