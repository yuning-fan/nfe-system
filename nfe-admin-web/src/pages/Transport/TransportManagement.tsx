import { useEffect } from 'react';
import { IconRoute, IconPlus, IconCar, IconCheck, IconX, IconLoader2 } from '@tabler/icons-react';
import { useDailyCheckStore } from '../../store/useDailyCheckStore';
import { message, Modal } from 'antd';

const statusMap: Record<string, { label: string; cls: string }> = {
  delivered:  { label: '已送达', cls: 'p-green' },
  picked_up:  { label: '已接到', cls: 'p-blue' },
  absent:     { label: '未出现', cls: 'p-red' },
  no_show:    { label: '未出现', cls: 'p-red' },
  on_leave:   { label: '请假', cls: 'p-gray' },
  pending:    { label: '待确认', cls: 'p-amber' },
};

export default function TransportManagement() {
  const { todayPassengers, loadTodayPassengers, updatePassengerStatus, isLoading } = useDailyCheckStore();
  
  useEffect(() => {
    loadTodayPassengers();
  }, [loadTodayPassengers]);

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const absentCount = todayPassengers.filter(p => p.status === 'absent' || p.status === 'no_show').length;

  const handleStatusChange = async (id: number, status: string) => {
    await updatePassengerStatus(id, status);
  };

  const handleMarkAllPickedUp = async () => {
    Modal.confirm({
      title: '一键标记已接到',
      content: '确定将所有待确认的学生标记为"已接到"吗？',
      onOk: async () => {
        const pendingIds = todayPassengers.filter(p => p.status === 'pending').map(p => p.id);
        for (const id of pendingIds) {
          await updatePassengerStatus(id, 'picked_up');
        }
        message.success('已全部标记为已接到');
      }
    });
  };

  return (
    <>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pill p-blue">今日 {today}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            共 {todayPassengers.length} 名乘车学生
            {absentCount > 0 && <span style={{ marginLeft: 8, color: 'var(--color-danger)' }}> · ⚠️ {absentCount} 名未出现</span>}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            系统根据课表自动生成 · 接送老师在手机端标记状态
          </span>
          <button className="btn btn-primary" onClick={handleMarkAllPickedUp} disabled={isLoading}>
            <IconCheck size={14} style={{ marginRight: 4 }} />一键全部已接
          </button>
          <button className="btn"><IconPlus size={14} style={{ marginRight: 4 }} />新建路线</button>
        </div>
      </div>

      {/* Route cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card">
          <div className="card-title">
            <IconRoute size={16} style={{ color: 'var(--color-primary)' }} />
            Avondale 早上班车
            <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconCar size={14} />
              负责：王司机
            </div>
          </div>
          
          {isLoading && todayPassengers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}><IconLoader2 className="spinner" /></div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>学生</th>
                  <th>上车时间</th>
                  <th>接送地点</th>
                  <th>接送状态</th>
                  <th style={{ textAlign: 'right' }}>打卡操作</th>
                </tr>
              </thead>
              <tbody>
                {todayPassengers.map((p) => {
                  const statusInfo = statusMap[p.status] || { label: p.status, cls: 'p-gray' };
                  const name = p.students_info?.profiles?.full_name || '未知学生';
                  const avatarColor = 'av-blue'; // Simplified for now
                  const avatarChar = name.charAt(0);
                  
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className={`avatar-xs ${avatarColor}`}>{avatarChar}</div>
                          {name}
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{p.pickup_time?.slice(0,5) || '—'}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>
                        {p.pickup_location} → {p.drop_off_location}
                      </td>
                      <td><span className={`pill ${statusInfo.cls}`}>{statusInfo.label}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        {p.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleStatusChange(p.id, 'picked_up')}>
                              <IconCheck size={12} style={{ marginRight: 2 }} /> 已接到
                            </button>
                            <button className="btn" style={{ padding: '2px 8px', fontSize: 11, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => handleStatusChange(p.id, 'no_show')}>
                              <IconX size={12} style={{ marginRight: 2 }} /> 未出现
                            </button>
                          </div>
                        )}
                        {p.status !== 'pending' && (
                          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>打卡完成</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {todayPassengers.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-tertiary)' }}>今日暂无接送任务</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
