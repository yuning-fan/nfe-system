import { useEffect, useState } from 'react';
import { message, Modal } from 'antd';
import { IconShieldCheck, IconCircleCheck, IconCircle, IconArrowRight, IconCalendarClock, IconUser, IconPlus, IconFileText } from '@tabler/icons-react';
import { supabase } from '../../lib/supabase';
import { getDownloadUrl } from '../../lib/r2';
import { useAuthStore } from '../../store/useAuthStore';
import { useDcgStore, DCG_STAGES, nextReportDue, type DcgStage } from '../../store/useDcgStore';
import FileUploadButton from '../../components/common/FileUploadButton';

interface Props {
  studentId: string;
  studentName: string;
  dateOfBirth: string | null;
  documents: any[];
  onDocsChanged: () => void;
}

// DCG 各阶段对应的材料（conditional offer 复用 offer_letter）
const DCG_MATERIALS: { type: string; label: string }[] = [
  { type: 'offer_letter', label: 'Conditional Offer' },
  { type: 'dcg_receipt', label: 'DCG 缴费清单' },
  { type: 'parent_proof', label: '与家长相识证明截图' },
  { type: 'apartment_visit', label: '公寓访问照片' },
];

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const b = new Date(dob), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

export default function DcgPanel({ studentId, studentName, dateOfBirth, documents, onDocsChanged }: Props) {
  const { currentCase, reports, isLoading, fetchCaseByStudent, createCase, updateStage, addReport } = useDcgStore();
  const user = useAuthStore(s => s.user);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportContent, setReportContent] = useState('');
  const [reportPhoto, setReportPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCaseByStudent(studentId);
  }, [studentId, fetchCaseByStudent]);

  const age = calcAge(dateOfBirth);
  const isMinor = age != null && age < 18;

  const handleCreate = async () => {
    const ok = await createCase(studentId);
    message[ok ? 'success' : 'error'](ok ? 'DCG 案件已建立' : '建立失败，请重试');
  };

  const handleAdvance = async () => {
    if (!currentCase) return;
    const idx = DCG_STAGES.findIndex(s => s.key === currentCase.stage);
    const next = DCG_STAGES[idx + 1];
    if (!next) return;
    const ok = await updateStage(currentCase.id, next.key as DcgStage, next.dateField);
    message[ok ? 'success' : 'error'](ok ? `已推进到「${next.label}」` : '操作失败');
  };

  // 上传 DCG 材料 → 写入 student_documents
  const handleMaterialUploaded = async (docType: string, key: string) => {
    const { error } = await supabase.from('student_documents').insert({
      student_id: studentId,
      doc_type: docType as any,
      file_url: key,
      status: 'valid',
      uploaded_by: user?.id || null,
    } as any);
    if (error) { message.error('材料保存失败'); return; }
    onDocsChanged();
  };

  const viewDoc = async (key: string) => {
    try { window.open(await getDownloadUrl('student-docs', key), '_blank'); }
    catch (e: any) { message.error(e.message || '获取链接失败'); }
  };

  const submitReport = async () => {
    if (!currentCase) return;
    if (!reportContent.trim()) { message.warning('请填写监督情况'); return; }
    setSaving(true);
    const ok = await addReport(currentCase.id, { report_date: reportDate, content: reportContent, photo_url: reportPhoto });
    setSaving(false);
    if (ok) {
      message.success('监督报告已记录');
      setReportOpen(false); setReportContent(''); setReportPhoto(null);
      setReportDate(new Date().toISOString().slice(0, 10));
    } else message.error('保存失败，请重试');
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>加载中…</div>;
  }

  // 无案件
  if (!currentCase) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <IconShieldCheck size={40} style={{ color: isMinor ? '#EF9F27' : 'var(--color-text-tertiary)', marginBottom: 12 }} />
        {isMinor ? (
          <>
            <h3 style={{ marginBottom: 6 }}>该学生未满 18 岁（{age} 岁），需要走 DCG 监护流程</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 16 }}>建立 DCG 案件后，系统会按公寓自动指派监护人并开始流程追踪。</p>
            <button className="btn btn-primary" onClick={handleCreate}><IconPlus size={16} style={{ marginRight: 4 }} />建立 DCG 案件</button>
          </>
        ) : (
          <>
            <h3 style={{ marginBottom: 6, color: 'var(--color-text-secondary)' }}>{age == null ? '未填写出生日期' : `该学生已满 18 岁（${age} 岁）`}</h3>
            <p style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>{age == null ? '请先在基本信息中补充出生日期，以判断是否需要 DCG。' : '通常无需 DCG 流程。如确需，可手动建立案件。'}</p>
            {age != null && <button className="btn" style={{ marginTop: 14 }} onClick={handleCreate}>仍要建立 DCG 案件</button>}
          </>
        )}
      </div>
    );
  }

  const currentIdx = DCG_STAGES.findIndex(s => s.key === currentCase.stage);
  const isSupervising = currentCase.stage === 'supervising' || currentCase.stage === 'completed';
  const dueDate = isSupervising ? nextReportDue(reports, currentCase.archived_date) : null;
  const overdue = dueDate ? new Date(dueDate).getTime() < Date.now() : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 顶部：监护人 + 推进 */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconUser size={18} style={{ color: 'var(--color-text-secondary)' }} />
          <span style={{ fontSize: 13 }}>公寓监护人：</span>
          <span style={{ fontWeight: 600 }}>{currentCase.guardian?.full_name || <span style={{ color: '#A05000' }}>未分配（去「公寓监护人」设置）</span>}</span>
        </div>
        {currentCase.stage !== 'completed' && (
          <button className="btn btn-primary" onClick={handleAdvance}>
            推进到「{DCG_STAGES[currentIdx + 1]?.label}」<IconArrowRight size={16} style={{ marginLeft: 4 }} />
          </button>
        )}
      </div>

      {/* 阶段进度条 */}
      <div className="card">
        <div className="card-title"><IconShieldCheck size={16} />DCG 流程进度</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {DCG_STAGES.map((s, i) => {
            const done = i < currentIdx, cur = i === currentIdx;
            const dateVal = s.dateField ? (currentCase as any)[s.dateField] : null;
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < DCG_STAGES.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                {done ? <IconCircleCheck size={20} style={{ color: 'var(--color-success)' }} />
                  : cur ? <IconCircle size={20} style={{ color: 'var(--color-primary)', fill: 'var(--color-background-info)' }} />
                  : <IconCircle size={20} style={{ color: 'var(--color-border)' }} />}
                <span style={{ flex: 1, fontWeight: cur ? 600 : 400, color: done ? 'var(--color-text-secondary)' : cur ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>{s.label}</span>
                {cur && <span className="pill p-blue">进行中</span>}
                {dateVal && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{dateVal}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 材料归档 */}
      <div className="card">
        <div className="card-title"><IconFileText size={16} />材料归档</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {DCG_MATERIALS.map(m => {
            const doc = documents.find((d: any) => d.doc_type === m.type);
            return (
              <div key={m.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {doc ? <IconCircleCheck size={16} style={{ color: 'var(--color-success)' }} /> : <IconCircle size={16} style={{ color: 'var(--color-border)' }} />}
                  <span style={{ fontSize: 13 }}>{m.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {doc && <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => viewDoc(doc.file_url)}>查看</button>}
                  <FileUploadButton
                    bucket="student-docs"
                    prefix={`${studentId}/${m.type}`}
                    accept="image/*,.pdf"
                    label={doc ? '替换' : '上传'}
                    className=""
                    onUploaded={async ({ key }) => { await handleMaterialUploaded(m.type, key); }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 监督报告（进入监督阶段后显示） */}
      {isSupervising && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}><IconCalendarClock size={16} />监督报告（每月一次）</div>
            <button className="btn btn-primary" style={{ padding: '4px 10px' }} onClick={() => setReportOpen(true)}><IconPlus size={14} style={{ marginRight: 4 }} />新增报告</button>
          </div>
          {dueDate && (
            <div style={{ fontSize: 12, marginBottom: 10, color: overdue ? '#A32D2D' : 'var(--color-text-secondary)', fontWeight: overdue ? 600 : 400 }}>
              {overdue ? `⚠️ 监督报告已逾期（应于 ${dueDate} 前提交）` : `下次监督报告到期：${dueDate}`}
            </div>
          )}
          {reports.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>暂无监督报告</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reports.map(r => (
                <div key={r.id} style={{ padding: 10, border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{r.report_date}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{r.reporter?.full_name || '—'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{r.content || '无说明'}</div>
                  {r.photo_url && <span className="link" style={{ fontSize: 12 }} onClick={() => viewDoc(r.photo_url!)}>查看照片</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 新增监督报告弹窗 */}
      <Modal title={`新增监督报告 · ${studentName}`} open={reportOpen} onCancel={() => setReportOpen(false)} onOk={submitReport} okText={saving ? '保存中…' : '保存'} confirmLoading={saving}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          <div>
            <label className="form-label">报告日期</label>
            <input className="input" type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label">监督情况说明</label>
            <textarea className="input" rows={4} value={reportContent} onChange={e => setReportContent(e.target.value)} placeholder="本月学生在公寓的生活、学习、状态等情况…" />
          </div>
          <div>
            <label className="form-label">现场照片（可选）</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileUploadButton bucket="student-docs" prefix={`${studentId}/dcg_supervision`} accept="image/*" label={reportPhoto ? '已选，重传' : '上传照片'} className="" onUploaded={async ({ key }) => { setReportPhoto(key); }} />
              {reportPhoto && <span style={{ fontSize: 12, color: 'var(--color-success)' }}>✓ 已附照片</span>}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
