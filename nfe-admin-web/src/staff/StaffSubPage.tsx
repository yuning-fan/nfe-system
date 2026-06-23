import { useParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { STAFF_ROLES } from './staffConfig';
import StaffStub from './StaffStub';
import { PatrolStudents, PatrolRollcall, PatrolHomework, PatrolViolations } from './pages/patrol';
import { TutorStudents, TutorSchedule, TutorRecords } from './pages/tutor';
import { AcademicStudents, AcademicTrackPage, AcademicDocs, AcademicComms, AcademicRisk, AcademicReports } from './pages/academic';
import { StaffLibrary } from './pages/common';

// 注册表：`${role}/${sub}` → 详情页组件。未注册的回落到占位。
const REGISTRY: Record<string, ReactNode> = {
  // 巡查
  'patrol/students': <PatrolStudents />,
  'patrol/rollcall': <PatrolRollcall />,
  'patrol/homework': <PatrolHomework />,
  'patrol/violations': <PatrolViolations />,
  'patrol/library': <StaffLibrary />,
  // 辅导
  'tutor/students': <TutorStudents />,
  'tutor/schedule': <TutorSchedule />,
  'tutor/records': <TutorRecords />,
  'tutor/library': <StaffLibrary />,
  // 学管
  'academic/students': <AcademicStudents />,
  'academic/academic': <AcademicTrackPage />,
  'academic/docs': <AcademicDocs />,
  'academic/comms': <AcademicComms />,
  'academic/risk': <AcademicRisk />,
  'academic/reports': <AcademicReports />,
  'academic/library': <StaffLibrary />,
};

export default function StaffSubPage() {
  const { role = 'patrol', sub = '' } = useParams();
  const hit = REGISTRY[`${role}/${sub}`];
  if (hit) return <>{hit}</>;
  const cfg = STAFF_ROLES[role] || STAFF_ROLES.patrol;
  const item = cfg.nav.find(n => n.to === sub);
  return <StaffStub title={item?.label || '页面'} desc={item?.desc || '功能开发中'} />;
}
