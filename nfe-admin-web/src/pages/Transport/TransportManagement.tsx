import { useState } from 'react';
import { IconRoute, IconPlus, IconCar } from '@tabler/icons-react';

// Transport page with static mock data based on prototype
// (transport_routes/passengers tables are empty — Phase 3 will add real data seeding)

interface Passenger {
  name: string;
  avatar: string;
  avatarColor: string;
  pickupTime: string;
  dropoff: string;
  status: 'delivered' | 'picked_up' | 'absent' | 'on_leave' | 'pending';
}

interface Route {
  id: string;
  label: string;
  from: string;
  to: string;
  driver: string;
  departureTime: string;
  passengers: Passenger[];
}

const statusMap: Record<string, { label: string; cls: string }> = {
  delivered:  { label: '已送达', cls: 'p-green' },
  picked_up:  { label: '已接到', cls: 'p-blue' },
  absent:     { label: '未出现', cls: 'p-red' },
  on_leave:   { label: '请假', cls: 'p-gray' },
  pending:    { label: '待确认', cls: 'p-amber' },
};

const mockRoutes: Route[] = [
  {
    id: 'A',
    label: '路线 A',
    from: '4 Tiverton Road',
    to: 'Avondale College',
    driver: '陈老师',
    departureTime: '07:45',
    passengers: [
      { name: '张晓明', avatar: '张', avatarColor: 'av-blue', pickupTime: '07:45', dropoff: 'Avondale College 正门', status: 'absent' },
      { name: '王明宇', avatar: '王', avatarColor: 'av-green', pickupTime: '07:45', dropoff: 'Avondale College 正门', status: 'delivered' },
      { name: '孙欢',   avatar: '孙', avatarColor: 'av-amber', pickupTime: '07:45', dropoff: 'Avondale College 正门', status: 'delivered' },
    ],
  },
  {
    id: 'B',
    label: '路线 B',
    from: '4 Tiverton Road',
    to: 'MAGS',
    driver: '陈老师',
    departureTime: '08:10',
    passengers: [
      { name: '林思远', avatar: '林', avatarColor: 'av-pink',  pickupTime: '08:10', dropoff: 'MAGS 正门', status: 'delivered' },
      { name: '李雨晴', avatar: '李', avatarColor: 'av-amber', pickupTime: '08:10', dropoff: 'MAGS 正门', status: 'on_leave' },
    ],
  },
  {
    id: 'C',
    label: '路线 C',
    from: '4 Tiverton Road',
    to: 'Western Springs',
    driver: '陈老师',
    departureTime: '08:30',
    passengers: [
      { name: '周欣怡', avatar: '周', avatarColor: 'av-teal',  pickupTime: '08:30', dropoff: 'Western Springs 侧门', status: 'picked_up' },
      { name: '陈佳琳', avatar: '陈', avatarColor: 'av-teal',  pickupTime: '08:30', dropoff: 'Western Springs 侧门', status: 'picked_up' },
      { name: '刘海涛', avatar: '刘', avatarColor: 'av-amber', pickupTime: '08:30', dropoff: 'Western Springs 正门', status: 'picked_up' },
    ],
  },
];

export default function TransportManagement() {
  const [routes] = useState<Route[]>(mockRoutes);
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const totalPassengers = routes.reduce((sum, r) => sum + r.passengers.length, 0);
  const absentCount = routes.reduce((sum, r) => sum + r.passengers.filter((p) => p.status === 'absent').length, 0);

  return (
    <>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pill p-blue">今日 {today}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            共{routes.length}条路线 · {totalPassengers}名学生
            {absentCount > 0 && <span style={{ marginLeft: 8, color: 'var(--color-danger)' }}> · ⚠️ {absentCount}名未出现</span>}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            系统根据课表自动生成 · 接送老师在手机端标记状态
          </span>
          <button className="btn btn-primary"><IconPlus size={14} style={{ marginRight: 4 }} />新建路线</button>
        </div>
      </div>

      {/* Route cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {routes.map((route) => (
          <div key={route.id} className="card">
            <div className="card-title">
              <IconRoute size={16} style={{ color: 'var(--color-primary)' }} />
              {route.label} — {route.from} → {route.to}
              <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconCar size={14} />
                负责：{route.driver} · {route.departureTime} 出发
              </div>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>学生</th>
                  <th>上车时间</th>
                  <th>下车地点</th>
                  <th>接送状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {route.passengers.map((p) => {
                  const statusInfo = statusMap[p.status];
                  return (
                    <tr key={p.name}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className={`avatar-xs ${p.avatarColor}`}>{p.avatar}</div>
                          {p.name}
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{p.pickupTime}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{p.dropoff}</td>
                      <td><span className={`pill ${statusInfo.cls}`}>{statusInfo.label}</span></td>
                      <td>
                        {p.status === 'absent' && (
                          <span className="link" style={{ color: 'var(--color-danger)', fontSize: 12 }}>标记异常</span>
                        )}
                        {p.status === 'pending' && (
                          <span className="link" style={{ fontSize: 12 }}>确认送达</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  );
}
