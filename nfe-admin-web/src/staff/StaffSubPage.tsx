import { useParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { STAFF_ROLES } from './staffConfig';
import StaffStub from './StaffStub';
import { PatrolStudents, PatrolRollcall, PatrolHomework, PatrolViolations } from './pages/patrol';
import { TutorStudents, TutorSchedule, TutorRecords } from './pages/tutor';
import { LifeMorning } from './pages/life';
import { StaffLibrary } from './pages/common';
// 学管：复用 admin 已有的功能页（真功能）
import StudentList from '../pages/Students/StudentList';
import AcademicTrack from '../pages/Academic/AcademicTrack';
import Documents from '../pages/Documents/Documents';
import Communications from '../pages/Communications/Communications';
import RiskAlerts from '../pages/Risk/RiskAlerts';
import ReportsPage from '../pages/Reports/ReportsPage';
import ResourcesPage from '../pages/Resources/ResourcesPage';

// 注册表：`${role}/${sub}` → 详情页组件。未注册的回落到占位。
const REGISTRY: Record<string, ReactNode> = {
  // 巡查（静态壳）
  'patrol/students': <PatrolStudents />,
  'patrol/rollcall': <PatrolRollcall />,
  'patrol/homework': <PatrolHomework />,
  'patrol/violations': <PatrolViolations />,
  'patrol/library': <StaffLibrary />,
  // 辅导（静态壳）
  'tutor/students': <TutorStudents />,
  'tutor/schedule': <TutorSchedule />,
  'tutor/records': <TutorRecords />,
  'tutor/library': <StaffLibrary />,
  // 生活（早上出勤已接真功能）
  'life/morning': <LifeMorning />,
  'life/library': <StaffLibrary />,
  // 学管（真功能：复用 admin 功能页）
  'academic/students': <StudentList />,
  'academic/academic': <AcademicTrack />,
  'academic/docs': <Documents />,
  'academic/comms': <Communications />,
  'academic/risk': <RiskAlerts />,
  'academic/reports': <ReportsPage />,
  'academic/library': <ResourcesPage />,
};

export default function StaffSubPage() {
  const { role = 'patrol', sub = '' } = useParams();
  const hit = REGISTRY[`${role}/${sub}`];
  if (hit) return <>{hit}</>;
  const cfg = STAFF_ROLES[role] || STAFF_ROLES.patrol;
  const item = cfg.nav.find(n => n.to === sub);
  return <StaffStub title={item?.label || '页面'} desc={item?.desc || '功能开发中'} />;
}
