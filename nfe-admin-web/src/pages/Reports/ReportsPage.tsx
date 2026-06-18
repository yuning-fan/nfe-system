import { useEffect, useState } from 'react';
import { useReportStore } from '../../store/useReportStore';
import { IconReport } from '@tabler/icons-react';
import { message } from 'antd';
import { getDownloadUrl } from '../../lib/r2';
import FileUploadButton from '../../components/common/FileUploadButton';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/common/Pagination';

export default function ReportsPage() {
  const { reports, fetchReports, publishReport, generateBiweeklyReports, attachPdf, isLoading } = useReportStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const viewPdf = async (key: string | null) => {
    if (!key) { message.info('该报告尚未上传 PDF'); return; }
    try {
      const url = await getDownloadUrl('reports', key);
      window.open(url, '_blank');
    } catch (e: any) {
      message.error(e.message || '获取PDF失败');
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Get report period (mocked as 14 days before generation)
  const getPeriod = (dateString: string) => {
    const d = new Date(dateString);
    const past = new Date(d);
    past.setDate(past.getDate() - 14);
    return `${formatDate(past.toISOString())} 至 ${formatDate(dateString)}`;
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = (r.student?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' 
                          ? true 
                          : statusFilter === 'draft' ? r.status === 'draft' : r.status === 'sent';
    return matchesSearch && matchesStatus;
  });

  const drafts = filteredReports.filter(r => r.status === 'draft');
  const archives = filteredReports.filter(r => r.status === 'sent');
  const PAGE_SIZE = 20;
  const draftsPage = usePagination(drafts, PAGE_SIZE);
  const archivesPage = usePagination(archives, PAGE_SIZE);

  return (
    <div className="page active">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input 
            className="search-bar" 
            placeholder="搜索学生…" 
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); draftsPage.reset(); archivesPage.reset(); }}
          />
          <select className="sel" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); draftsPage.reset(); archivesPage.reset(); }}>
            <option value="all">全部状态</option>
            <option value="draft">待审核</option>
            <option value="sent">已发布</option>
          </select>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={generateBiweeklyReports}
          disabled={isLoading}
        >
          <IconReport size={16} style={{ marginRight: 6 }} /> 批量生成双周报告
        </button>
      </div>

      <div className="g2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 13, fontWeight: 500 }}>
            待审核报告 <span className="pill p-amber" style={{ marginLeft: 6 }}>{drafts.length}条</span>
          </div>
          <table className="tbl" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>学生</th>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>报告周期</th>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>生成时间</th>
                <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {draftsPage.paged.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar-xs av-pink">{r.student?.full_name?.charAt(0) || 'U'}</div>
                      {r.student?.full_name || '-'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getPeriod(r.generated_at)}</td>
                  <td style={{ padding: '12px 16px' }}>{formatDate(r.generated_at)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '4px 8px', fontSize: 11, minHeight: 0 }}
                        onClick={() => publishReport(r.id)}
                      >
                        审核发布
                      </button>
                      {r.pdf_url ? (
                        <button className="btn" style={{ padding: '4px 8px', fontSize: 11, minHeight: 0 }} onClick={() => viewPdf(r.pdf_url)}>预览</button>
                      ) : (
                        <FileUploadButton
                          bucket="reports"
                          prefix={`${r.student_id}`}
                          accept=".pdf"
                          label="上传PDF"
                          className=""
                          onUploaded={async ({ key }) => { await attachPdf(r.id, key); }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {drafts.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-tertiary)' }}>无待审核报告</td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ padding: '0 16px' }}>
            <Pagination page={draftsPage.page} totalPages={draftsPage.totalPages} total={draftsPage.total} pageSize={PAGE_SIZE} onPage={draftsPage.setPage} />
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 13, fontWeight: 500 }}>
            历史报告存档
          </div>
          <table className="tbl" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
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
                      <div className="avatar-xs av-blue">{r.student?.full_name?.charAt(0) || 'U'}</div>
                      {r.student?.full_name || '-'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getPeriod(r.generated_at)}</td>
                  <td style={{ padding: '12px 16px' }}>{formatDate(r.reviewed_at || r.generated_at)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className="link" style={{ fontSize: 12 }} onClick={() => viewPdf(r.pdf_url)}>查看PDF</span>
                    </div>
                  </td>
                </tr>
              ))}
              {archives.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-tertiary)' }}>无历史报告存档</td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ padding: '0 16px' }}>
            <Pagination page={archivesPage.page} totalPages={archivesPage.totalPages} total={archivesPage.total} pageSize={PAGE_SIZE} onPage={archivesPage.setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
