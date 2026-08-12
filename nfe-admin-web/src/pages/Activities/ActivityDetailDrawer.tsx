// 活动详情：参与名单（批量代报 / 移除）+ 照片留档。
// 注意：activity_participants 有两个外键指向 profiles（student_id / added_by），
// 嵌套查询必须显式写外键名，裸写 profiles(...) 会 PGRST201 整条失败。见《已知问题》§0。
import { useEffect, useState, useCallback } from 'react';
import { Drawer, Select, message, Modal, Empty } from 'antd';
import { IconLoader2, IconTrash, IconUpload, IconPhoto } from '@tabler/icons-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useStudentRoster } from '../../components/common/StudentSelect';
import { uploadFile, getDownloadUrl } from '../../lib/r2';
import type { Activity } from './Activities';

const db = supabase as any;

interface Participant {
  id: number;
  student_id: string;
  profiles: { full_name: string } | null;
}

interface Props {
  activityId: number | null;
  onClose: () => void;
  /** 名单/照片变动后通知列表页刷新计数 */
  onChanged: () => void;
}

export default function ActivityDetailDrawer({ activityId, onClose, onChanged }: Props) {
  const profile = useAuthStore(s => s.profile);
  const roster = useStudentRoster();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [parts, setParts] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!activityId) return;
    setLoading(true);
    const [{ data: act }, { data: ps }] = await Promise.all([
      db.from('activities').select('*').eq('id', activityId).single(),
      db.from('activity_participants')
        .select('id, student_id, profiles!activity_participants_student_id_fkey(full_name)')
        .eq('activity_id', activityId),
    ]);
    setActivity((act as Activity) || null);
    const list = ((ps as Participant[]) || [])
      .sort((a, b) => (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || ''));
    setParts(list);
    setPicked([]);
    setLoading(false);
  }, [activityId]);

  useEffect(() => { if (activityId) load(); else { setActivity(null); setParts([]); } }, [activityId, load]);

  const joined = new Set(parts.map(p => p.student_id));
  const options = roster
    .filter(s => !joined.has(s.id))
    .map(s => ({ label: s.full_name, value: s.id }));

  const addBatch = async () => {
    if (!activityId || picked.length === 0) { message.warning('请先选择学生'); return; }
    setAdding(true);
    const { error } = await db.from('activity_participants').insert(
      picked.map(sid => ({ activity_id: activityId, student_id: sid, added_by: profile?.id ?? null })),
    );
    setAdding(false);
    if (error) { message.error(error.message || '添加失败'); return; }
    message.success(`已加入 ${picked.length} 名学生`);
    await load();
    onChanged();
  };

  const addAll = () => {
    if (options.length === 0) { message.info('全部学生都已在名单里'); return; }
    Modal.confirm({
      title: '加入全部学生',
      content: `将把剩余 ${options.length} 名学生全部加入本次活动。`,
      onOk: () => setPicked(options.map(o => o.value)),
    });
  };

  const removeOne = async (p: Participant) => {
    const { error } = await db.from('activity_participants').delete().eq('id', p.id);
    if (error) { message.error('移除失败'); return; }
    setParts(prev => prev.filter(x => x.id !== p.id));
    onChanged();
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || !activity) return;
    const oversize = files.find(f => f.size > 20 * 1024 * 1024);
    if (oversize) { message.error(`「${oversize.name}」超过 20MB 上限`); return; }
    setUploading(true);
    try {
      const keys: string[] = [];
      for (const f of files) {
        const { key } = await uploadFile('resources', 'activity', f);
        keys.push(key);
      }
      const next = [...(activity.photos || []), ...keys];
      const { error } = await db.from('activities').update({ photos: next }).eq('id', activity.id);
      if (error) throw error;
      setActivity({ ...activity, photos: next });
      message.success(`已上传 ${keys.length} 张`);
      onChanged();
    } catch (err: any) {
      message.error(err.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const viewPhoto = async (key: string) => {
    try { window.open(await getDownloadUrl('resources', key), '_blank'); }
    catch (e: any) { message.error(e.message || '获取照片失败'); }
  };

  const removePhoto = (key: string) => {
    if (!activity) return;
    Modal.confirm({
      title: '移除照片',
      content: '只从本活动移除引用，R2 上的文件不删除。',
      okButtonProps: { danger: true },
      onOk: async () => {
        const next = (activity.photos || []).filter(k => k !== key);
        const { error } = await db.from('activities').update({ photos: next }).eq('id', activity.id);
        if (error) { message.error('移除失败'); return; }
        setActivity({ ...activity, photos: next });
        onChanged();
      },
    });
  };

  return (
    <Drawer
      title={activity?.title || '活动详情'}
      open={!!activityId}
      onClose={onClose}
      width={560}
    >
      {loading || !activity ? (
        <div style={{ padding: 30, textAlign: 'center' }}>
          <IconLoader2 className="spinner" size={24} style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
            <div>日期：{activity.activity_date || '—'}</div>
            <div>地点：{activity.location || '—'}</div>
            {activity.description && <div style={{ whiteSpace: 'pre-wrap' }}>说明：{activity.description}</div>}
          </div>

          {/* 参与名单 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ margin: 0 }}>参与学生（{parts.length}）</label>
              <span className="link" onClick={addAll}>选中剩余全部</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <Select
                mode="multiple" allowClear showSearch optionFilterProp="label"
                style={{ flex: 1 }} placeholder="搜索姓名，可多选"
                value={picked} onChange={setPicked} options={options}
                maxTagCount="responsive"
              />
              <button className="btn btn-primary" onClick={addBatch} disabled={adding || picked.length === 0}>
                {adding ? <IconLoader2 size={16} className="spinner" /> : `加入${picked.length ? ` ${picked.length}` : ''}`}
              </button>
            </div>
            {parts.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>还没有参与学生</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {parts.map(p => (
                  <span key={p.id} className="pill p-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {p.profiles?.full_name || p.student_id}
                    <IconTrash size={12} style={{ cursor: 'pointer', color: 'var(--color-danger)' }}
                      onClick={() => removeOne(p)} />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 照片留档 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ margin: 0 }}>活动照片（{activity.photos?.length || 0}）</label>
              <label className="link" style={{ cursor: uploading ? 'default' : 'pointer' }}>
                {uploading
                  ? <><IconLoader2 size={13} className="spinner" style={{ verticalAlign: 'middle' }} /> 上传中…</>
                  : <><IconUpload size={13} style={{ verticalAlign: 'middle' }} /> 上传照片</>}
                <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={onPickPhoto} />
              </label>
            </div>
            {!activity.photos?.length ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无照片" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activity.photos.map(key => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <IconPhoto size={15} style={{ color: 'var(--color-text-tertiary)' }} />
                    <span className="link" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      onClick={() => viewPhoto(key)}>
                      {key.split('/').pop()}
                    </span>
                    <IconTrash size={13} style={{ cursor: 'pointer', color: 'var(--color-danger)' }}
                      onClick={() => removePhoto(key)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
