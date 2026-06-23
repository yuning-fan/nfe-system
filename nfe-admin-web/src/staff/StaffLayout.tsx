import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
  IconLayoutDashboard, IconUsers, IconClipboardCheck, IconNotebook,
  IconAlertOctagon, IconDatabase, IconLogout,
} from '@tabler/icons-react';

// 巡查老师工作台 —— 静态壳（按 staff 原型）。角色门禁后续再加。
const NAV = [
  { to: '/staff', label: '我的工作台', icon: <IconLayoutDashboard stroke={1.5} />, end: true },
  { to: '/staff/students', label: '我的学生', icon: <IconUsers stroke={1.5} /> },
  { to: '/staff/rollcall', label: '晚自习点名', icon: <IconClipboardCheck stroke={1.5} /> },
  { to: '/staff/homework', label: '作业核查', icon: <IconNotebook stroke={1.5} /> },
  { to: '/staff/violations', label: '违规记录', icon: <IconAlertOctagon stroke={1.5} /> },
  { to: '/staff/library', label: '资料库', icon: <IconDatabase stroke={1.5} /> },
];

const TITLES: Record<string, { title: string; sub: string }> = {
  '/staff': { title: '我的工作台', sub: '巡查视角 · 今日任务' },
  '/staff/students': { title: '我的学生', sub: '名下学生' },
  '/staff/rollcall': { title: '晚自习点名', sub: '18:00 · 记录出勤' },
  '/staff/homework': { title: '作业核查', sub: '作业批改与成绩监控' },
  '/staff/violations': { title: '违规记录', sub: '违规登记 · 警告信申请' },
  '/staff/library': { title: '资料库', sub: '授权可见资料' },
};

export default function StaffLayout() {
  const { profile, signOut } = useAuthStore();
  const location = useLocation();
  const t = TITLES[location.pathname] || { title: 'NFE 工作台', sub: '巡查视角' };
  const userName = profile?.full_name || '巡查老师';
  const avatarChar = userName.charAt(0).toUpperCase();

  return (
    <div className="app">
      <div className="sidebar">
        <div className="logo">
          <div className="logo-name">NFE 工作台</div>
          <div className="logo-role">巡查视角</div>
        </div>
        <div className="nav-scroll">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {n.icon}{n.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <h1>{t.title}</h1>
            <p>{t.sub}</p>
          </div>
          <div className="topbar-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{userName}</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>巡查老师</span>
              </div>
              <div className="avatar-sm">{avatarChar}</div>
              <div className="icon-btn" onClick={signOut} title="退出登录" style={{ marginLeft: 4, color: 'var(--color-danger)' }}>
                <IconLogout stroke={1.5} />
              </div>
            </div>
          </div>
        </div>

        <div className="page active" style={{ display: 'block', overflowY: 'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
