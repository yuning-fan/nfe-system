// NFE 活动管理（第一阶段）—— 建活动（只需标题）、批量代报参与学生、留档照片。
// 报名一律老师代报，学生自助报名/签到留到小程序上线后再做。
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { message, Modal, Input, DatePicker } from 'antd';
import { IconPlus, IconPencil, IconTrash, IconLoader2, IconUsers, IconPhoto } from '@tabler/icons-react';
import dayjs from 'dayjs';
import ActivityDetailDrawer from './ActivityDetailDrawer';

const db = supabase as any;

export interface Activity {
  id: number;
  title: string;
  activity_date: string | null;
  location: string | null;
  description: string | null;
  photos: string[];
  created_at: string;
  activity_participants?: { count: number }[];
}

const emptyForm = { title: '', activity_date: null as string | null, location: '', description: '' };

export default function Activities() {
  const profile = useAuthStore(s => s.profile);
  const [rows, setRows] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [detailId, setDetailId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // 参与人数走 PostgREST 聚合，避免逐行再查一次
    const { data, error } = await db
      .from('activities')
      .select('*, activity_participants(count)')
      .order('activity_date', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false });
    if (error) message.error(error.message || '加载失败');
    setRows((data as Activity[]) || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (a: Activity) => {
    setEditing(a);
    setForm({
      title: a.title,
      activity_date: a.activity_date,
      location: a.location || '',
      description: a.description || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { message.warning('请填写活动名称'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        activity_date: form.activity_date,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
      };
      if (editing) {
        const { error } = await db.from('activities').update(payload).eq('id', editing.id);
        if (error) throw error;
        message.success('已更新');
      } else {
        const { error } = await db.from('activities').insert({ ...payload, created_by: profile?.id ?? null });
        if (error) throw error;
        message.success('活动已创建');
      }
      setOpen(false);
      await load();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const remove = (a: Activity) => {
    Modal.confirm({
      title: '删除活动',
      content: `确定删除「${a.title}」吗？参与名单与照片记录会一并删除，不可恢复。`,
      okButtonProps: { danger: true },
      onOk: async () => {
        const { error } = await db.from('activities').delete().eq('id', a.id);
        if (error) { message.error(error.message || '删除失败'); return; }
        message.success('已删除');
        await load();
      },
    });
  };

  const countOf = (a: Activity) => a.activity_participants?.[0]?.count ?? 0;

  return (
    <div className="page active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          NFE 活动 · 老师建活动并代报参与学生，活动照片在详情里留档
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <IconPlus size={16} style={{ marginRight: 6 }} />新建活动
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}>
            <IconLoader2 className="spinner" size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            还没有活动，点右上「新建活动」开始。
          </div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px' }}>活动名称</th>
                <th style={{ padding: '12px 16px' }}>日期</th>
                <th style={{ padding: '12px 16px' }}>地点</th>
                <th style={{ padding: '12px 16px' }}>参与人数</th>
                <th style={{ padding: '12px 16px' }}>照片</th>
                <th style={{ padding: '12px 16px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(a => (
                <tr key={a.id} style={{ borderTop: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    <span className="link" onClick={() => setDetailId(a.id)}>{a.title}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{a.activity_date || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{a.location || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <IconUsers size={14} style={{ verticalAlign: 'middle', marginRight: 4, color: 'var(--color-text-tertiary)' }} />
                    {countOf(a)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <IconPhoto size={14} style={{ verticalAlign: 'middle', marginRight: 4, color: 'var(--color-text-tertiary)' }} />
                    {a.photos?.length || 0}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span className="link" onClick={() => setDetailId(a.id)}>详情</span>
                    {' · '}
                    <span className="link" onClick={() => openEdit(a)}>
                      <IconPencil size={13} style={{ verticalAlign: 'middle' }} /> 编辑
                    </span>
                    {' · '}
                    <span className="link" style={{ color: 'var(--color-danger)' }} onClick={() => remove(a)}>
                      <IconTrash size={13} style={{ verticalAlign: 'middle' }} /> 删除
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal title={editing ? '编辑活动' : '新建活动'} open={open} onCancel={() => setOpen(false)} onOk={save}
        okText={saving ? '保存中…' : '保存'} confirmLoading={saving} width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          <div>
            <label className="form-label">活动名称 *</label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="如：奥大开放日、中秋聚餐" />
          </div>
          <div>
            <label className="form-label">日期</label>
            <DatePicker style={{ width: '100%' }} value={form.activity_date ? dayjs(form.activity_date) : null}
              onChange={d => setForm(f => ({ ...f, activity_date: d ? d.format('YYYY-MM-DD') : null }))} />
          </div>
          <div>
            <label className="form-label">地点</label>
            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="选填" />
          </div>
          <div>
            <label className="form-label">说明</label>
            <Input.TextArea rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="选填" />
          </div>
        </div>
      </Modal>

      <ActivityDetailDrawer
        activityId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={load}
      />
    </div>
  );
}
