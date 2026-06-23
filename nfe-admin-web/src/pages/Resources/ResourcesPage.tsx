import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { uploadFile, getDownloadUrl } from '../../lib/r2';
import { useAuthStore } from '../../store/useAuthStore';
import { IconDatabase, IconLoader2, IconFileText, IconTrash, IconSearch, IconPencil, IconCloudUpload, IconUsers } from '@tabler/icons-react';
import { message, Modal, Select, InputNumber, Upload } from 'antd';
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
  resource_year: number | null;
  knowledge_points: string[] | null;
  uploader_id: string | null;
  is_student_visible: boolean;
  version: number;
  superseded_by_id: number | null;
  created_at: string;
}

interface StudentOpt { id: string; full_name: string; }

const blankForm = {
  title: '',
  subject: '',
  program_stage: '',
  resource_type: '',
  resource_year: null as number | null,
  knowledge_points: [] as string[],
  description: '',
  studentVisible: true,
};

export default function ResourcesPage() {
  const user = useAuthStore(s => s.user);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // 复用统计：resource_id -> 关联的 student_id 列表
  const [linksByRes, setLinksByRes] = useState<Record<number, string[]>>({});
  const [students, setStudents] = useState<StudentOpt[]>([]);

  // 筛选（支持从 URL 带入，例如学业跟进跳转 /library?subject=物理&stage=预科-Standard）
  const [params] = useSearchParams();
  const [fStage, setFStage] = useState<string | undefined>(params.get('stage') || undefined);
  const [fSubject, setFSubject] = useState<string | undefined>(params.get('subject') || undefined);
  const [fType, setFType] = useState<string | undefined>();
  const [fYear, setFYear] = useState<number | undefined>();

  // 上传/编辑/新版本弹窗
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [versionOf, setVersionOf] = useState<Resource | null>(null); // 非空=上传新版本
  const [form, setForm] = useState({ ...blankForm });
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 预览
  const [preview, setPreview] = useState<{ url: string; kind: 'image' | 'pdf'; title: string } | null>(null);

  // 关联学生弹窗
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkRes, setLinkRes] = useState<Resource | null>(null);
  const [linkSel, setLinkSel] = useState<string[]>([]);
  const [linkSaving, setLinkSaving] = useState(false);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    const [{ data: res }, { data: links }] = await Promise.all([
      db.from('resources').select('*').order('created_at', { ascending: false }),
      db.from('resource_student_links').select('resource_id, student_id'),
    ]);
    setResources((res as Resource[]) || []);
    const map: Record<number, string[]> = {};
    (links || []).forEach((l: any) => {
      if (l.resource_id == null || l.student_id == null) return;
      (map[l.resource_id] ||= []).push(l.student_id);
    });
    setLinksByRes(map);
    setLoading(false);
  }, []);

  const fetchStudents = useCallback(async () => {
    const { data } = await db.from('profiles').select('id, full_name').eq('role', 'student').order('full_name');
    setStudents((data as StudentOpt[]) || []);
  }, []);

  useEffect(() => { fetchResources(); fetchStudents(); }, [fetchResources, fetchStudents]);

  const knowledgeHistory = [...new Set(resources.flatMap(r => r.knowledge_points || []))];
  const yearHistory = [...new Set(resources.map(r => r.resource_year).filter((y): y is number => !!y))].sort((a, b) => b - a);

  const openCreate = () => { setEditId(null); setVersionOf(null); setForm({ ...blankForm }); setFiles([]); setOpen(true); };
  const openNewVersion = (r: Resource) => {
    setEditId(null);
    setVersionOf(r);
    setForm({
      title: r.title,
      subject: r.subject || '',
      program_stage: r.program_stage || '',
      resource_type: r.resource_type || '',
      resource_year: r.resource_year ?? null,
      knowledge_points: r.knowledge_points || [],
      description: r.description || '',
      studentVisible: r.is_student_visible,
    });
    setFiles([]);
    setOpen(true);
  };
  const openEdit = (r: Resource) => {
    setEditId(r.id);
    setVersionOf(null);
    setForm({
      title: r.title,
      subject: r.subject || '',
      program_stage: r.program_stage || '',
      resource_type: r.resource_type || '',
      resource_year: r.resource_year ?? null,
      knowledge_points: r.knowledge_points || [],
      description: r.description || '',
      studentVisible: r.is_student_visible,
    });
    setFiles([]);
    setOpen(true);
  };

  const stripExt = (name: string) => name.replace(/\.[^.]+$/, '');

  const handleSave = async () => {
    const multi = !editId && !versionOf && files.length > 1;
    if (!multi && !form.title.trim()) { message.warning('请填写标题'); return; }
    if (!editId && files.length === 0) { message.warning('请选择文件'); return; }
    setSaving(true);
    try {
      const baseTags = {
        description: form.description.trim() || null,
        subject: form.subject || null,
        program_stage: form.program_stage || null,
        resource_type: form.resource_type || null,
        resource_year: form.resource_year ?? null,
        knowledge_points: form.knowledge_points,
        is_student_visible: form.studentVisible,
      };

      if (versionOf) {
        // 上传新版本：插入新条目（版本号+1），再把旧条目标记为已被取代
        const { key } = await uploadFile('resources', 'lib', files[0]);
        const payload = { ...baseTags, title: form.title.trim(), file_url: key, uploader_id: user?.id || null, version: (versionOf.version || 1) + 1 };
        const { data: inserted, error } = await db.from('resources').insert(payload).select('id').single();
        if (error) throw error;
        const { error: e2 } = await db.from('resources').update({ superseded_by_id: inserted.id }).eq('id', versionOf.id);
        if (e2) throw e2;
        message.success(`已更新到 v${payload.version}，旧版本已归档`);
      } else if (editId) {
        const payload: any = { ...baseTags, title: form.title.trim() };
        if (files.length > 0) {
          const { key } = await uploadFile('resources', 'lib', files[0]);
          payload.file_url = key;
        }
        const { error } = await db.from('resources').update(payload).eq('id', editId);
        if (error) throw error;
        message.success('资料已更新');
      } else {
        // 新建：多文件时每个文件生成一条资料，标题取文件名；单文件用填写的标题
        const rows: any[] = [];
        for (const f of files) {
          const { key } = await uploadFile('resources', 'lib', f);
          rows.push({ ...baseTags, title: multi ? stripExt(f.name) : form.title.trim(), file_url: key, uploader_id: user?.id || null });
        }
        const { error } = await db.from('resources').insert(rows);
        if (error) throw error;
        message.success(multi ? `已上传 ${rows.length} 份资料` : '资料已上传');
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
      const ext = (r.file_url.split('?')[0].split('.').pop() || '').toLowerCase();
      const kind = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext) ? 'image'
        : ext === 'pdf' ? 'pdf' : 'other';
      if (kind === 'other') { window.open(url, '_blank'); return; }
      setPreview({ url, kind, title: r.title });
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

  const openLink = (r: Resource) => {
    setLinkRes(r);
    setLinkSel(linksByRes[r.id] || []);
    setLinkOpen(true);
  };

  const saveLink = async () => {
    if (!linkRes) return;
    setLinkSaving(true);
    try {
      const before = new Set(linksByRes[linkRes.id] || []);
      const after = new Set(linkSel);
      const toAdd = linkSel.filter(id => !before.has(id));
      const toDel = [...before].filter(id => !after.has(id));
      if (toAdd.length) {
        const rows = toAdd.map(sid => ({ resource_id: linkRes.id, student_id: sid }));
        const { error } = await db.from('resource_student_links').insert(rows);
        if (error) throw error;
      }
      if (toDel.length) {
        const { error } = await db.from('resource_student_links')
          .delete().eq('resource_id', linkRes.id).in('student_id', toDel);
        if (error) throw error;
      }
      message.success('关联已更新');
      setLinkOpen(false);
      fetchResources();
    } catch (err: any) {
      message.error(err.message || '保存失败');
    } finally {
      setLinkSaving(false);
    }
  };

  const filtered = resources.filter(r => {
    const kw = search.trim();
    const matchKw = !kw || r.title.includes(kw) || (r.description || '').includes(kw) ||
      (r.knowledge_points || []).some(k => k.includes(kw));
    const matchStage = !fStage || r.program_stage === fStage;
    const matchSubject = !fSubject || r.subject === fSubject;
    const matchType = !fType || r.resource_type === fType;
    const matchYear = !fYear || r.resource_year === fYear;
    const matchHistory = showHistory || !r.superseded_by_id; // 默认隐藏已被取代的旧版本
    return matchKw && matchStage && matchSubject && matchType && matchYear && matchHistory;
  }).sort((a, b) => {
    // 复用次数降序，其次按上传时间降序
    const ca = (linksByRes[a.id] || []).length;
    const cb = (linksByRes[b.id] || []).length;
    if (cb !== ca) return cb - ca;
    return a.created_at < b.created_at ? 1 : -1;
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
          <Select allowClear placeholder="阶段" style={{ width: 160 }} value={fStage} options={selOpts(PROGRAM_STAGES)} onChange={v => { setFStage(v); resetPage(); }} />
          <Select allowClear showSearch placeholder="科目" style={{ width: 150 }} value={fSubject} options={selOpts(SUBJECTS)} onChange={v => { setFSubject(v); resetPage(); }} />
          <Select allowClear placeholder="类型" style={{ width: 130 }} value={fType} options={selOpts(RESOURCE_TYPES)} onChange={v => { setFType(v); resetPage(); }} />
          <Select allowClear placeholder="年份" style={{ width: 110 }} value={fYear} options={yearHistory.map(y => ({ label: `${y}`, value: y }))} onChange={v => { setFYear(v); resetPage(); }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <input type="checkbox" checked={showHistory} onChange={e => { setShowHistory(e.target.checked); resetPage(); }} /> 显示历史版本
          </label>
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
                  <th style={{ padding: '12px 16px' }}>年份</th>
                  <th style={{ padding: '12px 16px' }}>复用</th>
                  <th style={{ padding: '12px 16px' }}>学生可见</th>
                  <th style={{ padding: '12px 16px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(r => {
                  const linkCount = (linksByRes[r.id] || []).length;
                  return (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconFileText size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                        <div>
                          <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {r.title}
                            {r.version > 1 && <span className="pill p-gray" style={{ fontSize: 10 }}>v{r.version}</span>}
                            {r.superseded_by_id && <span className="pill p-gray" style={{ fontSize: 10 }}>已有更新版本</span>}
                          </div>
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
                    <td style={{ padding: '12px 16px' }}>{r.resource_year || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {linkCount > 0 ? <span className="pill p-blue">{linkCount} 次</span> : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`pill ${r.is_student_visible ? 'p-green' : 'p-gray'}`}>{r.is_student_visible ? '可见' : '隐藏'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span className="link" onClick={() => handleView(r)}>查看</span>
                      {' · '}
                      <span className="link" onClick={() => openLink(r)}><IconUsers size={12} style={{ verticalAlign: 'middle' }} /> 关联</span>
                      {' · '}
                      <span className="link" onClick={() => openEdit(r)}><IconPencil size={12} style={{ verticalAlign: 'middle' }} /> 编辑</span>
                      {!r.superseded_by_id && <>{' · '}<span className="link" onClick={() => openNewVersion(r)}>新版本</span></>}
                      {' · '}
                      <span className="link" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(r)}>
                        <IconTrash size={12} style={{ verticalAlign: 'middle' }} /> 删除
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: '0 16px' }}>
              <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPage={setPage} />
            </div>
          </>
        )}
      </div>

      <Modal title={versionOf ? `上传新版本（当前 v${versionOf.version}）` : editId ? '编辑资料' : '上传资料'} open={open} onCancel={() => setOpen(false)} onOk={handleSave} okText={saving ? '保存中…' : '保存'} confirmLoading={saving} width={560}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          {!(files.length > 1 && !editId && !versionOf) && (
            <div>
              <label className="form-label">标题 *</label>
              <input className="input" style={{ width: '100%' }} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="如：EAP 学术写作范文" />
            </div>
          )}
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
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">资料类型</label>
              <Select allowClear style={{ width: '100%' }} value={form.resource_type || undefined} options={selOpts(RESOURCE_TYPES)} onChange={v => setForm(f => ({ ...f, resource_type: v || '' }))} placeholder="选择类型" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">年份</label>
              <InputNumber style={{ width: '100%' }} min={2000} max={2100} value={form.resource_year ?? undefined} onChange={v => setForm(f => ({ ...f, resource_year: (v as number) ?? null }))} placeholder="如：2026" />
            </div>
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
            <Upload.Dragger
              multiple={!editId && !versionOf}
              maxCount={editId || versionOf ? 1 : undefined}
              fileList={files.map((f, i) => ({ uid: `${i}`, name: f.name, status: 'done' as const }))}
              beforeUpload={f => {
                if (f.size > 20 * 1024 * 1024) { message.warning(`「${f.name}」超过 20MB，已跳过`); return Upload.LIST_IGNORE; }
                if (editId || versionOf) setFiles([f]);            // 编辑/新版本：单文件
                else setFiles(prev => [...prev, f]);                // 新建：可多文件累加
                return false; // 阻止自动上传，保存时再传 R2
              }}
              onRemove={f => { setFiles(prev => prev.filter((_, i) => `${i}` !== f.uid)); }}
            >
              <p style={{ margin: '8px 0' }}><IconCloudUpload size={28} style={{ color: 'var(--color-primary)' }} /></p>
              <p style={{ fontSize: 13 }}>点击或拖拽文件到此处{!editId && !versionOf && '（可多选）'}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>支持图片 / PDF / 文档，单个 ≤ 20MB</p>
            </Upload.Dragger>
            {!editId && !versionOf && files.length > 1 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6 }}>
                已选 {files.length} 个文件，将各生成一条资料、共用上方标签，标题取文件名。
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal title={`关联学生 · ${linkRes?.title || ''}`} open={linkOpen} onCancel={() => setLinkOpen(false)} onOk={saveLink} okText={linkSaving ? '保存中…' : '保存'} confirmLoading={linkSaving} width={480}>
        <div style={{ marginTop: 12 }}>
          <label className="form-label">已关联学生（用过此资料的学生）</label>
          <Select
            mode="multiple"
            showSearch
            style={{ width: '100%' }}
            value={linkSel}
            onChange={setLinkSel}
            placeholder="搜索并选择学生"
            optionFilterProp="label"
            options={students.map(s => ({ label: s.full_name, value: s.id }))}
          />
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 8 }}>关联次数会计入复用统计，用于判断资料质量。</div>
        </div>
      </Modal>

      <Modal
        title={preview?.title}
        open={!!preview}
        onCancel={() => setPreview(null)}
        footer={preview ? [
          <a key="open" className="btn" href={preview.url} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>新窗口打开</a>,
        ] : null}
        width={900}
        styles={{ body: { padding: 0, background: 'var(--color-bg-secondary)' } }}
      >
        {preview?.kind === 'image' && (
          <div style={{ textAlign: 'center', maxHeight: '75vh', overflow: 'auto' }}>
            <img src={preview.url} alt={preview.title} style={{ maxWidth: '100%' }} />
          </div>
        )}
        {preview?.kind === 'pdf' && (
          <iframe title={preview.title} src={preview.url} style={{ width: '100%', height: '75vh', border: 'none' }} />
        )}
      </Modal>
    </div>
  );
}
