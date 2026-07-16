import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadFile, getDownloadUrl } from '../../lib/r2';
import { useAuthStore } from '../../store/useAuthStore';
import { Modal, Select, message } from 'antd';
import {
  IconPlus, IconLoader2, IconMessage2,
  IconPhone, IconMail, IconBrandWechat, IconNotes, IconUsers, IconPaperclip
} from '@tabler/icons-react';

const db = supabase as any;

interface Student {
  student_id: string;
  profiles: { full_name: string } | Array<{ full_name: string }>;
}

interface CommLog {
  id: number;
  student_id: string;
  contact_type: string;
  channel: string | null;
  content: string;
  attachment_url: string | null;
  created_at: string;
  staff_id: string | null;
  profiles?: { full_name: string } | Array<{ full_name: string }>;
}

const partyConfig: Record<string, { label: string; cls: string }> = {
  parent:        { label: '家长', cls: 'p-red' },
  school:        { label: '学校', cls: 'p-blue' },
  student:       { label: '学生', cls: 'p-gray' },
  accommodation: { label: '住宿方', cls: 'p-amber' },
};

const channelConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  phone:   { label: '电话沟通', icon: <IconPhone size={12} /> },
  email:   { label: '邮件', icon: <IconMail size={12} /> },
  wechat:  { label: '微信沟通', icon: <IconBrandWechat size={12} /> },
  meeting: { label: '面谈', icon: <IconUsers size={12} /> },
  note:    { label: '备注', icon: <IconNotes size={12} /> },
};

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const hhmm = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  if (diff === 0) return `今天 ${hhmm}`;
  if (diff === 1) return `昨天 ${hhmm}`;
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

const blankForm = { contact_type: 'parent', channel: 'phone', content: '' };

// restrictStudentIds：传入时仅显示这些学生（生活老师限名下公寓）；不传 = 全体（学管默认）
export default function Communications({ restrictStudentIds }: { restrictStudentIds?: string[] } = {}) {
  const user = useAuthStore(s => s.user);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [logs, setLogs] = useState<CommLog[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 添加记录弹窗
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...blankForm });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const restrictKey = restrictStudentIds ? restrictStudentIds.join(',') : null;
  useEffect(() => {
    async function fetchStudents() {
      let q = db.from('students_info').select('student_id, profiles(full_name)').order('student_id');
      if (restrictStudentIds) q = q.in('student_id', restrictStudentIds.length ? restrictStudentIds : ['00000000-0000-0000-0000-000000000000']);
      const { data } = await q;
      const list = (data as Student[]) || [];
      setStudents(list);
      setSelectedStudent(list.length > 0 ? list[0] : null);
      setIsLoading(false);
    }
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restrictKey]);

  const fetchLogs = async (studentId: string) => {
    const { data } = await db
      .from('communication_logs')
      .select('*, profiles!communication_logs_staff_id_fkey(full_name)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    setLogs((data as CommLog[]) || []);
  };

  useEffect(() => {
    if (selectedStudent) fetchLogs(selectedStudent.student_id);
  }, [selectedStudent]);

  const getStudentName = (s: Student) => {
    const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    return p?.full_name || '—';
  };

  const handleSave = async () => {
    if (!selectedStudent) { message.warning('请先选择学生'); return; }
    if (!form.content.trim()) { message.warning('请填写沟通内容'); return; }
    setSaving(true);
    try {
      let attachment_url: string | null = null;
      if (file) {
        const { key } = await uploadFile('resources', 'comm', file);
        attachment_url = key;
      }
      const { error } = await db.from('communication_logs').insert({
        student_id: selectedStudent.student_id,
        staff_id: user?.id || null,
        contact_type: form.contact_type,
        channel: form.channel,
        content: form.content.trim(),
        attachment_url,
      });
      if (error) throw error;
      message.success('沟通记录已添加');
      setOpen(false);
      setForm({ ...blankForm });
      setFile(null);
      fetchLogs(selectedStudent.student_id);
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const viewAttachment = async (key: string) => {
    try {
      const url = await getDownloadUrl('resources', key);
      window.open(url, '_blank');
    } catch (e: any) {
      message.error(e.message || '获取附件失败');
    }
  };

  const filteredStudents = students.filter((s) => getStudentName(s).includes(searchText));
  const filteredLogs = filterParty ? logs.filter((l) => l.contact_type === filterParty) : logs;
  const selectedName = selectedStudent ? getStudentName(selectedStudent) : '';

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <IconLoader2 className="spinner" size={32} style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* 左侧学生列表 */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <input
          className="search-bar"
          style={{ width: '100%', marginBottom: 10 }}
          placeholder="搜索学生…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <select
          className="sel"
          style={{ width: '100%', marginBottom: 10 }}
          value={filterParty}
          onChange={(e) => setFilterParty(e.target.value)}
        >
          <option value="">全部对象</option>
          <option value="student">学生</option>
          <option value="parent">家长</option>
          <option value="school">学校</option>
          <option value="accommodation">住宿方</option>
        </select>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredStudents.map((s) => {
            const name = getStudentName(s);
            const isActive = selectedStudent?.student_id === s.student_id;
            return (
              <div
                key={s.student_id}
                className={`subnav-item ${isActive ? 'subnav-active' : ''}`}
                onClick={() => setSelectedStudent(s)}
              >
                <div style={{ fontWeight: 500, color: isActive ? 'var(--color-text-info)' : undefined }}>{name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 右侧时间线 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>
            <IconMessage2 size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {selectedName} — 沟通记录
          </div>
          <button className="btn btn-primary" onClick={() => { setForm({ ...blankForm }); setFile(null); setOpen(true); }}>
            <IconPlus size={14} style={{ marginRight: 4 }} />添加记录
          </button>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
            <IconMessage2 size={40} style={{ color: 'var(--color-border-hover)', marginBottom: 12 }} />
            <div style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>暂无沟通记录</div>
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13, marginTop: 6 }}>
              点击右上角「添加记录」记录与家长/学校的沟通情况
            </div>
          </div>
        ) : (
          <div className="card">
            {filteredLogs.map((log, idx) => {
              const party = partyConfig[log.contact_type] || { label: log.contact_type, cls: 'p-gray' };
              const channel = log.channel ? (channelConfig[log.channel] || { label: log.channel, icon: null }) : null;
              const staffName = Array.isArray(log.profiles)
                ? (log.profiles as any[])[0]?.full_name
                : log.profiles?.full_name;
              return (
                <div
                  key={log.id}
                  className="timeline-item"
                  style={{ borderBottom: idx < filteredLogs.length - 1 ? undefined : 'none' }}
                >
                  <div style={{ width: 80, flexShrink: 0, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                    {formatTime(log.created_at)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className={`pill ${party.cls}`}>{party.label}</span>
                      {channel && (
                        <span style={{ fontWeight: 500, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {channel.icon}{channel.label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12 }}>{log.content}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>操作人：{staffName || '—'}</span>
                      {log.attachment_url && (
                        <span className="link" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 2 }} onClick={() => viewAttachment(log.attachment_url!)}>
                          <IconPaperclip size={12} /> 附件
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal title={`添加沟通记录 · ${selectedName}`} open={open} onCancel={() => setOpen(false)} onOk={handleSave} okText={saving ? '保存中…' : '保存'} confirmLoading={saving} width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">沟通对象</label>
              <Select
                style={{ width: '100%' }}
                value={form.contact_type}
                onChange={v => setForm(f => ({ ...f, contact_type: v }))}
                options={[
                  { label: '家长', value: 'parent' },
                  { label: '学生', value: 'student' },
                  { label: '学校', value: 'school' },
                  { label: '住宿方', value: 'accommodation' },
                ]}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">沟通方式</label>
              <Select
                style={{ width: '100%' }}
                value={form.channel}
                onChange={v => setForm(f => ({ ...f, channel: v }))}
                options={[
                  { label: '电话沟通', value: 'phone' },
                  { label: '微信沟通', value: 'wechat' },
                  { label: '邮件', value: 'email' },
                  { label: '面谈', value: 'meeting' },
                  { label: '备注', value: 'note' },
                ]}
              />
            </div>
          </div>
          <div>
            <label className="form-label">沟通内容 *</label>
            <textarea className="input" rows={4} style={{ width: '100%' }} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="记录沟通要点…" />
          </div>
          <div>
            <label className="form-label">附件（截图等，可选）</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
            {file && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>已选：{file.name}</div>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
