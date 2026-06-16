import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  IconLayoutDashboard, 
  IconUsers, 
  IconBuilding, 
  IconCar, 
  IconBook, 
  IconSchool, 
  IconCertificate, 
  IconMessage2, 
  IconAlertTriangle, 
  IconCurrencyDollar, 
  IconReport, 
  IconSpeakerphone, 
  IconConfetti, 
  IconDatabase, 
  IconUserCog, 
  IconListDetails, 
  IconSettings,
  IconBell,
  IconSearch,
  IconLogout,
  IconMoonStars
} from '@tabler/icons-react';
import { useAuthStore } from '../store/useAuthStore';

// 页面标题映射，根据当前路由动态显示标题
const pageTitles: Record<string, { title: string; sub: string }> = {
  '/': { title: '首页驾驶舱', sub: '2026年6月5日 星期五' },
  '/students': { title: '学生管理', sub: '共24名在读学生' },
  '/housing': { title: '住宿管理', sub: '4 Tiverton Road' },
  '/dorm-check': { title: '查寝管理', sub: '夜间住宿清点' },
  '/transport': { title: '接送管理', sub: '今日 · 3条路线' },
  '/academic': { title: '学业跟进', sub: '课表 · 排课 · 成绩' },
};

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuthStore();
  
  // 对于动态路由如 /students/:id，退回使用默认标题或根据 ID 判断
  const currentTitle = pageTitles[location.pathname] || { title: 'NFE 管理系统', sub: '当前视图' };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userRoleStr = profile?.role === 'admin' ? '系统管理员' : profile?.role || '教职工';
  const userNameStr = profile?.full_name || '未命名用户';
  const avatarChar = userNameStr.charAt(0).toUpperCase();

  return (
    <div className="app">
      {/* 侧边栏 */}
      <div className="sidebar">
        <div className="logo">
          <div className="logo-name">NFE 管理系统</div>
          <div className="logo-role">{userRoleStr} · 全局视图</div>
        </div>
        <div className="nav-scroll">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconLayoutDashboard stroke={1.5} />首页驾驶舱
          </NavLink>
          <NavLink to="/students" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconUsers stroke={1.5} />学生管理
          </NavLink>
          <NavLink to="/housing" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconBuilding stroke={1.5} />住宿管理
          </NavLink>
          <NavLink to="/dorm-check" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconMoonStars stroke={1.5} />查寝打卡
          </NavLink>
          <NavLink to="/transport" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconCar stroke={1.5} />接送管理
          </NavLink>
          <NavLink to="/academic" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconBook stroke={1.5} />学业跟进
          </NavLink>
          
          <NavLink to="/uni-app" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconSchool stroke={1.5} />升学规划
          </NavLink>
          <NavLink to="/docs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconCertificate stroke={1.5} />签证/保险/文件
          </NavLink>
          <NavLink to="/comms" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconMessage2 stroke={1.5} />家校沟通
          </NavLink>
          <NavLink to="/risk" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconAlertTriangle stroke={1.5} />风险预警
          </NavLink>
          <NavLink to="/finance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconCurrencyDollar stroke={1.5} />财务/付款
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconReport stroke={1.5} />报告生成
          </NavLink>
          <NavLink to="/notices" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconSpeakerphone stroke={1.5} />通知管理
          </NavLink>
          <NavLink to="/activities" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconConfetti stroke={1.5} />NFE活动管理
          </NavLink>
          <NavLink to="/library" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <IconDatabase stroke={1.5} />资料库
          </NavLink>
          
          {profile?.role === 'admin' && (
            <>
              <div className="nav-section">系统管理</div>
              <NavLink to="/accounts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <IconUserCog stroke={1.5} />员工账号管理
              </NavLink>
              <NavLink to="/logs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <IconListDetails stroke={1.5} />系统操作日志
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <IconSettings stroke={1.5} />系统配置
              </NavLink>
            </>
          )}
        </div>
      </div>

      {/* 主体区域 */}
      <div className="main">
        {/* 顶部栏 */}
        <div className="topbar">
          <div className="topbar-left">
            <h1 id="page-title">{currentTitle.title}</h1>
            <p id="page-sub">{currentTitle.sub}</p>
          </div>
          <div className="topbar-right">
            <div className="icon-btn">
              <IconBell stroke={1.5} />
              <div className="notif-badge">5</div>
            </div>
            <div className="icon-btn">
              <IconSearch stroke={1.5} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '10px', paddingLeft: '16px', borderLeft: '1px solid var(--color-border-tertiary)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{userNameStr}</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{userRoleStr}</span>
              </div>
              <div className="avatar-sm">{avatarChar}</div>
              
              <div className="icon-btn" onClick={handleSignOut} title="退出登录" style={{ marginLeft: 4, color: 'var(--color-danger)' }}>
                <IconLogout stroke={1.5} />
              </div>
            </div>
          </div>
        </div>

        {/* 动态内容区 */}
        <div className="page active" style={{ display: 'block', overflowY: 'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
