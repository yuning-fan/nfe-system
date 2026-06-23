import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadFile, getDownloadUrl } from '../../lib/r2';
import { useAuthStore } from '../../store/useAuthStore';
import { IconDatabase, IconLoader2, IconFileText, IconTrash, IconSearch, IconPencil } from '@tabler/icons-react';
import { message, Modal, Select } from 'antd';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/common/Pagination';
import { SUBJECTS, PROGRAM_STAGES, RESOURCE_TYPES } from '../../lib/resourceTags';

const db = supabase as any;

interface Resource {
  id: number;
  title: string;
  description: string | null;
  file_url: string;
  subject: string | null;
  program_stage: string | null;
  resource_type: string | null;
  knowledge_points: string[] | null;
  uploader_id: string | null;
  is_student_visible: boolean;
  created_at: string;
}

const blankForm = {
  title: '',
  subject: '',
  program_stage: '',
  resource_type: '',
  knowledge_points: [] as string[],
  description: '',
  studentVisible: true,
};

export default function ResourcesPage() {
  const user = useAuthStore(s => s.user);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // 筛选
  const [fStage, setFStage] = useState<string | undefined>();
  const [fSubject, setFSubject] = useState<string | undefined>();
  const [fType, setFType] = useState<string | undefined>();

  // 上传/编辑弹窗
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...blankForm });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from('resources').select('*').order('created_at', { ascending: false });
    setResources((data as Resource[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  // 已上传知识点候选（历史复用）
  const knowledgeHistory = [...new Set(resources.flatMap(r => r.knowledge_points || []))];

  const openCreate = () => { setEditId(null); setForm({ ...blankForm }); setFile(null); setOpen(true); };
  const openEdit = (r: Resource) => {
    setEditId(r.id);
    setForm({
      title: r.title,
      subject: r.subject || '',
      program_stage: r.program_stage || '',
      resource_type: r.resource_type || '',
      knowledge_points: r.knowledge_points || [],
      description: r.description || '',
      studentVisible: r.is_student_visible,
    });
    setFile(null);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { message.warning('请填写标题'); return; }
    if (!editId && !file) { message.warning('请选择文件'); return; }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        subject: form.subject || null,
        program_stage: form.program_stage || null,
        resource_type: form.resource_type || null,
        knowledge_points: form.knowledge_points,
        is_student_visible: form.studentVisible,
      };
      if (file) {
        const { key } = await uploadFile('resources', 'lib', file);
        payload.file_url = key;
      }
      if (editId) {
        const { error } = await db.from('resources').update(payload).eq('id', editId);
        if (error) throw error;
        message.success('资料已更新');
      } else {
        payload.uploader_id = user?.id || null;
        const { error } = await db.from('resources').insert(payload);
        if (error) throw error;
        message.success('资料已上传');
      }
      setOpen(false);
      fetchResources();
    } catch (err: any) {
      message.error(err.message || '保存失败');
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

  const filtered = resources.filter(r => {
    const kw = search.trim();
    const matchKw = !kw || r.title.includes(kw) || (r.description || '').includes(kw) ||
      (r.knowledge_points || []).some(k => k.includes(kw));
    const matchStage = !fStage || r.program_stage === fStage;
    const matchSubject = !fSubject || r.subject === fSubject;
    const matchType = !fType || r.resource_type === fType;
    return matchKw && matchStage && matchSubject && matchType;
  });
  const PAGE_SIZE = 20;
  const { paged, page, totalPages, setPage, reset: resetPage, total } = usePagination(filtered, PAGE_SIZE);

  const selOpts = (arr: readonly string[]) => arr.map(v => ({ label: v, value: v }));

  return (
    <div className="page active">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <IconSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
            <input className="search-bar" style={{ paddingLeft: 30 }} placeholder="搜索标题/描述/知识点…" value={search} onChange={e => { setSearch(e.target.value); resetPage(); }} />
          </div>
          <Select allowClear placeholder="阶段" style={{ width: 150 }} value={fStage} options={selOpts(PROGRAM_STAGES)} onChange={v => { setFStage(v); resetPage(); }} />
          <Select allowClear showSearch placeholder="科目" style={{ width: 150 }} value={fSubject} options={selOpts(SUBJECTS)} onChange={v => { setFSubject(v); resetPage(); }} />
          <Select allowClear placeholder="类型" style={{ width: 130 }} value={fType} options={selOpts(RESOURCE_TYPES)} onChange={v => { setFType(v); resetPage(); }} />
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <IconDatabase size={16} style={{ marginRight: 6 }} /> 上传资料
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}><IconLoader2 className="spinner" size={24} style={{ color: 'var(--color-primary)' }} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无资料</div>
        ) : (
          <>
            <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px' }}>标题</th>
                  <th style={{ padding: '12px 16px' }}>阶段</th>
                  <th style={{ padding: '12px 16px' }}>科目</th>
                  <th style={{ padding: '12px 16px' }}>类型</th>
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
                          {r.knowledge_points && r.knowledge_points.length > 0 && (
                            <div style={{ marginTop: 3, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {r.knowledge_points.map(k => <span key={k} className="pill p-gray" style={{ fontSize: 10 }}>{k}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{r.program_stage || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{r.subject || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{r.resource_type || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`pill ${r.is_student_visible ? 'p-green' : 'p-gray'}`}>{r.is_student_visible ? '可见' : '隐藏'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span className="link" onClick={() => handleView(r)}>查看</span>
                      {' · '}
                      <span className="link" onClick={() => openEdit(r)}><IconPencil size={12} style={{ verticalAlign: 'middle' }} /> 编辑</span>
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

      <Modal title={editId ? '编辑资料' : '上传资料'} open={open} onCancel={() => setOpen(false)} onOk={handleSave} okText={saving ? '保存中…' : '保存'} confirmLoading={saving} width={560}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          <div>
            <label className="form-label">标题 *</label>
            <input className="input" style={{ width: '100%' }} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="如：EAP 学术写作范文" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">所属阶段</label>
              <Select allowClear style={{ width: '100%' }} value={form.program_stage || undefined} options={selOpts(PROGRAM_STAGES)} onChange={v => setForm(f => ({ ...f, program_stage: v || '' }))} placeholder="选择阶段" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">科目</label>
              <Select allowClear showSearch style={{ width: '100%' }} value={form.subject || undefined} options={selOpts(SUBJECTS)} onChange={v => setForm(f => ({ ...f, subject: v || '' }))} placeholder="选择科目" />
            </div>
          </div>
          <div>
            <label className="form-label">资料类型</label>
            <Select allowClear style={{ width: '100%' }} value={form.resource_type || undefined} options={selOpts(RESOURCE_TYPES)} onChange={v => setForm(f => ({ ...f, resource_type: v || '' }))} placeholder="选择类型" />
          </div>
          <div>
            <label className="form-label">知识点（可多选/自由输入）</label>
            <Select mode="tags" style={{ width: '100%' }} value={form.knowledge_points} options={selOpts(knowledgeHistory)} onChange={v => setForm(f => ({ ...f, knowledge_points: v }))} placeholder="输入后回车，如：导数、议论文结构" />
          </div>
          <div>
            <label className="form-label">描述</label>
            <textarea className="input" rows={2} style={{ width: '100%' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={form.studentVisible} onChange={e => setForm(f => ({ ...f, studentVisible: e.target.checked }))} />
            学生端可见
          </label>
          <div>
            <label className="form-label">文件{editId ? '（不选则保留原文件）' : '（≤20MB）'}</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
            {file && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>已选：{file.name}</div>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
