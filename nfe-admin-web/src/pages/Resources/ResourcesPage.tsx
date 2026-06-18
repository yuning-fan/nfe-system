import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadFile, getDownloadUrl } from '../../lib/r2';
import { useAuthStore } from '../../store/useAuthStore';
import { IconDatabase, IconLoader2, IconFileText, IconTrash, IconSearch } from '@tabler/icons-react';
import { message, Modal } from 'antd';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/common/Pagination';

const db = supabase as any;

interface Resource {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
  subject: string | null;
  uploader_id: string | null;
  is_student_visible: boolean;
  created_at: string;
}

export default function ResourcesPage() {
  const user = useAuthStore(s => s.user);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // 上传弹窗
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [studentVisible, setStudentVisible] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from('resources').select('*').order('created_at', { ascending: false });
    setResources((data as Resource[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const handleSave = async () => {
    if (!title.trim()) { message.warning('请填写标题'); return; }
    if (!file) { message.warning('请选择文件'); return; }
    setSaving(true);
    try {
      const { key } = await uploadFile('resources', 'lib', file);
      const { error } = await db.from('resources').insert({
        title: title.trim(),
        description: description.trim() || null,
        subject: subject.trim() || null,
        file_url: key,
        is_student_visible: studentVisible,
        uploader_id: user?.id || null,
      });
      if (error) throw error;
      message.success('资料已上传');
      setOpen(false);
      setTitle(''); setSubject(''); setDescription(''); setFile(null); setStudentVisible(true);
      fetchResources();
    } catch (err: any) {
      message.error(err.message || '上传失败');
    } finally {
      setSaving(false);
    }
  };

  const handleView = async (r: Resource) => {
    try {
      const url = await getDownloadUrl('resources', r.file_url);
      window.open(url, '_blank');
    } catch (e: any) {
      message.error(e.message || '获取文件失败');
    }
  };

  const handleDelete = (r: Resource) => {
    Modal.confirm({
      title: '删除资料',
      content: `确认删除「${r.title}」吗？`,
      okType: 'danger',
      onOk: async () => {
        const { error } = await db.from('resources').delete().eq('id', r.id);
        if (error) { message.error('删除失败'); return; }
        message.success('已删除');
        fetchResources();
      },
    });
  };

  const filtered = resources.filter(r =>
    r.title.includes(search) || (r.subject || '').includes(search));
  const PAGE_SIZE = 20;
  const { paged, page, totalPages, setPage, reset: resetPage, total } = usePagination(filtered, PAGE_SIZE);

  return (
    <div className="page active">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ position: 'relative' }}>
          <IconSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input className="search-bar" style={{ paddingLeft: 30 }} placeholder="搜索标题/科目…" value={search} onChange={e => { setSearch(e.target.value); resetPage(); }} />
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <IconDatabase size={16} style={{ marginRight: 6 }} /> 上传资料
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}><IconLoader2 className="spinner" size={24} style={{ color: 'var(--color-primary)' }} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无资料，点击右上角上传</div>
        ) : (
          <>
            <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px' }}>标题</th>
                  <th style={{ padding: '12px 16px' }}>科目</th>
                  <th style={{ padding: '12px 16px' }}>学生可见</th>
                  <th style={{ padding: '12px 16px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconFileText size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                        <div>
                          <div style={{ fontWeight: 500 }}>{r.title}</div>
                          {r.description && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{r.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{r.subject || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`pill ${r.is_student_visible ? 'p-green' : 'p-gray'}`}>{r.is_student_visible ? '可见' : '隐藏'}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="link" onClick={() => handleView(r)}>查看</span>
                      {' · '}
                      <span className="link" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(r)}>
                        <IconTrash size={12} style={{ verticalAlign: 'middle' }} /> 删除
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '0 16px' }}>
              <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
            </div>
          </>
        )}
      </div>

      <Modal title="上传资料" open={open} onCancel={() => setOpen(false)} onOk={handleSave} okText={saving ? '上传中…' : '上传'} confirmLoading={saving}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          <div>
            <label className="form-label">标题 *</label>
            <input className="input" style={{ width: '100%' }} value={title} onChange={e => setTitle(e.target.value)} placeholder="如：NCEA 物理 Level 2 复习提纲" />
          </div>
          <div>
            <label className="form-label">科目</label>
            <input className="input" style={{ width: '100%' }} value={subject} onChange={e => setSubject(e.target.value)} placeholder="如：物理" />
          </div>
          <div>
            <label className="form-label">描述</label>
            <textarea className="input" rows={2} style={{ width: '100%' }} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={studentVisible} onChange={e => setStudentVisible(e.target.checked)} />
            学生端可见
          </label>
          <div>
            <label className="form-label">文件（≤20MB）</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
            {file && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>已选：{file.name}</div>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
