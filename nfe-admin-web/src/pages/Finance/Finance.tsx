import { useState } from 'react';
import { IconDownload, IconRefresh, IconCurrencyDollar } from '@tabler/icons-react';

// Finance page — static mock data (no dedicated payments table in current schema)
// Real data integration can be added in Phase 4 when a payments table is created.

type PayStatus = 'paid' | 'partial' | 'unpaid';

interface Bill {
  student: string;
  items: string;
  due: number;
  paid: number;
  status: PayStatus;
}

interface Adjustment {
  student: string;
  type: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

const BILLS: Bill[] = [
  { student: '占小诺', items: '学费 + 住宿费', due: 3200, paid: 3200, status: 'paid' },
  { student: '吴奕辉', items: '学费 + 辅导费', due: 2800, paid: 2000, status: 'partial' },
  { student: '郑王景怡', items: '学费', due: 1800, paid: 0, status: 'unpaid' },
  { student: '王涵禹', items: '住宿费', due: 1200, paid: 1200, status: 'paid' },
  { student: '陈祺', items: '学费 + 辅导费', due: 2400, paid: 2400, status: 'paid' },
  { student: '杨菡睿', items: '学费', due: 2200, paid: 1800, status: 'partial' },
  { student: '李锐', items: '学费 + 住宿费', due: 3200, paid: 3200, status: 'paid' },
  { student: '林士剀', items: '学费', due: 2000, paid: 0, status: 'unpaid' },
];

const ADJUSTMENTS: Adjustment[] = [
  {
    student: '吴奕辉', type: '课时调整',
    description: '学生因病缺席2次辅导课，申请补回4课时',
    submittedBy: '王老师', submittedAt: '2026-06-04',
    status: 'pending',
  },
];

const HISTORY_ADJUSTMENTS: Adjustment[] = [
  {
    student: '占小诺', type: '退费',
    description: '退还2月住宿费 $800',
    submittedBy: '陈老师', submittedAt: '2026-05-20',
    status: 'approved',
  },
];

const statusMap: Record<PayStatus, { label: string; cls: string }> = {
  paid:    { label: '已结清', cls: 'p-green' },
  partial: { label: '部分付款', cls: 'p-amber' },
  unpaid:  { label: '未付款', cls: 'p-red' },
};

const adjStatusMap: Record<string, { label: string; cls: string }> = {
  pending:  { label: '待审批', cls: 'p-amber' },
  approved: { label: '已通过', cls: 'p-green' },
  rejected: { label: '已驳回', cls: 'p-red' },
};

export default function Finance() {
  const [bills] = useState<Bill[]>(BILLS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | PayStatus>('');

  const totalDue    = bills.reduce((s, b) => s + b.due, 0);
  const totalPaid   = bills.reduce((s, b) => s + b.paid, 0);
  const totalOwing  = totalDue - totalPaid;
  const overdueCount = bills.filter((b) => b.status !== 'paid').length;

  const filteredBills = bills.filter((b) => {
    const matchSearch = !search || b.student.includes(search);
    const matchStatus = !filterStatus || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <>
      {/* Stats */}
      <div className="g4" style={{ marginBottom: 14 }}>
        <div className="stat-card">
          <div className="stat-label">本期应收</div>
          <div className="stat-val">${totalDue.toLocaleString()}</div>
          <div className="stat-sub">{bills.length} 名学生</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">本期已收</div>
          <div className="stat-val" style={{ color: 'var(--color-success)' }}>${totalPaid.toLocaleString()}</div>
          <div className="stat-sub">已结清 {bills.filter((b) => b.status === 'paid').length} 人</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">待收款</div>
          <div className="stat-val" style={{ color: '#854F0B' }}>${totalOwing.toLocaleString()}</div>
          <div className="stat-sub">{overdueCount} 名学生未完成</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">待审批调整</div>
          <div className="stat-val" style={{ color: '#185FA5' }}>{ADJUSTMENTS.length}</div>
          <div className="stat-sub">退费 / 课时申请</div>
        </div>
      </div>

      <div className="g2" style={{ alignItems: 'start' }}>
        {/* Bills table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--color-border-tertiary)', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                className="search-bar"
                placeholder="搜索学生…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ maxWidth: 160 }}
              />
              <select className="sel" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                <option value="">全部状态</option>
                <option value="paid">已结清</option>
                <option value="partial">部分付款</option>
                <option value="unpaid">未付款</option>
              </select>
            </div>
            <button className="btn" style={{ padding: '4px 10px', whiteSpace: 'nowrap' }}>
              <IconDownload size={14} style={{ marginRight: 4 }} />导出
            </button>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>学生</th>
                <th>费用项目</th>
                <th>应付</th>
                <th>已付</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((b) => {
                const st = statusMap[b.status];
                return (
                  <tr key={b.student}>
                    <td style={{ fontWeight: 500 }}>{b.student}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{b.items}</td>
                    <td>${b.due.toLocaleString()}</td>
                    <td style={{ color: b.paid === b.due ? 'var(--color-success)' : b.paid === 0 ? 'var(--color-danger)' : '#854F0B' }}>
                      ${b.paid.toLocaleString()}
                    </td>
                    <td><span className={`pill ${st.cls}`}>{st.label}</span></td>
                    <td>
                      {b.status !== 'paid' ? (
                        <span className="link" style={{ fontSize: 12 }}>确认收款</span>
                      ) : (
                        <span className="link" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>详情</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Adjustments panel */}
        <div className="card">
          <div className="card-title">
            <IconRefresh size={16} />退费 / 调整审批
            {ADJUSTMENTS.length > 0 && (
              <span className="pill p-amber" style={{ marginLeft: 'auto' }}>{ADJUSTMENTS.length} 条待处理</span>
            )}
          </div>

          {/* Pending adjustments */}
          {ADJUSTMENTS.map((adj, i) => (
            <div key={i} style={{
              background: 'var(--color-bg-secondary)', borderRadius: 8,
              padding: 12, marginBottom: 12, border: '1px solid var(--color-border-tertiary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 500 }}>{adj.student}</span>
                <span className="pill p-blue">{adj.type}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                申请人：{adj.submittedBy} · {adj.submittedAt}
              </div>
              <div style={{ fontSize: 12, marginBottom: 8 }}>{adj.description}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1 }}>通过</button>
                <button className="btn" style={{ flex: 1, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>驳回</button>
              </div>
            </div>
          ))}

          {/* History */}
          {HISTORY_ADJUSTMENTS.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4, marginBottom: 8 }}>
                <IconCurrencyDollar size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />历史调整记录（本期）
              </div>
              {HISTORY_ADJUSTMENTS.map((adj, i) => {
                const st = adjStatusMap[adj.status];
                return (
                  <div key={i} className="risk-row" style={{ borderBottom: 'none' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, marginBottom: 2 }}>{adj.student} · {adj.type}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{adj.description} · 已通过</div>
                    </div>
                    <span className={`pill ${st.cls}`}>{st.label}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}
