import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import StudentList from './pages/Students/StudentList';
import { StudentDetail } from './pages/Students';
import HousingManagement from './pages/Housing/HousingManagement';
import DormCheck from './pages/DormCheck/DormCheck';
import TransportManagement from './pages/Transport/TransportManagement';
import AcademicTrack from './pages/Academic/AcademicTrack';
import { WeeklyBoard } from './staff/pages/weeklyBoard';
import RiskAlerts from './pages/Risk/RiskAlerts';
import Communications from './pages/Communications/Communications';
import Documents from './pages/Documents/Documents';
import Finance from './pages/Finance/Finance';
import { Notices, UniApplication } from './pages/Placeholders';
import SystemLogs from './pages/Logs/SystemLogs';
import Activities from './pages/Activities/Activities';
import SettingsPage from './pages/Settings/SystemSettings';
import Accounts from './pages/Accounts/Accounts';
import ResourcesPage from './pages/Resources/ResourcesPage';
import ReportsPage from './pages/Reports/ReportsPage';
import Login from './pages/Auth/Login';
import StaffLayout from './staff/StaffLayout';
import StaffHome from './staff/StaffHome';
import StaffSubPage from './staff/StaffSubPage';
import RequireAuth from './components/RequireAuth';
import { useAuthStore } from './store/useAuthStore';
import { setRecomputeFailureHandler } from './lib/riskEngine';
import { message } from 'antd';

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // 风险分重算失败时提示用户（10s 节流，批量重算失败只提示一次）
  useEffect(() => {
    let lastWarnAt = 0;
    setRecomputeFailureHandler(() => {
      const now = Date.now();
      if (now - lastWarnAt < 10000) return;
      lastWarnAt = now;
      message.warning('风险分自动重算失败，本次录入已保存；请稍后到「风险预警」页一键重算全员');
    });
    return () => setRecomputeFailureHandler(null);
  }, []);

  return (
    <Routes>
      {/* 登录页面 */}
      <Route path="/login" element={<Login />} />

      {/* 员工端工作台（4 角色：patrol/life/tutor/academic）。角色门禁在 StaffLayout 内校验 */}
      <Route path="/staff" element={<Navigate to="/staff/patrol" replace />} />
      <Route path="/staff/:role" element={<RequireAuth><StaffLayout /></RequireAuth>}>
        <Route index element={<StaffHome />} />
        <Route path="student/:id" element={<StudentDetail />} />
        <Route path=":sub" element={<StaffSubPage />} />
      </Route>

      {/* 受保护的后台路由 */}
      <Route path="/" element={<RequireAuth console><MainLayout /></RequireAuth>}>
        {/* 默认子路由，指向首页驾驶舱 */}
        <Route index element={<Dashboard />} />
        
        {/* 其他核心页面 */}
        <Route path="students" element={<StudentList />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="housing" element={<HousingManagement />} />
        <Route path="dorm-check" element={<DormCheck />} />
        <Route path="transport" element={<TransportManagement />} />
        <Route path="academic" element={<AcademicTrack />} />
        <Route path="weekly" element={<WeeklyBoard />} />
        <Route path="risk" element={<RiskAlerts />} />
        <Route path="comms" element={<Communications />} />
        <Route path="docs" element={<Documents />} />
        <Route path="finance" element={<Finance />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="notices" element={<Notices />} />
        <Route path="uni-app" element={<UniApplication />} />
        <Route path="activities" element={<Activities />} />
        <Route path="library" element={<ResourcesPage />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="logs" element={<SystemLogs />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* 404 跳转兜底 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
