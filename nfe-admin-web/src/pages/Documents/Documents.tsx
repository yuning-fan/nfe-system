import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { getDownloadUrl, uploadFile } from '../../lib/r2';
import { useAuthStore } from '../../store/useAuthStore';
import { IconLoader2, IconFileText, IconSearch, IconUpload, IconTrash } from '@tabler/icons-react';
import { message, Modal } from 'antd';

const db = supabase as any;

interface Student {
  student_id: string;
  school_name: string | null;
  profiles: { full_name: string } | Array<{ full_name: string }>;
}

interface DocRow {
  id: number;
  student_id: string;
  doc_type: string;
  file_url: string | null; // R2 桶内 key
  issue_date: string | null;
  expiry_date: string | null;
  status: string | null;
  uploaded_by: string | null;
}

// doc_type 枚举 ↔ 中文标签 + 颜色
const DOC_TYPES: { value: string; label: string; cls: string }[] = [
  { value: 'passport', label: '护照', cls: 'p-blue' },
  { value: 'visa', label: '签证', cls: 'p-red' },
  { value: 'insurance', label: '保险单', cls: 'p-green' },
  { value: 'offer_letter', label: '录取通知书', cls: 'p-purple' },
  { value: 'transcript', label: '成绩单', cls: 'p-amber' },
  { value: 'guardianship', label: '监护协议', cls: 'p-gray' },
];
const docLabel = (t: string) => DOC_TYPES.find(d => d.value === t)?.label || t;
const docCls = (t: string) => DOC_TYPES.find(d => d.value === t)?.cls || 'p-gray';

function daysUntil(dateStr: string) {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

// 根据到期日推算状态
function deriveStatus(expiry: string | null): { label: string; cls: string } {
  if (!expiry) return { label: '—', cls: 'p-gray' };
  const d = daysUntil(expiry);
  if (d < 0) return { label: '已过期', cls: 'p-red' };
  if (d <= 30) return { label: `${d}天后到期`, cls: 'p-amber' };
  return { label: '有效', cls: 'p-green' };
}

export default function Documents() {
  const user = useAuthStore(s => s.user);
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [docs, setDocs] = useState<DocRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // 上传弹窗
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState('passport');
  const [uploadExpiry, setUploadExpiry] = useState('');
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function fetchStudents() {
      const { data } = await db
        .from('students_info')
        .select('student_id, school_name, profiles(full_name)')
        .order('student_id');
      const list = (data as Student[]) || [];
      setStudents(list);
      if (list.length > 0) setSelected(list[0]);
      setIsLoading(false);
    }
    fetchStudents();
  }, []);

  const fetchDocs = useCallback(async (studentId: string) => {
    setDocsLoading(true);
    const { data } = await db
      .from('student_documents')
      .select('*')
      .eq('student_id', studentId)
      .order('id', { ascending: false });
    setDocs((data as DocRow[]) || []);
    setDocsLoading(false);
  }, []);

  useEffect(() => {
    if (selected) fetchDocs(selected.student_id);
  }, [selected, fetchDocs]);

  const getName = (s: Student) => {
    const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    return p?.full_name || '—';
  };

  const filtered = students.filter(s => getName(s).includes(search));
  const selectedName = selected ? getName(selected) : '';

  // 顶部凭证状态卡：从真实 docs 提取签证/保险
  const visaDoc = docs.find(d => d.doc_type === 'visa');
  const insuranceDoc = docs.find(d => d.doc_type === 'insurance');

  const handleUpload = async () => {
    if (!selected) return;
    if (!uploadFileObj) { message.warning('请选择文件'); return; }
    setUploading(true);
    try {
      // 1. 上传到 R2（敏感桶 student-docs）
      const { key } = await uploadFile('student-docs', `${selected.student_id}/${uploadType}`, uploadFileObj);
      // 2. 写入 student_documents
      const status = uploadExpiry
        ? (daysUntil(uploadExpiry) < 0 ? 'expired' : daysUntil(uploadExpiry) <= 30 ? 'expiring_soon' : 'valid')
        : 'valid';
      const { error } = await db.from('student_documents').insert({
        student_id: selected.student_id,
        doc_type: uploadType,
        file_url: key,
        expiry_date: uploadExpiry || null,
        status,
        uploaded_by: user?.id || null,
      });
      if (error) throw error;
      message.success('上传成功');
      setUploadOpen(false);
      setUploadFileObj(null);
      setUploadExpiry('');
      fetchDocs(selected.student_id);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (doc: DocRow) => {
    if (!doc.file_url) { message.warning('该记录无文件'); return; }
    try {
      const url = await getDownloadUrl('student-docs', doc.file_url);
      window.open(url, '_blank');
    } catch (err: any) {
      message.error(err.message || '获取下载链接失败');
    }
  };

  const handleDelete = (doc: DocRow) => {
    Modal.confirm({
      title: '删除文件记录',
      content: `确认删除 ${docLabel(doc.doc_type)} 记录吗？（R2 中的文件不会自动清除）`,
      okType: 'danger',
      onOk: async () => {
        const { error } = await db.from('student_documents').delete().eq('id', doc.id);
        if (error) { message.error('删除失败'); return; }
        message.success('已删除');
        if (selected) fetchDocs(selected.student_id);
      },
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <IconLoader2 className="spinner" size={32} style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  const fileName = (key: string | null) => (key ? key.split('/').pop() : '—');

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* 左侧学生列表 */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <IconSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input
            className="search-bar"
            style={{ width: '100%', paddingLeft: 30 }}
            placeholder="搜索学生…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(s => {
            const isActive = selected?.student_id === s.student_id;
            return (
              <div
                key={s.student_id}
                className={`subnav-item ${isActive ? 'subnav-active' : ''}`}
                onClick={() => setSelected(s)}
              >
                <div style={{ fontWeight: 500, color: isActive ? 'var(--color-text-info)' : undefined }}>
                  {getName(s)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 右侧文件详情 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{selectedName} — 文件管理</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              {selected?.school_name || '—'}
              {visaDoc?.expiry_date && ` · 签证有效至 ${visaDoc.expiry_date}`}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setUploadOpen(true)} disabled={!selected}>
            <IconUpload size={14} style={{ marginRight: 4 }} />上传文件
          </button>
        </div>

        {/* 凭证状态卡（真实数据） */}
        <div className="g2" style={{ marginBottom: 12 }}>
          {[{ label: '签证', doc: visaDoc }, { label: '健康保险', doc: insuranceDoc }].map(({ label, doc }) => {
            const st = deriveStatus(doc?.expiry_date || null);
            return (
              <div key={label} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}状态</div>
                <div style={{ fontWeight: 500 }}>
                  {doc ? (
                    <>到期 <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>{doc.expiry_date || '未填'}</span></>
                  ) : (
                    <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)' }}>未上传</span>
                  )}
                </div>
                <div style={{ marginTop: 4 }}><span className={`pill ${st.cls}`}>{st.label}</span></div>
              </div>
            );
          })}
        </div>

        {/* 文件表 */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {docsLoading ? (
            <div style={{ padding: 30, textAlign: 'center' }}>
              <IconLoader2 className="spinner" size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
          ) : docs.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
              暂无文件，点击右上角「上传文件」添加
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>文件类型</th>
                  <th>文件名</th>
                  <th>到期日</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => {
                  const st = deriveStatus(doc.expiry_date);
                  return (
                    <tr key={doc.id}>
                      <td><span className={`pill ${docCls(doc.doc_type)}`}>{docLabel(doc.doc_type)}</span></td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconFileText size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                        {fileName(doc.file_url)}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{doc.expiry_date || '—'}</td>
                      <td><span className={`pill ${st.cls}`}>{st.label}</span></td>
                      <td>
                        <span className="link" onClick={() => handleView(doc)}>查看</span>
                        {' · '}
                        <span className="link" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(doc)}>
                          <IconTrash size={12} style={{ verticalAlign: 'middle' }} /> 删除
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 上传弹窗 */}
      <Modal
        title={`上传文件 — ${selectedName}`}
        open={uploadOpen}
        onCancel={() => setUploadOpen(false)}
        onOk={handleUpload}
        okText={uploading ? '上传中…' : '上传'}
        confirmLoading={uploading}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          <div>
            <label className="form-label">文件类型</label>
            <select className="input" style={{ width: '100%' }} value={uploadType} onChange={e => setUploadType(e.target.value)}>
              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">到期日（签证/保险建议填，用于预警）</label>
            <input className="input" type="date" style={{ width: '100%' }} value={uploadExpiry} onChange={e => setUploadExpiry(e.target.value)} />
          </div>
          <div>
            <label className="form-label">选择文件（≤20MB）</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={e => setUploadFileObj(e.target.files?.[0] || null)}
            />
            {uploadFileObj && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>已选：{uploadFileObj.name}</div>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
