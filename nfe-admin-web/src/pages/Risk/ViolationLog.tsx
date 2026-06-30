import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useRiskStore } from '../../store/useRiskStore';
import { message, Modal, Select, InputNumber } from 'antd';
import { IconAlertOctagon, IconLoader2, IconPlus, IconSearch, IconArchive, IconShieldX } from '@tabler/icons-react';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/common/Pagination';
import WarningLetterModal from './WarningLetterModal';
import { recomputeRisk } from '../../lib/riskEngine';
import FileUploadButton from '../../components/common/FileUploadButton';
import { getDownloadUrl } from '../../lib/r2';

const db = supabase as any;

// 违规类型与默认扣分（口径见 风险评分系统_设计与TodoList.md）
const VIOLATION_TYPES: { label: string; value: string; deduction: number }[] = [
  { label: '缺席自习', value: '缺席自习', deduction: 8 },
  { label: '手机/电子设备', value: '手机使用', deduction: 5 },
  { label: '晚归未报备', value: '晚归', deduction: 5 },
  { label: '睡觉', value: '睡觉', deduction: 5 },
  { label: '闲聊', value: '闲聊', deduction: 5 },
  { label: '严重违纪', value: '严重违纪', deduction: 10 },
  { label: '学术不端', value: '学术不端', deduction: 10 },
  { label: '其他', value: '其他', deduction: 0 },
];

interface Violation {
  id: number;
  student_id: string;
  reporter_id: string | null;
  violation_type: string | null;
  reason: string;
  deduction_points: number;
  status: string;
  created_at: string;
  student?: { full_name: string } | Array<{ full_name: string }>;
  reporter?: { full_name: string } | Array<{ full_name: string }>;
}

interface StudentOpt { id: string; full_name: string; }

const blankForm = { student_id: '', violation_type: '缺席自习', reason: '', deduction_points: 8, attachment_url: '' };

export default function ViolationLog() {
  const user = useAuthStore(s => s.user);
  const issueWarning = useRiskStore(s => s.issueWarning);

  const [rows, setRows] = useState<Violation[]>([]);
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState<string | undefined>();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...blankForm });
  const [saving, setSaving] = useState(false);

  // 警告信弹窗
  const [warnFor, setWarnFor] = useState<{ id: string; name: string } | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from('violation_logs')
      .select('*, student:profiles!violation_logs_student_id_fkey(full_name), reporter:profiles!violation_logs_reporter_id_fkey(full_name)')
      .order('created_at', { ascending: false });
    setRows((data as Violation[]) || []);
    setLoading(false);
  }, []);

  const fetchStudents = useCallback(async () => {
    const { data } = await db.from('profiles').select('id, full_name').eq('role', 'student').order('full_name');
    setStudents((data as StudentOpt[]) || []);
  }, []);

  useEffect(() => { fetchRows(); fetchStudents(); }, [fetchRows, fetchStudents]);

  const name = (p?: { full_name: string } | Array<{ full_name: string }>) =>
    (Array.isArray(p) ? p[0]?.full_name : p?.full_name) || '—';

  const onTypeChange = (v: string) => {
    const t = VIOLATION_TYPES.find(x => x.value === v);
    setForm(f => ({ ...f, violation_type: v, deduction_points: t ? t.deduction : f.deduction_points }));
  };

  const handleSave = async () => {
    if (!form.student_id) { message.warning('请选择学生'); return; }
    if (!form.reason.trim()) { message.warning('请填写违规说明'); return; }
    setSaving(true);
    try {
      const { error } = await db.from('violation_logs').insert({
        student_id: form.student_id,
        reporter_id: user?.id || null,
        violation_type: form.violation_type,
        reason: form.reason.trim(),
        deduction_points: form.deduction_points,
        attachment_url: form.attachment_url || null,
        status: 'pending',
      });
      if (error) throw error;
      // 录入即时重算该学生风险分
      const r = await recomputeRisk(form.student_id, user?.id || null);
      message.success(r ? `违规已登记，风险分已更新为 ${r.score}（${r.level === 'red' ? '红' : r.level === 'yellow' ? '黄' : '绿'}）` : '违规已登记');
      setOpen(false);
      setForm({ ...blankForm });
      fetchRows();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const archive = async (v: Violation) => {
    const { error } = await db.from('violation_logs').update({ status: 'archived' }).eq('id', v.id);
    if (error) { message.error('存档失败'); return; }
    await recomputeRisk(v.student_id, user?.id || null);
    message.success('已存档');
    fetchRows();
  };

  const filtered = rows.filter(v => {
    const kw = search.trim();
    const matchKw = !kw || name(v.student).includes(kw) || (v.violation_type || '').includes(kw) || v.reason.includes(kw);
    const matchStatus = !fStatus || v.status === fStatus;
    return matchKw && matchStatus;
  });
  const PAGE_SIZE = 20;
  const { paged, page, totalPages, setPage, reset: resetPage, total } = usePagination(filtered, PAGE_SIZE);

  return (
    <div className="page active">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <IconSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
            <input className="search-bar" style={{ paddingLeft: 30 }} placeholder="搜索学生/类型/说明…" value={search} onChange={e => { setSearch(e.target.value); resetPage(); }} />
          </div>
          <Select allowClear placeholder="状态" style={{ width: 130 }} value={fStatus} onChange={v => { setFStatus(v); resetPage(); }}
            options={[{ label: '待存档', value: 'pending' }, { label: '已存档', value: 'archived' }]} />
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ ...blankForm }); setOpen(true); }}>
          <IconPlus size={16} style={{ marginRight: 6 }} /> 新增违规
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}><IconLoader2 className="spinner" size={24} style={{ color: 'var(--color-primary)' }} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无违规记录</div>
        ) : (
          <>
            <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px' }}>学生</th>
                  <th style={{ padding: '12px 16px' }}>类型</th>
                  <th style={{ padding: '12px 16px' }}>说明</th>
                  <th style={{ padding: '12px 16px' }}>扣分</th>
                  <th style={{ padding: '12px 16px' }}>登记人</th>
                  <th style={{ padding: '12px 16px' }}>日期</th>
                  <th style={{ padding: '12px 16px' }}>状态</th>
                  <th style={{ padding: '12px 16px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(v => (
                  <tr key={v.id} style={{ borderTop: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{name(v.student)}</td>
                    <td style={{ padding: '12px 16px' }}><span className="pill p-amber">{v.violation_type || '—'}</span></td>
                    <td style={{ padding: '12px 16px', maxWidth: 280, color: 'var(--color-text-secondary)' }}>{v.reason}</td>
                    <td style={{ padding: '12px 16px' }}>{v.deduction_points ? `−${v.deduction_points}` : '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{name(v.reporter)}</td>
                    <td style={{ padding: '12px 16px' }}>{new Date(v.created_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`pill ${v.status === 'archived' ? 'p-gray' : 'p-blue'}`}>{v.status === 'archived' ? '已存档' : '待存档'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span className="link" style={{ color: 'var(--color-danger)' }} onClick={() => setWarnFor({ id: v.student_id, name: name(v.student) })}>
                        <IconShieldX size={12} style={{ verticalAlign: 'middle' }} /> 申请警告信
                      </span>
                      {v.status !== 'archived' && (
                        <>{' · '}<span className="link" onClick={() => archive(v)}><IconArchive size={12} style={{ verticalAlign: 'middle' }} /> 存档</span></>
                      )}
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

      <Modal title={<span><IconAlertOctagon size={18} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--color-danger)' }} />新增违规记录</span>}
        open={open} onCancel={() => setOpen(false)} onOk={handleSave} okText={saving ? '保存中…' : '保存'} confirmLoading={saving} width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          <div>
            <label className="form-label">学生 *</label>
            <Select showSearch style={{ width: '100%' }} value={form.student_id || undefined} placeholder="搜索并选择学生"
              optionFilterProp="label" onChange={v => setForm(f => ({ ...f, student_id: v }))}
              options={students.map(s => ({ label: s.full_name, value: s.id }))} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">违规类型</label>
              <Select style={{ width: '100%' }} value={form.violation_type} onChange={onTypeChange}
                options={VIOLATION_TYPES.map(t => ({ label: t.label, value: t.value }))} />
            </div>
            <div style={{ width: 120 }}>
              <label className="form-label">扣分</label>
              <InputNumber style={{ width: '100%' }} min={0} max={100} value={form.deduction_points}
                onChange={v => setForm(f => ({ ...f, deduction_points: (v as number) ?? 0 }))} />
            </div>
          </div>
          <div>
            <label className="form-label">违规说明 *</label>
            <textarea className="input" rows={3} style={{ width: '100%' }} value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="时间、地点、经过、是否已通知等…" />
          </div>
          <div>
            <label className="form-label">证明附件{form.violation_type === '学术不端' ? '（学术不端建议上传）' : '（可选）'}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileUploadButton bucket="materials" prefix="violations" label="上传附件"
                onUploaded={({ key }) => setForm(f => ({ ...f, attachment_url: key }))} />
              {form.attachment_url && <span className="link" onClick={async () => { try { window.open(await getDownloadUrl('materials', form.attachment_url), '_blank'); } catch { message.error('打开失败'); } }}>已上传 · 查看</span>}
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>扣分将计入风险评分（15 天滚动窗口）。</div>
        </div>
      </Modal>

      {warnFor && (
        <WarningLetterModal
          isOpen={!!warnFor}
          onClose={() => setWarnFor(null)}
          studentId={warnFor.id}
          studentName={warnFor.name}
          currentScore={0}
          onSubmit={async (level, evidence) => { await issueWarning(warnFor.id, level, evidence); message.success('警告信已提交审批'); }}
        />
      )}
    </div>
  );
}
