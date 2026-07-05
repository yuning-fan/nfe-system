import { useParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { STAFF_ROLES } from './staffConfig';
import StaffStub from './StaffStub';
import { PatrolStudents, PatrolRollcall } from './pages/patrol';
import { AttendanceRateEntry } from './pages/attendanceRate';
import { StudyFollowUps } from './pages/followUps';
import { TutorFeedbackView } from './pages/tutorFeedback';
import { TutorStudents, TutorSchedule, TutorRecords } from './pages/tutor';
import { LifeMorning } from './pages/life';
import { SchoolWarnings } from './pages/schoolWarnings';
import { WarningLetterGen } from './pages/warningLetterGen';
import { StaffLibrary } from './pages/common';
// 学管：复用 admin 已有的功能页（真功能）
import StudentList from '../pages/Students/StudentList';
import AcademicTrack from '../pages/Academic/AcademicTrack';
import CourseManagement from '../pages/Academic/CourseManagement';
import Documents from '../pages/Documents/Documents';
import Communications from '../pages/Communications/Communications';
import ViolationLog from '../pages/Risk/ViolationLog';
import RiskAlerts from '../pages/Risk/RiskAlerts';
import ReportsPage from '../pages/Reports/ReportsPage';
import ResourcesPage from '../pages/Resources/ResourcesPage';

// 注册表：`${role}/${sub}` → 详情页组件。未注册的回落到占位。
const REGISTRY: Record<string, ReactNode> = {
  // 巡查（静态壳）
  'patrol/students': <PatrolStudents />,
  'patrol/rollcall': <PatrolRollcall />,
  'patrol/attendance-rate': <AttendanceRateEntry />,
  'patrol/follow-ups': <StudyFollowUps />,
  'patrol/tutor-feedback': <TutorFeedbackView />,
  'patrol/violations': <ViolationLog />,
  'patrol/library': <ResourcesPage />,
  // 辅导（静态壳）
  'tutor/students': <TutorStudents />,
  'tutor/schedule': <TutorSchedule />,
  'tutor/records': <TutorRecords />,
  'tutor/follow-ups': <StudyFollowUps />,
  'tutor/library': <ResourcesPage />,
  // 生活（早上出勤已接真功能）
  'life/morning': <LifeMorning />,
  'life/library': <StaffLibrary />,
  // 学管（真功能：复用 admin 功能页）
  'academic/students': <StudentList />,
  'academic/academic': <AcademicTrack />,
  'academic/courses': <CourseManagement />,
  'academic/docs': <Documents />,
  'academic/comms': <Communications />,
  'academic/violations': <ViolationLog />,
  'academic/risk': <RiskAlerts />,
  'academic/school-warnings': <SchoolWarnings />,
  'academic/warning-gen': <WarningLetterGen />,
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
