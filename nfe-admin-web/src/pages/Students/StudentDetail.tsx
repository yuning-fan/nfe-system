import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudentStore } from '../../store/useStudentStore';
import { IconLoader2, IconEdit, IconId, IconSchool, IconCalendarStats, IconTarget, IconMapPin, IconLock, IconShieldCheck, IconUsers, IconBuildingCommunity, IconFileText, IconArrowLeft } from '@tabler/icons-react';

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentStudent: student, isLoading, error, fetchStudentById, clearCurrentStudent } = useStudentStore();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'basic' | 'guardian' | 'academic' | 'life' | 'comms'>('basic');

  useEffect(() => {
    // Clear stale student data immediately when the ID changes
    clearCurrentStudent();
    if (id) {
      fetchStudentById(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Show full-screen loader while fetching
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg-secondary)' }}>
        <IconLoader2 className="spinner" size={40} style={{ color: 'var(--color-primary)' }} />
        <div style={{ marginTop: 16, color: 'var(--color-text-secondary)', fontSize: 15 }}>加载学生档案中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg-secondary)' }}>
        <h3 style={{ color: 'var(--color-danger)' }}>无法加载学生档案</h3>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate('/students')} style={{ marginTop: 24 }}>返回学生列表</button>
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg-secondary)' }}>
        <h3 style={{ color: 'var(--color-text-secondary)' }}>未找到该学生档案</h3>
        <button className="btn btn-primary" onClick={() => navigate('/students')} style={{ marginTop: 24 }}>返回学生列表</button>
      </div>
    );
  }

  const profileArray = Array.isArray(student.profiles) ? student.profiles : [student.profiles];
  const profile = profileArray[0];
  const enrollmentsArray = Array.isArray(student.student_enrollments) ? student.student_enrollments : [student.student_enrollments];
  const enrollment = enrollmentsArray[0];
  const program = enrollment?.programs;

  // Helper mappings
  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'green': return { label: '🟢 正常', className: 'p-green' };
      case 'yellow': return { label: '🟡 关注', className: 'p-amber' };
      case 'red': return { label: '🔴 干预', className: 'p-red' };
      default: return { label: '🟢 正常', className: 'p-green' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return { label: '在读', className: 'p-green' };
      case 'completed': return { label: '已毕业', className: 'p-blue' };
      case 'withdrawn': return { label: '退学', className: 'p-red' };
      case 'suspended': return { label: '暂停', className: 'p-amber' };
      default: return { label: '在读', className: 'p-green' };
    }
  };

  const getAvatarColor = (idStr: string) => {
    const colors = ['av-blue', 'av-pink', 'av-teal', 'av-green', 'av-amber', 'av-purple'];
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const riskInfo = getRiskLabel(student.risk_level);
  const statusInfo = getStatusLabel(enrollment?.status || 'active');
  const avatarColor = getAvatarColor(student.student_id);
  const avatarChar = profile?.avatar_url || profile?.full_name?.charAt(0) || 'U';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-secondary)', display: 'flex', flexDirection: 'column' }}>
      {/* Full-screen header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 32px', background: 'var(--color-bg-primary)',
        borderBottom: '1px solid var(--color-border-tertiary)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button
          className="btn"
          onClick={() => navigate('/students')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <IconArrowLeft size={16} /> 返回列表
        </button>
        <div className={`avatar-lg ${avatarColor}`}>{avatarChar}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 600 }}>{profile?.full_name || '未知姓名'}</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{student.english_name}</span>
            <span className={`pill ${riskInfo.className}`}>{riskInfo.label}</span>
            <span className={`pill ${statusInfo.className}`}>{statusInfo.label}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            <span>{student.school_name || '—'}</span>
            <span>{program?.name || '未分配项目'}</span>
            <span>目标: {student.target_university || '—'}</span>
          </div>
        </div>
        <button className="btn btn-primary">
          <IconEdit size={16} style={{ marginRight: 6 }} />编辑档案
        </button>
      </div>

      {/* Body content area */}
      <div style={{ flex: 1, padding: '0 32px 32px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        {/* Tabs */}
        <div className="tab-bar" style={{ margin: '24px 0 20px' }}>
          <div className={`tab ${activeTab === 'basic' ? 'active' : ''}`} onClick={() => setActiveTab('basic')}>基本信息</div>
          <div className={`tab ${activeTab === 'guardian' ? 'active' : ''}`} onClick={() => setActiveTab('guardian')}>监护 / 联系人</div>
          <div className={`tab ${activeTab === 'academic' ? 'active' : ''}`} onClick={() => setActiveTab('academic')}>学业跟进</div>
          <div className={`tab ${activeTab === 'life' ? 'active' : ''}`} onClick={() => setActiveTab('life')}>生活管理</div>
          <div className={`tab ${activeTab === 'comms' ? 'active' : ''}`} onClick={() => setActiveTab('comms')}>沟通记录</div>
        </div>

        {/* Tab Content: Basic Info */}
        {activeTab === 'basic' && (
          <div className="tabpage active">
            <div className="g3" style={{ alignItems: 'start' }}>
              <div className="card">
                <div className="group-head"><IconId size={16} />身份识别</div>
                <div className="field"><span className="field-k">姓名</span><span className="field-v">{profile?.full_name}</span></div>
                <div className="field"><span className="field-k">英文名</span><span className="field-v">{student.english_name || '—'}</span></div>
                <div className="field"><span className="field-k">出生日期</span><span className="field-v">{student.date_of_birth || '—'}</span></div>
                <div className="field"><span className="field-k">护照号</span><span className="field-v">{student.passport_number || '—'}</span></div>
              </div>
              
              <div className="card">
                <div className="group-head"><IconSchool size={16} />来源与归属</div>
                <div className="field"><span className="field-k">生源校</span><span className="field-v">{student.source_school || '—'}</span></div>
                <div className="field"><span className="field-k">就读学校</span><span className="field-v">{student.school_name || '—'}</span></div>
                <div className="field"><span className="field-k">项目</span><span className="field-v">{program?.name || '—'}</span></div>
              </div>

              <div className="card">
                <div className="group-head"><IconCalendarStats size={16} />在读状态</div>
                <div className="field"><span className="field-k">在读状态</span><span className="field-v"><span className={`pill ${statusInfo.className}`}>{statusInfo.label}</span></span></div>
                <div className="field"><span className="field-k">项目周期</span><span className="field-v">{enrollment?.start_date} 至 {enrollment?.end_date}</span></div>
                
                <div className="group-head" style={{ marginTop: 16 }}><IconTarget size={16} />留学目标</div>
                <div className="field"><span className="field-k">目标院校</span><span className="field-v">{student.target_university || '—'}</span></div>
                <div className="field"><span className="field-k">英语水平</span><span className="field-v">{student.english_level || '—'}</span></div>
                <div className="field"><span className="field-k">奖学金要求</span><span className="field-v">{student.scholarship_requirement || '无'}</span></div>
              </div>

              <div className="card">
                <div className="group-head"><IconMapPin size={16} />联系方式</div>
                <div className="field"><span className="field-k">健康与禁忌</span><span className="field-v">{student.health_notes || '—'}</span></div>
                <div className="field"><span className="field-k">学生电话</span><span className="field-v">{profile?.phone || '—'}</span></div>
              </div>

              <div className="card">
                <div className="group-head"><IconShieldCheck size={16} />证件与状态</div>
                <div className="field"><span className="field-k">风险等级</span><span className="field-v"><span className={`pill ${riskInfo.className}`}>{riskInfo.label}</span></span></div>
                <div className="field"><span className="field-k">风险积分</span><span className="field-v">{student.total_risk_score} 分</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Guardian */}
        {activeTab === 'guardian' && (
          <div className="tabpage active">
            <div className="g2" style={{ alignItems: 'start' }}>
              <div className="card">
                <div className="card-title"><IconUsers size={16} />紧急联系人</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {student.emergency_contact_name ? (
                    <div className="contact-card" style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 8 }}>
                      <div style={{ fontWeight: 500, marginBottom: 8 }}>{student.emergency_contact_name} <span className="pill p-red">紧急联系人</span></div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconLock size={14} /> {student.emergency_contact_phone || '未提供电话'}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>无紧急联系人记录</div>
                  )}
                </div>
              </div>
              <div className="card">
                <div className="card-title"><IconBuildingCommunity size={16} />机构联系人 (占位)</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>开发中...</div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholders for other tabs */}
        {['academic', 'life', 'comms'].includes(activeTab) && (
          <div className="tabpage active">
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <IconFileText size={48} style={{ color: 'var(--color-border-hover)', marginBottom: 16 }} />
              <h3 style={{ color: 'var(--color-text-secondary)' }}>模块开发中</h3>
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: 13, marginTop: 8 }}>
                此模块将在 MVP 后续阶段 (Phase 3) 接入真实业务流数据。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
