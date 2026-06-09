import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

import Dashboard from './pages/Dashboard/Dashboard';

// Placeholder Pages
const Students = () => <div style={{ padding: 20 }}>学生管理页面（开发中...）</div>;
const Housing = () => <div style={{ padding: 20 }}>住宿管理页面（开发中...）</div>;
const Transport = () => <div style={{ padding: 20 }}>接送管理页面（开发中...）</div>;
const Academic = () => <div style={{ padding: 20 }}>学业跟进页面（开发中...）</div>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* 默认子路由，指向首页驾驶舱 */}
        <Route index element={<Dashboard />} />
        
        {/* 其他核心页面 */}
        <Route path="students" element={<Students />} />
        <Route path="housing" element={<Housing />} />
        <Route path="transport" element={<Transport />} />
        <Route path="academic" element={<Academic />} />

        {/* 404 跳转兜底 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
