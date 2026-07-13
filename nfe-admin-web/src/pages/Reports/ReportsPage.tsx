import { useEffect, useState } from 'react';
import { useReportStore } from '../../store/useReportStore';
import type { ReportRecord } from '../../store/useReportStore';
import { IconReport, IconPencil, IconEye, IconTrash, IconFileDownload } from '@tabler/icons-react';
import { Modal, Select, message } from 'antd';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/common/Pagination';
import StudentSelect from '../../components/common/StudentSelect';
import { ReportEditor, ReportPreview } from './ReportEditor';
import { exportReportDoc } from '../../lib/reportExport';

// 默认周期：出勤=近14天，学术=近30天
function defaultPeriod(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}
const typeLabel = (t: string) => (t === 'monthly' ? '学术月报' : t === 'biweekly' ? '出勤双周报' : t);

export default function ReportsPage() {
  const { reports, fetchReports, generateReports, updateReport, deleteReport, publishReport, isLoading } = useReportStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [genOpen, setGenOpen] = useState(false);
  const [genType, setGenType] = useState<'biweekly' | 'monthly'>('biweekly');
  const dp = defaultPeriod(14);
  const [genStart, setGenStart] = useState(dp.start);
  const [genEnd, setGenEnd] = useState(dp.end);
  const [genStudent, setGenStudent] = useState<string | undefined>(); // undefined = 全体
  const [generating, setGenerating] = useState(false);

  const [editing, setEditing] = useState<ReportRecord | null>(null);
  const [previewing, setPreviewing] = useState<ReportRecord | null>(null);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const fmt = (s: string | null) => s ? `${s.slice(5, 7)}-${s.slice(8, 10)}` : '-';
  const period = (r: ReportRecord) => (r.period_start && r.period_end) ? `${fmt(r.period_start)} 至 ${fmt(r.period_end)}` : '—';

  const filtered = reports.filter(r => {
    const ms = (r.student?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const mst = statusFilter === 'all' ? true : statusFilter === 'draft' ? r.status === 'draft' : r.status === 'sent';
    return ms && mst;
  });
  const drafts = filtered.filter(r => r.status === 'draft');
  const archives = filtered.filter(r => r.status === 'sent');
  const PAGE_SIZE = 20;
  const draftsPage = usePagination(drafts, PAGE_SIZE);
  const archivesPage = usePagination(archives, PAGE_SIZE);

  const onPickType = (t: 'biweekly' | 'monthly') => {
    setGenType(t);
    const d = defaultPeriod(t === 'monthly' ? 30 : 14);
    setGenStart(d.start); setGenEnd(d.end);
  };

  const doGenerate = async () => {
    if (!genStart || !genEnd) { message.warning('请选择报告周期'); return; }
    setGenerating(true);
    try { await generateReports(genType, genStart, genEnd, genStudent ? [genStudent] : undefined); setGenOpen(false); }
    finally { setGenerating(false); }
  };

  const confirmDelete = (r: ReportRecord) => {
    Modal.confirm({ title: '删除报告', content: `确认删除「${r.student?.full_name} 双周报告」草稿吗？`, okType: 'danger', onOk: () => deleteReport(r.id) });
  };

  return (
    <div className="page active">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input className="search-bar" placeholder="搜索学生…" value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); draftsPage.reset(); archivesPage.reset(); }} />
          <select className="sel" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); draftsPage.reset(); archivesPage.reset(); }}>
            <option value="all">全部状态</option>
            <option value="draft">待审核</option>
            <option value="sent">已发布</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setGenOpen(true)} disabled={isLoading}>
          <IconReport size={16} style={{ marginRight: 6 }} /> 生成报告
        </button>
      </div>

      <div className="g2" style={{ alignItems: 'start' }}>
        {/* 待审核 */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 13, fontWeight: 500 }}>
            待审核报告 <span className="pill p-amber" style={{ marginLeft: 6 }}>{drafts.length} 条</span>
          </div>
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>学生</th>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>报告周期</th>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {draftsPage.paged.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar-xs av-pink">{r.student?.full_name?.charAt(0) || 'U'}</div>
                      <span>{r.student?.full_name || '-'}</span>
                      <span className={`pill ${r.report_type === 'monthly' ? 'p-blue' : 'p-amber'}`} style={{ fontSize: 10 }}>{typeLabel(r.report_type)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{period(r)}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span className="link" onClick={() => setEditing(r)}><IconPencil size={12} style={{ verticalAlign: 'middle' }} /> 编辑</span>
                    {' · '}<span className="link" onClick={() => setPreviewing(r)}><IconEye size={12} style={{ verticalAlign: 'middle' }} /> 预览</span>
                    {' · '}<span className="link" onClick={() => exportReportDoc(r)}><IconFileDownload size={12} style={{ verticalAlign: 'middle' }} /> Word</span>
                    {' · '}<span className="link" onClick={() => publishReport(r.id)}>审核发布</span>
                    {' · '}<span className="link" style={{ color: 'var(--color-danger)' }} onClick={() => confirmDelete(r)}><IconTrash size={12} style={{ verticalAlign: 'middle' }} /> 删除</span>
                  </td>
                </tr>
              ))}
              {drafts.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-tertiary)' }}>无待审核报告</td></tr>}
            </tbody>
          </table>
          <div style={{ padding: '0 16px' }}><Pagination page={draftsPage.page} totalPages={draftsPage.totalPages} total={draftsPage.total} pageSize={PAGE_SIZE} onPage={draftsPage.setPage} /></div>
        </div>

        {/* 历史存档 */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 13, fontWeight: 500 }}>历史报告存档</div>
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>学生</th>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>报告周期</th>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>发布时间</th>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {archivesPage.paged.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar-xs av-blue">{r.student?.full_name?.charAt(0) || 'U'}</div>{r.student?.full_name || '-'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{period(r)}</td>
                  <td style={{ padding: '12px 16px' }}>{fmt(r.sent_at?.slice(0, 10) || r.reviewed_at?.slice(0, 10) || null)}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span className="link" style={{ fontSize: 12 }} onClick={() => setPreviewing(r)}><IconEye size={12} style={{ verticalAlign: 'middle' }} /> 预览</span>
                    {' · '}<span className="link" style={{ fontSize: 12 }} onClick={() => exportReportDoc(r)}><IconFileDownload size={12} style={{ verticalAlign: 'middle' }} /> Word</span>
                  </td>
                </tr>
              ))}
              {archives.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--color-text-tertiary)' }}>无历史报告存档</td></tr>}
            </tbody>
          </table>
          <div style={{ padding: '0 16px' }}><Pagination page={archivesPage.page} totalPages={archivesPage.totalPages} total={archivesPage.total} pageSize={PAGE_SIZE} onPage={archivesPage.setPage} /></div>
        </div>
      </div>

      {/* 生成弹窗 */}
      <Modal title="生成报告" open={genOpen} onCancel={() => setGenOpen(false)} onOk={doGenerate}
        okText={generating ? '生成中…' : '生成'} confirmLoading={generating}>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">报告类型</label>
            <Select style={{ width: '100%' }} value={genType} onChange={onPickType}
              options={[{ label: '出勤报告（两周）', value: 'biweekly' }, { label: '学术报告（月）', value: 'monthly' }]} />
          </div>
          <div>
            <label className="form-label">学生</label>
            <StudentSelect allowClear style={{ width: '100%' }} value={genStudent} onChange={setGenStudent}
              placeholder="默认全体在读学生（可选单个）" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}><label className="form-label">周期开始</label><input type="date" className="input" style={{ width: '100%' }} value={genStart} onChange={e => setGenStart(e.target.value)} /></div>
            <div style={{ flex: 1 }}><label className="form-label">周期结束</label><input type="date" className="input" style={{ width: '100%' }} value={genEnd} onChange={e => setGenEnd(e.target.value)} /></div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            {genStudent ? '为所选学生' : '为全体在读学生'}生成{genType === 'monthly' ? '学术月报（各科加权总评/节点/辅导反馈）' : '出勤双周报（官方+内部出勤率/违规）'}草稿，自动预填可得数据 + 预警提示，其余待补。同周期已生成的会跳过。
          </div>
        </div>
      </Modal>

      {editing && (
        <ReportEditor report={editing} onCancel={() => setEditing(null)}
          onSave={async (patch) => { await updateReport(editing.id, patch); setEditing(null); }} />
      )}
      {previewing && <ReportPreview report={previewing} onClose={() => setPreviewing(null)} />}
    </div>
  );
}
