import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import MyTodos from '../../components/common/MyTodos';
import {
  IconAlertCircle,
  IconChecklist,
  IconCar,
  IconUserOff,
  IconFileAlert,
  IconPhone,
  IconCake,
  IconUsersGroup,
  IconAlertTriangle,
  IconCertificate,
  IconLoader2,
  IconShieldCheck,
} from '@tabler/icons-react';

const db = supabase as any;

interface DashboardData {
  totalStudents: number;
  newThisMonth: number;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  redStudents: { id: string; name: string; reason: string }[];
  yellowStudents: { id: string; name: string; reason: string }[];
  expiringVisas: { name: string; days: number }[];
  todayBirthdays: { name: string; initial: string }[];
  todayTransportCount: number;
  staffList: { name: string; initial: string; role: string }[];
  pendingWarnings: number;
  absentToday: number;
  dcgOverdue: number;
  dcgOverdueNames: string[];
}

function daysUntil(dateStr: string) {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function isToday(dobStr: string) {
  const dob = new Date(dobStr);
  const now = new Date();
  return dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const ROLE_LABEL: Record<string, string> = {
  admin: '教务', manager: '学管', tutor: '辅导', life: '生活', driver: '接送', patrol: '巡查',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [
          { data: studentsInfo },
          { data: allProfiles },
          { data: visDocs },
          { data: transportRoutes },
          { data: pendingW },
          { data: absences },
        ] = await Promise.all([
          // 学生风险/生日数据来自 students_info（有档案的）
          db.from('students_info').select('student_id, risk_level, date_of_birth, school_name'),
          // 全员 profiles — 用于姓名映射 + 员工列表
          db.from('profiles').select('id, full_name, role'),
          db.from('student_documents')
            .select('student_id, expiry_date, doc_type, status')
            .eq('doc_type', 'visa')
            .neq('status', 'expired')
            .not('expiry_date', 'is', null),
          db.from('transport_routes').select('id').eq('execution_date', todayStr()),
          db.from('warning_letters').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
          db.from('daily_checks')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'absent')
            .gte('created_at', todayStr()),
        ]);

        const si = studentsInfo || [];
        const profiles = allProfiles || [];

        // 学生总数：从 profiles 里计 role='student'，比 students_info 更准确（含未填档案的学生）
        const totalStudents = profiles.filter((p: any) => p.role === 'student').length;

        // Risk distribution（只有填过档案的学生才有 risk_level）
        const red = si.filter((s: any) => s.risk_level === 'red');
        const yellow = si.filter((s: any) => s.risk_level === 'yellow');

        // 全员姓名映射
        const profileMap: Record<string, string> = {};
        profiles.forEach((p: any) => { profileMap[p.id] = p.full_name; });

        const redStudents = red.map((s: any) => ({
          id: s.student_id,
          name: profileMap[s.student_id] || '未知',
          reason: s.school_name ? `就读 ${s.school_name}` : '风险等级：红色',
        }));
        const yellowStudents = yellow.map((s: any) => ({
          id: s.student_id,
          name: profileMap[s.student_id] || '未知',
          reason: s.school_name ? `就读 ${s.school_name}` : '风险等级：黄色',
        }));

        // Expiring visas within 90 days
        const expiringVisas = (visDocs || [])
          .map((d: any) => ({ name: profileMap[d.student_id] || '未知', days: daysUntil(d.expiry_date) }))
          .filter((v: any) => v.days >= 0 && v.days <= 90)
          .sort((a: any, b: any) => a.days - b.days)
          .slice(0, 5);

        // Today's birthdays
        const todayBirthdays = si
          .filter((s: any) => s.date_of_birth && isToday(s.date_of_birth))
          .map((s: any) => {
            const name = profileMap[s.student_id] || '未知';
            return { name, initial: name.charAt(0) };
          });

        // This month new students (enrolled within current month — approximate via profiles created_at)
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { count: newThisMonth } = await db
          .from('student_enrollments')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', monthStart);

        // DCG 监督报告逾期：supervising 阶段，最近报告（或存档日）距今超过1个月
        const dcgOverdueNames: string[] = [];
        const { data: dcgCases } = await db
          .from('dcg_cases')
          .select('id, archived_date, student:profiles!dcg_cases_student_id_fkey(full_name)')
          .eq('stage', 'supervising');
        if (dcgCases && dcgCases.length) {
          const ids = dcgCases.map((c: any) => c.id);
          const { data: reps } = await db
            .from('dcg_supervision_reports')
            .select('case_id, report_date')
            .in('case_id', ids)
            .order('report_date', { ascending: false });
          const latest: Record<number, string> = {};
          for (const r of reps || []) if (!latest[r.case_id]) latest[r.case_id] = r.report_date;
          for (const c of dcgCases) {
            const base = latest[c.id] || c.archived_date;
            if (!base) continue;
            const due = new Date(base); due.setMonth(due.getMonth() + 1);
            if (due.getTime() < Date.now()) {
              const nm = Array.isArray(c.student) ? c.student[0]?.full_name : c.student?.full_name;
              dcgOverdueNames.push(nm || '某学生');
            }
          }
        }

        // 员工列表：展示所有非学生角色的在职人员
        const staffList = profiles
          .filter((p: any) => p.role !== 'student')
          .map((p: any) => ({
            name: p.full_name || '未知',
            initial: (p.full_name || '?').charAt(0),
            role: ROLE_LABEL[p.role] || p.role || '—',
          }));

        setData({
          totalStudents,
          newThisMonth: newThisMonth || 0,
          redCount: red.length,
          yellowCount: yellow.length,
          greenCount: si.filter((s: any) => s.risk_level === 'green' || !s.risk_level).length,
          redStudents,
          yellowStudents,
          expiringVisas,
          todayBirthdays,
          todayTransportCount: (transportRoutes || []).length,
          staffList,
          pendingWarnings: pendingW || 0,
          absentToday: absences || 0,
          dcgOverdue: dcgOverdueNames.length,
          dcgOverdueNames,
        });
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <IconLoader2 className="spinner" size={32} style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (!data) return null;

  const hasUrgent = data.redCount > 0 || data.expiringVisas.some(v => v.days <= 14);

  return (
    <>
      {/* 顶部预警横幅：仅在有红色学生或签证14天内到期时显示 */}
      {hasUrgent && (
        <div className="alert-banner">
          <IconAlertCircle stroke={1.5} size={18} />
          {data.redCount > 0 ? (
            <span>
              <span style={{ fontWeight: 500 }}>{data.redStudents[0]?.name}</span>
              {data.redCount > 1 ? ` 等 ${data.redCount} 名学生` : ''} 处于红色风险 — 请立即处理
            </span>
          ) : (
            <span>
              <span style={{ fontWeight: 500 }}>{data.expiringVisas[0]?.name}</span> 签证将在{' '}
              {data.expiringVisas[0]?.days} 天内到期
            </span>
          )}
          <span className="link" style={{ marginLeft: 'auto' }} onClick={() => navigate('/risk')}>
            查看详情 →
          </span>
        </div>
      )}

      {/* DCG 监督报告逾期提醒 */}
      {data.dcgOverdue > 0 && (
        <div className="alert-banner" style={{ background: '#FFF8EB', border: '0.5px solid #FAC775', color: '#854F0B', marginBottom: 14 }}>
          <IconAlertCircle stroke={1.5} size={18} />
          <span>
            <span style={{ fontWeight: 500 }}>{data.dcgOverdueNames[0]}</span>
            {data.dcgOverdue > 1 ? ` 等 ${data.dcgOverdue} 名 DCG 学生` : ''} 的月度监督报告已逾期 — 请尽快补交
          </span>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="g4" style={{ marginBottom: 14 }}>
        <div className="stat-card">
          <div className="stat-label">在读学生</div>
          <div className="stat-val" style={{ color: 'var(--color-text-info)' }}>{data.totalStudents}</div>
          <div className="stat-sub">本月新增 {data.newThisMonth} 人</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">风险预警</div>
          <div className="stat-val" style={{ color: data.redCount > 0 ? '#A32D2D' : data.yellowCount > 0 ? '#854F0B' : 'var(--color-success)' }}>
            {data.redCount + data.yellowCount}
          </div>
          <div className="stat-sub">
            {data.redCount > 0 ? `红色${data.redCount} · ` : ''}
            {data.yellowCount > 0 ? `黄色${data.yellowCount}` : ''}
            {data.redCount === 0 && data.yellowCount === 0 ? '全部正常 🎉' : ''}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">今日接送路线</div>
          <div className="stat-val" style={{ color: '#185FA5' }}>{data.todayTransportCount}</div>
          <div className="stat-sub">{data.todayTransportCount > 0 ? '已排班' : '暂无排班'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">待审批警告</div>
          <div className="stat-val" style={{ color: data.pendingWarnings > 0 ? '#854F0B' : 'var(--color-text-secondary)' }}>
            {data.pendingWarnings}
          </div>
          <div className="stat-sub">{data.pendingWarnings > 0 ? '需要审批' : '无待处理'}</div>
        </div>
      </div>

      <div className="g2" style={{ alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 今日待处理 */}
          <div className="card">
            <div className="card-title"><IconChecklist stroke={1.5} />今日待处理</div>

            <div className="todo-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                <IconCar stroke={1.5} size={14} />今日接送路线
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="pill p-blue">{data.todayTransportCount} 条</span>
                <span className="link" onClick={() => navigate('/transport')}>查看 →</span>
              </div>
            </div>

            <div className="todo-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                <IconUserOff stroke={1.5} size={14} />今日缺勤
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {data.absentToday > 0
                  ? <span className="pill p-amber">缺勤 {data.absentToday} 人</span>
                  : <span className="pill p-green">暂无缺勤</span>}
                <span className="link" onClick={() => navigate('/dorm-check')}>查看 →</span>
              </div>
            </div>

            <div className="todo-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                <IconFileAlert stroke={1.5} size={14} />签证即将到期
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {data.expiringVisas.length > 0
                  ? <span className="pill p-red">{data.expiringVisas.length} 人 · 最快 {data.expiringVisas[0].days} 天</span>
                  : <span className="pill p-green">暂无</span>}
                <span className="link" onClick={() => navigate('/documents')}>查看 →</span>
              </div>
            </div>

            <div className="todo-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                <IconPhone stroke={1.5} size={14} />待审批警告信
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {data.pendingWarnings > 0
                  ? <span className="pill p-amber">{data.pendingWarnings} 项</span>
                  : <span className="pill p-gray">无</span>}
                <span className="link" onClick={() => navigate('/risk')}>查看 →</span>
              </div>
            </div>

            <div className="todo-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                <IconCake stroke={1.5} size={14} />今日生日
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {data.todayBirthdays.length > 0 ? (
                  data.todayBirthdays.map(b => (
                    <span key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div className="avatar-xs av-pink">{b.initial}</div>
                      <span style={{ color: 'var(--color-text-primary)' }}>{b.name}</span>
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>今日无生日</span>
                )}
              </div>
            </div>
          </div>

          {/* 我的待办（手动） */}
          <MyTodos />

          {/* 在职员工 */}
          <div className="card">
            <div className="card-title"><IconUsersGroup stroke={1.5} />在职员工</div>
            {data.staffList.length > 0 ? (
              data.staffList.map((s, i) => (
                <div
                  key={i}
                  className="todo-row"
                  style={{ borderBottom: i < data.staffList.length - 1 ? undefined : 'none', paddingBottom: i < data.staffList.length - 1 ? undefined : 0 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar-xs av-blue">{s.initial}</div>
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                  </div>
                  <span className="pill p-blue">{s.role}</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '12px 0' }}>
                暂无员工数据
              </div>
            )}
          </div>
        </div>

        {/* 风险预警面板 */}
        <div className="card" style={{ minHeight: 420, display: 'flex', flexDirection: 'column' }}>
          <div className="card-title"><IconAlertTriangle stroke={1.5} />风险预警面板</div>

          {data.redStudents.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>🔴 重点干预</div>
              {data.redStudents.map(s => (
                <div key={s.id} className="risk-row">
                  <div className="dot dot-r"></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontWeight: 500 }}>{s.name}</span>
                      <span className="pill p-red">红色</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{s.reason}</div>
                  </div>
                  <span className="link" onClick={() => navigate(`/students/${s.id}`)}>处理 →</span>
                </div>
              ))}
              <div className="divider"></div>
            </>
          )}

          {data.yellowStudents.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>🟡 需要关注</div>
              {data.yellowStudents.map(s => (
                <div key={s.id} className="risk-row">
                  <div className="dot dot-a"></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontWeight: 500 }}>{s.name}</span>
                      <span className="pill p-amber">黄色</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{s.reason}</div>
                  </div>
                  <span className="link" onClick={() => navigate(`/students/${s.id}`)}>查看 →</span>
                </div>
              ))}
              <div className="divider"></div>
            </>
          )}

          {data.redStudents.length === 0 && data.yellowStudents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
              <IconShieldCheck size={32} style={{ marginBottom: 8, color: 'var(--color-success)' }} />
              <div>当前无风险预警学生 🎉</div>
            </div>
          )}

          {/* 签证/证件预警 */}
          {data.expiringVisas.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>证件预警</div>
              {data.expiringVisas.map((v, i) => (
                <div
                  key={i}
                  className="risk-row"
                  style={{ borderBottom: i < data.expiringVisas.length - 1 ? undefined : 'none' }}
                >
                  <IconCertificate stroke={1.5} size={16} style={{ color: v.days <= 14 ? '#A32D2D' : '#854F0B' }} />
                  <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>
                    签证即将到期 · {v.name}
                  </span>
                  <span className={`pill ${v.days <= 14 ? 'p-red' : 'p-amber'}`}>{v.days} 天</span>
                </div>
              ))}
            </>
          )}

          {/* 底部汇总 */}
          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#3B6D11' }}>{data.greenCount}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>正常</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#854F0B' }}>{data.yellowCount}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>关注</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: '#A32D2D' }}>{data.redCount}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>干预</div>
            </div>
            <span className="link" style={{ marginLeft: 'auto', fontSize: 13 }} onClick={() => navigate('/risk')}>
              查看完整预警 →
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
