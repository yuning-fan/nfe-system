import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

import Dashboard from './pages/Dashboard/Dashboard';
import StudentList from './pages/Students/StudentList';
import HousingManagement from './pages/Housing/HousingManagement';
import TransportManagement from './pages/Transport/TransportManagement';
import AcademicTrack from './pages/Academic/AcademicTrack';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* 默认子路由，指向首页驾驶舱 */}
        <Route index element={<Dashboard />} />
        
        {/* 其他核心页面 */}
        <Route path="students" element={<StudentList />} />
        <Route path="housing" element={<HousingManagement />} />
        <Route path="transport" element={<TransportManagement />} />
        <Route path="academic" element={<AcademicTrack />} />

        {/* 404 跳转兜底 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
