import { useParams } from 'react-router-dom';
import { STAFF_ROLES } from './staffConfig';
import StaffStub from './StaffStub';

// 按 /staff/:role/:sub 解析对应导航项，渲染静态占位页
export default function StaffSubPage() {
  const { role = 'patrol', sub = '' } = useParams();
  const cfg = STAFF_ROLES[role] || STAFF_ROLES.patrol;
  const item = cfg.nav.find(n => n.to === sub);
  return <StaffStub title={item?.label || '页面'} desc={item?.desc || '功能开发中'} />;
}
