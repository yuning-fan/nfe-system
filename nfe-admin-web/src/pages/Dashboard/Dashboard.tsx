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
  IconCurrencyDollar
} from '@tabler/icons-react';

export default function Dashboard() {
  return (
    <>
      <div className="alert-banner">
        <IconAlertCircle stroke={1.5} size={18} />
        <span><span style={{ fontWeight: 500 }}>张晓明</span> 风险等级升至红色 — 连续缺勤3天，请立即处理</span>
        <span className="link" style={{ marginLeft: 'auto' }}>查看档案 →</span>
      </div>

      <div className="g4" style={{ marginBottom: 14 }}>
        <div className="stat-card">
          <div className="stat-label">在读学生</div>
          <div className="stat-val" style={{ color: 'var(--color-text-info)' }}>24</div>
          <div className="stat-sub">2人本月入学</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">风险预警</div>
          <div className="stat-val" style={{ color: '#A32D2D' }}>3</div>
          <div className="stat-sub">红色1 · 黄色2</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">今日接送</div>
          <div className="stat-val" style={{ color: '#185FA5' }}>8</div>
          <div className="stat-sub">待确认2名</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">欠费学生</div>
          <div className="stat-val" style={{ color: '#854F0B' }}>2</div>
          <div className="stat-sub">需跟进</div>
        </div>
      </div>

      <div className="g2" style={{ alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 今日待处理 */}
          <div className="card">
            <div className="card-title"><IconChecklist stroke={1.5} />今日待处理</div>
            
            <div className="todo-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                <IconCar stroke={1.5} size={14} />今日接送
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="pill p-blue">8名</span><span className="link">查看 →</span>
              </div>
            </div>
            
            <div className="todo-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                <IconUserOff stroke={1.5} size={14} />请假 / 缺勤
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="pill p-amber">缺勤2 · 请假1</span><span className="link">查看 →</span>
              </div>
            </div>
            
            <div className="todo-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                <IconFileAlert stroke={1.5} size={14} />到期证件
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="pill p-red">签证2人 14天内</span><span className="link">查看 →</span>
              </div>
            </div>
            
            <div className="todo-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                <IconPhone stroke={1.5} size={14} />需联系家长
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="pill p-gray">3项</span><span className="link">查看 →</span>
              </div>
            </div>
            
            <div className="todo-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-secondary)' }}>
                <IconCake stroke={1.5} size={14} />今日生日
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="avatar-xs av-pink">李</div><span style={{ color: 'var(--color-text-primary)' }}>李雨晴</span>
              </div>
            </div>
          </div>

          {/* 员工今日排班 */}
          <div className="card">
            <div className="card-title"><IconUsersGroup stroke={1.5} />员工今日排班</div>
            <div className="todo-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="avatar-xs av-blue">王</div><span style={{ fontWeight: 500 }}>王老师</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>今日值班</span>
              </div>
              <span className="pill p-blue">学管</span>
            </div>
            <div className="todo-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="avatar-xs av-green">陈</div><span style={{ fontWeight: 500 }}>陈老师</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>今日接送</span>
              </div>
              <span className="pill p-green">接送</span>
            </div>
            <div className="todo-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="avatar-xs av-amber">刘</div><span style={{ fontWeight: 500 }}>刘老师</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>今日查寝 22:45</span>
              </div>
              <span className="pill p-amber">生活</span>
            </div>
          </div>
        </div>

        {/* 风险预警面板 */}
        <div className="card" style={{ minHeight: 420, display: 'flex', flexDirection: 'column' }}>
          <div className="card-title"><IconAlertTriangle stroke={1.5} />风险预警面板</div>
          
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>🔴 重点干预</div>
          <div className="risk-row">
            <div className="dot dot-r"></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontWeight: 500 }}>张晓明</span><span className="pill p-red">红色</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>连续缺勤3天 · 失联状态</div>
            </div>
            <span className="link">处理 →</span>
          </div>
          
          <div className="divider"></div>
          
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>🟡 需要关注</div>
          <div className="risk-row">
            <div className="dot dot-a"></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontWeight: 500 }}>林思远</span><span className="pill p-amber">黄色</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>成绩连续下降 · 数学低于60分</div>
            </div>
            <span className="link">查看 →</span>
          </div>
          <div className="risk-row">
            <div className="dot dot-a"></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontWeight: 500 }}>周欣怡</span><span className="pill p-amber">黄色</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>晚归2次 · 家长反馈频繁</div>
            </div>
            <span className="link">查看 →</span>
          </div>
          
          <div className="divider"></div>
          
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>证件 / 费用预警</div>
          <div className="risk-row">
            <IconCertificate stroke={1.5} size={16} style={{ color: '#A32D2D' }} />
            <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>签证即将到期 · 王明宇 / 陈佳琳</span>
            <span className="pill p-red">14天</span>
          </div>
          <div className="risk-row" style={{ borderBottom: 'none' }}>
            <IconCurrencyDollar stroke={1.5} size={16} style={{ color: '#854F0B' }} />
            <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>费用未付 · 刘海涛 / 孙欢</span>
            <span className="pill p-amber">逾期</span>
          </div>
          
          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 500, color: '#3B6D11' }}>21</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>正常</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 500, color: '#854F0B' }}>2</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>关注</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 500, color: '#A32D2D' }}>1</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>干预</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
