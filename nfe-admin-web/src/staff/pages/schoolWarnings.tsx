// 学管 · 学校警告信登记（外部红线）：登记 + 上传扫描件；累计 3 封 → 达劝退评估（亮红）
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { recomputeRisk } from '../../lib/riskEngine';
import { message, Modal, Select, Input } from 'antd';
import { IconLoader2, IconPlus } from '@tabler/icons-react';
import { Section } from '../ui';
import FileUploadButton from '../../components/common/FileUploadButton';
import { getDownloadUrl } from '../../lib/r2';

const db = supabase as any;

const CATEGORIES = [
  { label: '出勤', value: 'attendance' },
  { label: '学术不端', value: 'academic' },
  { label: '纪律', value: 'discipline' },
];
const catLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label || v || '—';

interface Letter {
  id: number; student_id: string; category: string | null; occurred_on: string | null;
  evidence_content: string | null; attachment_url: string | null; status: string;
  student?: { full_name: string } | Array<{ full_name: string }>;
}

export function SchoolWarnings() {
  const issuerId = useAuthStore(s => s.user?.id ?? null);
  const [rows, setRows] = useState<Letter[]>([]);
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ student_id: '', category: 'attendance', occurred_on: '', reason: '', attachment_url: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from('warning_letters')
      .select('id, student_id, category, occurred_on, evidence_content, attachment_url, status, student:profiles!warning_letters_student_id_fkey(full_name)')
      .eq('source', 'school').neq('status', 'rejected').order('id', { ascending: false });
    setRows((data as Letter[]) || []);
    setLoading(false);
  }, []);
  const loadStudents = useCallback(async () => {
    const { data } = await db.from('profiles').select('id, full_name').eq('role', 'student').order('full_name');
    setStudents((data as any[]) || []);
  }, []);
  useEffect(() => { load(); loadStudents(); }, [load, loadStudents]);

  const name = (s: Letter['student']) => (Array.isArray(s) ? s[0]?.full_name : s?.full_name) || '—';

  // 每生张数
  const countByStudent: Record<string, number> = {};
  for (const r of rows) countByStudent[r.student_id] = (countByStudent[r.student_id] || 0) + 1;

  const save = async () => {
    if (!form.student_id) { message.warning('请选择学生'); return; }
    if (!form.reason.trim()) { message.warning('请填写事由'); return; }
    setSaving(true);
    try {
      const { error } = await db.from('warning_letters').insert({
        student_id: form.student_id, issuer_id: issuerId, warning_level: 0,
        source: 'school', category: form.category, occurred_on: form.occurred_on || null,
        evidence_content: form.reason.trim(), attachment_url: form.attachment_url || null, status: 'issued',
      });
      if (error) throw error;
      const res = await recomputeRisk(form.student_id, issuerId);
      const cnt = (countByStudent[form.student_id] || 0) + 1;
      message.success(`已登记，该生学校警告信 ${cnt} 封${cnt >= 3 ? '（已达劝退评估，请人工复核）' : ''}${res ? ` · 风险${res.level === 'red' ? '红' : res.level === 'yellow' ? '黄' : '绿'}` : ''}`);
      setOpen(false); setForm({ student_id: '', category: 'attendance', occurred_on: '', reason: '', attachment_url: '' });
      load();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally { setSaving(false); }
  };

  return (
    <Section title="学校警告信登记" hint="外部红线 · 登记学校发的警告信并上传扫描件 · 同一学生累计 3 封 = 达劝退评估"
      action={<button className="btn btn-primary" onClick={() => setOpen(true)}><IconPlus size={16} style={{ marginRight: 6 }} />登记学校警告信</button>}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><IconLoader2 className="spinner" size={24} style={{ color: 'var(--color-primary)' }} /></div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无学校警告信记录</div>
      ) : (
        <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
          <thead><tr>
            <th style={{ padding: '10px 12px' }}>学生</th><th style={{ padding: '10px 12px' }}>该生累计</th>
            <th style={{ padding: '10px 12px' }}>类别</th><th style={{ padding: '10px 12px' }}>日期</th>
            <th style={{ padding: '10px 12px' }}>事由</th><th style={{ padding: '10px 12px' }}>附件</th>
          </tr></thead>
          <tbody>
            {rows.map(r => {
              const cnt = countByStudent[r.student_id] || 0;
              return (
                <tr key={r.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{name(r.student)}</td>
                  <td style={{ padding: '10px 12px' }}><span className={`pill ${cnt >= 3 ? 'p-red' : cnt === 2 ? 'p-amber' : 'p-gray'}`}>{cnt} 封{cnt >= 3 ? ' · 达劝退评估' : ''}</span></td>
                  <td style={{ padding: '10px 12px' }}>{catLabel(r.category || '')}</td>
                  <td style={{ padding: '10px 12px' }}>{r.occurred_on || '—'}</td>
                  <td style={{ padding: '10px 12px', maxWidth: 280, color: 'var(--color-text-secondary)' }}>{r.evidence_content || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {r.attachment_url
                      ? <span className="link" onClick={async () => { try { window.open(await getDownloadUrl('materials', r.attachment_url!), '_blank'); } catch { message.error('打开失败'); } }}>查看</span>
                      : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Modal title="登记学校警告信" open={open} onCancel={() => setOpen(false)} onOk={save} okText={saving ? '保存中…' : '保存'} confirmLoading={saving} width={460}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          <div>
            <label className="form-label">学生 *</label>
            <Select showSearch optionFilterProp="label" style={{ width: '100%' }} value={form.student_id || undefined}
              placeholder="搜索并选择学生" onChange={v => setForm(f => ({ ...f, student_id: v }))}
              options={students.map(s => ({ label: s.full_name, value: s.id }))} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">类别</label>
              <Select style={{ width: '100%' }} value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} options={CATEGORIES} />
            </div>
            <div style={{ width: 160 }}>
              <label className="form-label">信件日期</label>
              <input className="input" type="date" style={{ width: '100%' }} value={form.occurred_on} onChange={e => setForm(f => ({ ...f, occurred_on: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label">事由 *</label>
            <Input.TextArea rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="学校警告信内容摘要 / 原因" />
          </div>
          <div>
            <label className="form-label">上传扫描件</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileUploadButton bucket="materials" prefix="school-warnings" label="上传附件" onUploaded={({ key }) => setForm(f => ({ ...f, attachment_url: key }))} />
              {form.attachment_url && <span style={{ fontSize: 12, color: 'var(--color-success)' }}>已上传</span>}
            </div>
          </div>
        </div>
      </Modal>
    </Section>
  );
}
