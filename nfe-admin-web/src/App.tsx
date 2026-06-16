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
import RiskAlerts from './pages/Risk/RiskAlerts';
import Communications from './pages/Communications/Communications';
import Documents from './pages/Documents/Documents';
import Finance from './pages/Finance/Finance';
import { Reports, Notices, UniApplication, Activities, Library, Accounts, SystemLogs, Settings as SettingsPage } from './pages/Placeholders';
import Login from './pages/Auth/Login';
import RequireAuth from './components/RequireAuth';
import { useAuthStore } from './store/useAuthStore';

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      {/* 登录页面 */}
      <Route path="/login" element={<Login />} />

      {/* 受保护的后台路由 */}
      <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
        {/* 默认子路由，指向首页驾驶舱 */}
        <Route index element={<Dashboard />} />
        
        {/* 其他核心页面 */}
        <Route path="students" element={<StudentList />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="housing" element={<HousingManagement />} />
        <Route path="dorm-check" element={<DormCheck />} />
        <Route path="transport" element={<TransportManagement />} />
        <Route path="academic" element={<AcademicTrack />} />
        <Route path="risk" element={<RiskAlerts />} />
        <Route path="comms" element={<Communications />} />
        <Route path="docs" element={<Documents />} />
        <Route path="finance" element={<Finance />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notices" element={<Notices />} />
        <Route path="uni-app" element={<UniApplication />} />
        <Route path="activities" element={<Activities />} />
        <Route path="library" element={<Library />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="logs" element={<SystemLogs />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* 404 跳转兜底 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
