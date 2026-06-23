import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { IconLogout } from '@tabler/icons-react';
import { STAFF_ROLES } from './staffConfig';

// 员工端工作台布局 —— 按 URL 角色（/staff/:role）渲染对应侧栏（静态壳）
export default function StaffLayout() {
  const { role = 'patrol' } = useParams();
  const cfg = STAFF_ROLES[role] || STAFF_ROLES.patrol;
  const { profile, signOut } = useAuthStore();
  const userName = profile?.full_name || '教职工';
  const avatarChar = userName.charAt(0).toUpperCase();
  const base = `/staff/${role}`;

  return (
    <div className="app">
      <div className="sidebar">
        <div className="logo">
          <div className="logo-name">NFE 工作台</div>
          <div className="logo-role">{cfg.label}</div>
        </div>
        <div className="nav-scroll">
          {cfg.nav.map(n => (
            <NavLink key={n.to} to={n.to ? `${base}/${n.to}` : base} end={!n.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {n.icon}{n.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <h1>NFE 工作台</h1>
            <p>{cfg.label}</p>
          </div>
          <div className="topbar-right">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{userName}</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{cfg.label}</span>
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
