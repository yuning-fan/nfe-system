import { useParams, Link } from 'react-router-dom';
import { STAFF_ROLES } from './staffConfig';
import PatrolHome from './PatrolHome';
import AcademicHome from './AcademicHome';

// 工作台首页：巡查/学管用真实聚合版，其余角色用统一静态版（待处理 + 今日日程 + 模块快捷入口）
export default function StaffHome() {
  const { role = 'patrol' } = useParams();
  if (role === 'patrol') return <PatrolHome />;
  if (role === 'academic') return <AcademicHome />;

  const cfg = STAFF_ROLES[role] || STAFF_ROLES.patrol;
  const shortcuts = cfg.nav.filter(n => n.to); // 去掉首页本身

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>
          待处理 <span className="pill p-gray" style={{ marginLeft: 6 }}>静态预览</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>
          按角色聚合待审批 / 待跟进事项（功能开发中）。
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>今日日程</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>
          今日排班、任务提醒（功能开发中）。
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>模块快捷入口</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {shortcuts.map(n => (
            <Link key={n.to} to={`/staff/${role}/${n.to}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 12px', background: 'var(--color-bg-secondary)', borderRadius: 8, color: 'inherit', textDecoration: 'none' }}>
              <span style={{ color: 'var(--color-primary)' }}>{n.icon}</span>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{n.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
