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
import ViolationLog from './pages/Risk/ViolationLog';
import Communications from './pages/Communications/Communications';
import Documents from './pages/Documents/Documents';
import Finance from './pages/Finance/Finance';
import { Notices, UniApplication, Activities, SystemLogs, Settings as SettingsPage } from './pages/Placeholders';
import Accounts from './pages/Accounts/Accounts';
import ResourcesPage from './pages/Resources/ResourcesPage';
import ReportsPage from './pages/Reports/ReportsPage';
import Login from './pages/Auth/Login';
import StaffLayout from './staff/StaffLayout';
import PatrolHome from './staff/PatrolHome';
import StaffStub from './staff/StaffStub';
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

      {/* 员工端·巡查工作台（静态壳，先复用同一 app，角色门禁后续再加） */}
      <Route path="/staff" element={<RequireAuth><StaffLayout /></RequireAuth>}>
        <Route index element={<PatrolHome />} />
        <Route path="students" element={<StaffStub title="我的学生" desc="名下学生列表（只读）：课表、出勤、成绩、补课安排" />} />
        <Route path="rollcall" element={<StaffStub title="晚自习点名" desc="18:00 应到名单，逐人标记 在场/缺席/请假 + 备注" />} />
        <Route path="homework" element={<StaffStub title="作业核查" desc="作业批改与成绩监控，批阅后存入学生档案" />} />
        <Route path="violations" element={<StaffStub title="违规记录" desc="违规登记 + 申请三步走警告信" />} />
        <Route path="library" element={<StaffStub title="资料库" desc="仅可查看被授权可见的资料" />} />
      </Route>

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
        <Route path="violations" element={<ViolationLog />} />
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
