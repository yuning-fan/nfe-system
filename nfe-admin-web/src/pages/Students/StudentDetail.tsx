import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudentStore } from '../../store/useStudentStore';
import { useRiskStore } from '../../store/useRiskStore';
import { IconLoader2, IconEdit, IconId, IconSchool, IconCalendarStats, IconTarget, IconMapPin, IconLock, IconShieldCheck, IconUsers, IconBuildingCommunity, IconFileText, IconArrowLeft, IconCheck, IconPencil, IconWallet, IconEye, IconEyeOff, IconHeart, IconBed, IconAlertTriangle, IconCircleCheck, IconCircleX, IconPlane } from '@tabler/icons-react';
import { message, Modal } from 'antd';
import { supabase } from '../../lib/supabase';
import { uploadFile, getDownloadUrl } from '../../lib/r2';
import DcgPanel from './DcgPanel';

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentStudent: student, isLoading, error, fetchStudentById, clearCurrentStudent, updateStudent } = useStudentStore();
  const { markWarningSigned } = useRiskStore();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'basic' | 'guardian' | 'dcg' | 'academic' | 'life' | 'comms'>('basic');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  useEffect(() => {
    // Clear stale student data immediately when the ID changes
    clearCurrentStudent();
    setAvatarSrc(null);
    if (id) {
      fetchStudentById(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 头像：若 avatar_url 是上传的文件 key（含 '/'），换取预签名图片 URL
  useEffect(() => {
    const prof = Array.isArray(student?.profiles) ? student?.profiles[0] : student?.profiles;
    const av = prof?.avatar_url;
    if (av && av.includes('/')) {
      getDownloadUrl('avatars', av).then(setAvatarSrc).catch(() => setAvatarSrc(null));
    } else {
      setAvatarSrc(null);
    }
  }, [student]);

  // 上传头像
  const handleAvatarUpload = async (file: File) => {
    if (!id) return;
    try {
      const { key } = await uploadFile('avatars', id, file);
      const { error } = await (supabase as any).from('profiles').update({ avatar_url: key }).eq('id', id);
      if (error) throw error;
      message.success('头像已更新');
      fetchStudentById(id);
    } catch (err: any) {
      message.error(err.message || '头像上传失败');
    }
  };

  // Open edit modal pre-filled with current student data
  const handleOpenEdit = () => {
    setEditForm({
      english_name: student?.english_name || '',
      gender: student?.gender || '',
      date_of_birth: student?.date_of_birth || '',
      passport_number: student?.passport_number || '',
      school_name: student?.school_name || '',
      source_school: student?.source_school || '',
      english_level: student?.english_level || '',
      target_university: student?.target_university || '',
      scholarship_requirement: student?.scholarship_requirement || '',
      emergency_contact_name: student?.emergency_contact_name || '',
      emergency_contact_phone: student?.emergency_contact_phone || '',
      emergency_contact_email: student?.emergency_contact_email || '',
      home_address: student?.home_address || '',
      payment_note: student?.payment_note || '',
      health_notes: student?.health_notes || '',
      arrival_date: student?.arrival_date || '',
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    const success = await updateStudent(student!.student_id, editForm);
    setIsSaving(false);
    if (success) {
      message.success('档案已更新');
      setIsEditOpen(false);
    } else {
      message.error('保存失败，请重试');
    }
  };

  // Handle signing warning
  const handleSignWarning = (warning: any) => {
    Modal.confirm({
      title: '标记警告信已签字',
      content: '确认学生/家长已线下签署该警告信吗？',
      onOk: async () => {
        const success = await markWarningSigned(warning.id);
        if (success) {
          message.success('已标记为已签字');
          fetchStudentById(id!);
        } else {
          message.error('操作失败');
        }
      }
    });
  };

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

  // Computed fields
  const genderLabel = student.gender === 'male' ? '男' : student.gender === 'female' ? '女' : '—';
  
  // Age calculation
  const calcAge = (dob: string | null) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
    return age;
  };
  const age = calcAge(student.date_of_birth);

  // Passport masking: show first char + dots + last 3 chars
  const maskPassport = (pp: string | null) => {
    if (!pp || pp.length < 4) return pp || '—';
    return pp[0] + '•'.repeat(pp.length - 4) + pp.slice(-3);
  };

  // Documents helpers
  const docs = student.student_documents || [];
  const visaDoc = docs.find((d: any) => d.doc_type === 'visa');
  const insuranceDoc = docs.find((d: any) => d.doc_type === 'insurance');
  const offerDoc = docs.find((d: any) => d.doc_type === 'offer_letter');
  const guardianshipDoc = docs.find((d: any) => d.doc_type === 'guardianship');

  // Course assets helpers
  const courseAssets = student.course_assets || [];
  const totalAvailableHours = courseAssets.reduce((sum: number, a: any) => sum + ((a.total_hours || 0) - (a.used_hours || 0)), 0);

  // Credentials
  const credentials = student.student_credentials || [];

  // Dorm address helper
  const activeDorm = (student.dorm_assignments || [])[0];

  // Subjects from school_timetable
  const timetableSubjects = [...new Set((student.school_timetable || []).map((t: any) => t.program_subjects?.subject_name).filter(Boolean))];

  // Onboarding checklist — detect missing/incomplete items pre-enrollment
  const onboardingChecklist = [
    {
      key: 'offer',
      label: 'Offer Letter',
      desc: '录取通知书已上传',
      ok: !!offerDoc,
      missing: '未上传录取通知书',
    },
    {
      key: 'visa',
      label: '签证',
      desc: visaDoc ? `有效至 ${visaDoc.expiry_date || '未知'}` : '',
      ok: !!visaDoc && visaDoc.status !== 'expired',
      missing: !visaDoc ? '未上传签证文件' : '签证已过期',
    },
    {
      key: 'insurance',
      label: '健康保险',
      desc: insuranceDoc ? `有效至 ${insuranceDoc.expiry_date || '未知'}` : '',
      ok: !!insuranceDoc && insuranceDoc.status !== 'expired',
      missing: !insuranceDoc ? '未上传保险文件' : '保险已过期',
    },
    {
      key: 'guardianship',
      label: '监护协议',
      desc: '监护协议已上传',
      ok: !!guardianshipDoc,
      missing: '未上传监护协议',
    },
    {
      key: 'arrival',
      label: '抵达日期',
      desc: (student as any).arrival_date ? `预计 ${(student as any).arrival_date} 到达` : '',
      ok: !!(student as any).arrival_date,
      missing: '未填写抵达日期（无法安排接机）',
    },
    {
      key: 'dorm',
      label: '宿舍分配',
      desc: activeDorm ? `${activeDorm.dorms?.building_name} Room ${activeDorm.dorms?.room_number}` : '',
      ok: !!activeDorm,
      missing: '未分配宿舍',
    },
    {
      key: 'subjects',
      label: '选课',
      desc: timetableSubjects.length > 0 ? `已选 ${timetableSubjects.length} 门课` : '',
      ok: timetableSubjects.length > 0,
      missing: '尚未完成选课',
    },
  ];
  const missingCount = onboardingChecklist.filter(c => !c.ok).length;

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

  const warningStatusInfo = (status: string) => {
    switch (status) {
      case 'pending_approval': return { label: '待审批', className: 'p-amber' };
      case 'issued': return { label: '已下发·待签字', className: 'p-amber' };
      case 'signed_onsite': return { label: '已签字', className: 'p-green' };
      case 'rejected': return { label: '已拒绝', className: 'p-gray' };
      default: return { label: status, className: 'p-gray' };
    }
  };


  const riskInfo = getRiskLabel(student.risk_level);
  const statusInfo = getStatusLabel(enrollment?.status || 'active');
  const avatarColor = getAvatarColor(student.student_id);
  // avatar_url 含 '/' 表示是上传的文件 key（用图片展示），否则当作中文首字
  const avatarChar = (profile?.avatar_url && !profile.avatar_url.includes('/'))
    ? profile.avatar_url
    : (profile?.full_name?.charAt(0) || 'U');

  // Display ID (slice UUID for now)
  const displayId = `NFE-${student.student_id.slice(0, 6).toUpperCase()}`;

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
        <label title="点击上传头像" style={{ cursor: 'pointer', position: 'relative', display: 'inline-block' }}>
          {avatarSrc ? (
            <img src={avatarSrc} alt="头像" className="avatar-lg" style={{ objectFit: 'cover' }} />
          ) : (
            <div className={`avatar-lg ${avatarColor}`}>{avatarChar}</div>
          )}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ''; }}
          />
        </label>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 600 }}>{profile?.full_name || '未知姓名'}</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{student.english_name}</span>
            <span className={`pill ${riskInfo.className}`}>{riskInfo.label}</span>
            <span className={`pill ${statusInfo.className}`}>{statusInfo.label}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            <span>编号 {displayId}</span>
            <span>{student.school_name || '—'}</span>
            <span>
              {enrollment?.source === 'green_channel' && <span className="pill p-green" style={{marginRight: 4, fontSize: 10}}>绿通</span>}
              {enrollment?.source === 'agent' && <span className="pill p-blue" style={{marginRight: 4, fontSize: 10}}>散客</span>}
              {program?.name || '未分配阶段'}
            </span>
            <span>签证至 {visaDoc?.expiry_date || '—'}</span>
            <span>可用课时 {totalAvailableHours}</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleOpenEdit}>
          <IconEdit size={16} style={{ marginRight: 6 }} />编辑档案
        </button>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        title="编辑学生档案"
        open={isEditOpen}
        onCancel={() => setIsEditOpen(false)}
        onOk={handleSaveEdit}
        confirmLoading={isSaving}
        width={640}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <div className="form-group">
            <label className="form-label">英文名</label>
            <input className="input" value={editForm.english_name} onChange={e => setEditForm({ ...editForm, english_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">性别</label>
            <select className="input" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
              <option value="">未设置</option>
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">出生日期</label>
            <input className="input" type="date" value={editForm.date_of_birth} onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">护照号</label>
            <input className="input" value={editForm.passport_number} onChange={e => setEditForm({ ...editForm, passport_number: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">就读学校</label>
            <input className="input" value={editForm.school_name} onChange={e => setEditForm({ ...editForm, school_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">生源校</label>
            <input className="input" value={editForm.source_school} onChange={e => setEditForm({ ...editForm, source_school: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">英语水平</label>
            <input className="input" placeholder="如 IELTS 6.5" value={editForm.english_level} onChange={e => setEditForm({ ...editForm, english_level: e.target.value })} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">目标院校</label>
            <input className="input" value={editForm.target_university} onChange={e => setEditForm({ ...editForm, target_university: e.target.value })} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">奖学金要求</label>
            <input className="input" value={editForm.scholarship_requirement} onChange={e => setEditForm({ ...editForm, scholarship_requirement: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">紧急联系人姓名</label>
            <input className="input" value={editForm.emergency_contact_name} onChange={e => setEditForm({ ...editForm, emergency_contact_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">紧急联系人电话</label>
            <input className="input" value={editForm.emergency_contact_phone} onChange={e => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">家长邮箱</label>
            <input className="input" value={editForm.emergency_contact_email} onChange={e => setEditForm({ ...editForm, emergency_contact_email: e.target.value })} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">国内家庭住址</label>
            <input className="input" value={editForm.home_address} onChange={e => setEditForm({ ...editForm, home_address: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">缴费备注</label>
            <input className="input" value={editForm.payment_note} onChange={e => setEditForm({ ...editForm, payment_note: e.target.value })} placeholder="如：5个月+本科半年" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">健康 / 禁忌备注</label>
            <textarea className="input" rows={2} value={editForm.health_notes} onChange={e => setEditForm({ ...editForm, health_notes: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">✈️ 预计抵达日期</label>
            <input className="input" type="date" value={editForm.arrival_date} onChange={e => setEditForm({ ...editForm, arrival_date: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Body content area */}
      <div style={{ flex: 1, padding: '0 32px 32px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        {/* Tabs */}
        <div className="tab-bar" style={{ margin: '24px 0 20px' }}>
          <div className={`tab ${activeTab === 'basic' ? 'active' : ''}`} onClick={() => setActiveTab('basic')}>基本信息</div>
          <div className={`tab ${activeTab === 'guardian' ? 'active' : ''}`} onClick={() => setActiveTab('guardian')}>监护 / 联系人</div>
          <div className={`tab ${activeTab === 'dcg' ? 'active' : ''}`} onClick={() => setActiveTab('dcg')}>DCG 监护</div>
          <div className={`tab ${activeTab === 'academic' ? 'active' : ''}`} onClick={() => setActiveTab('academic')}>学业跟进</div>
          <div className={`tab ${activeTab === 'life' ? 'active' : ''}`} onClick={() => setActiveTab('life')}>生活管理</div>
          <div className={`tab ${activeTab === 'comms' ? 'active' : ''}`} onClick={() => setActiveTab('comms')}>沟通记录</div>
        </div>

        {/* Tab Content: Basic Info */}
        {activeTab === 'basic' && (
          <div className="tabpage active">

            {/* 入学清单检测 */}
            <div className="card" style={{ marginBottom: 20, border: missingCount > 0 ? '1px solid #EF9F27' : '1px solid var(--color-border)' }}>
              <div className="card-title" style={{ color: missingCount > 0 ? '#854F0B' : 'var(--color-text-primary)', marginBottom: 12 }}>
                {missingCount > 0
                  ? <><IconAlertTriangle size={16} style={{ color: '#EF9F27', marginRight: 6 }} />入学清单 · <span style={{ color: '#A32D2D' }}>{missingCount} 项待完成</span></>
                  : <><IconCircleCheck size={16} style={{ color: 'var(--color-success)', marginRight: 6 }} />入学清单 · 全部完成</>
                }
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {onboardingChecklist.map(item => (
                  <div key={item.key} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px', borderRadius: 8,
                    background: item.ok ? 'var(--color-bg-secondary)' : '#FFF5E6',
                    border: `1px solid ${item.ok ? 'var(--color-border)' : '#F5C97F'}`,
                  }}>
                    {item.ok
                      ? <IconCircleCheck size={18} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
                      : <IconCircleX size={18} style={{ color: '#E07B00', flexShrink: 0, marginTop: 1 }} />
                    }
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: item.ok ? 'var(--color-text-primary)' : '#7A3E00' }}>
                        {item.key === 'arrival' && <IconPlane size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                        {item.label}
                      </div>
                      <div style={{ fontSize: 11, color: item.ok ? 'var(--color-text-secondary)' : '#A05000', marginTop: 2 }}>
                        {item.ok ? item.desc : item.missing}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="g3" style={{ alignItems: 'start' }}>
              {/* 身份识别 */}
              <div className="card">
                <div className="group-head"><IconId size={16} />身份识别</div>
                <div className="field"><span className="field-k">编号</span><span className="field-v">{displayId}</span></div>
                <div className="field"><span className="field-k">姓名 / 英文名</span><span className="field-v">{profile?.full_name} / {student.english_name || '—'}</span></div>
                <div className="field"><span className="field-k">性别</span><span className="field-v">{genderLabel}</span></div>
                <div className="field"><span className="field-k">出生日期</span><span className="field-v">{student.date_of_birth || '—'}</span></div>
                <div className="field"><span className="field-k">年龄</span><span className="field-v">
                  {age != null ? (
                    <>{age}岁 {age < 18 && <span className="pill p-amber" style={{ fontSize: 10 }}>未成年</span>}</>
                  ) : '—'}
                </span></div>
                <div className="field"><span className="field-k">护照号</span><span className="field-v">{maskPassport(student.passport_number)}</span></div>
              </div>
              
              {/* 来源与归属 */}
              <div className="card">
                <div className="group-head"><IconSchool size={16} />来源与归属</div>
                <div className="field"><span className="field-k">生源校</span><span className="field-v">{student.source_school || '—'}</span></div>
                <div className="field"><span className="field-k">就读学校</span><span className="field-v">{student.school_name || '—'}</span></div>
                <div className="field"><span className="field-k">课程</span><span className="field-v">{timetableSubjects.length > 0 ? timetableSubjects.join(' / ') : '—'}</span></div>
                <div className="field"><span className="field-k">来源</span><span className="field-v">{enrollment?.source === 'green_channel' ? '绿通' : enrollment?.source === 'agent' ? '散客' : '—'}</span></div>
                <div className="field"><span className="field-k">阶段</span><span className="field-v">{program?.name || '—'}</span></div>
                <div className="field"><span className="field-k">缴费备注</span><span className="field-v">{student.payment_note || '—'}</span></div>
              </div>

              {/* 在读状态 + 留学目标 */}
              <div className="card">
                <div className="group-head"><IconCalendarStats size={16} />在读状态</div>
                <div className="field"><span className="field-k">项目周期</span><span className="field-v">{enrollment?.start_date || '—'} 至 {enrollment?.end_date || '—'}</span></div>
                <div className="field"><span className="field-k">在读状态</span><span className="field-v"><span className={`pill ${statusInfo.className}`}>{statusInfo.label}</span></span></div>
                
                <div className="group-head" style={{ marginTop: 16 }}><IconTarget size={16} />留学目标</div>
                <div className="field"><span className="field-k">目标院校</span><span className="field-v">{student.target_university || '—'}</span></div>
                <div className="field"><span className="field-k">英语水平</span><span className="field-v">{student.english_level || '—'}</span></div>
                <div className="field"><span className="field-k">奖学金要求</span><span className="field-v">{student.scholarship_requirement || '无'}</span></div>
              </div>

              {/* 地址 */}
              <div className="card">
                <div className="group-head"><IconMapPin size={16} />地址</div>
                <div className="field"><span className="field-k">学生电话</span><span className="field-v">{profile?.phone || '—'}</span></div>
                <div className="field"><span className="field-k">新西兰住址</span><span className="field-v">
                  {activeDorm ? (
                    <>{activeDorm.dorms?.building_name}, Room {activeDorm.dorms?.room_number} <span className="link" onClick={() => setActiveTab('life')}>查看住宿</span></>
                  ) : '—'}
                </span></div>
                <div className="field"><span className="field-k">国内住址</span><span className="field-v">{student.home_address || '—'}</span></div>
              </div>

              {/* 学校平台账户 + 服务与费用 */}
              <div className="card">
                <div className="group-head"><IconLock size={16} />学校平台账户</div>
                {credentials.length > 0 ? (
                  credentials.map((cred: any) => (
                    <div key={cred.id} style={{ marginBottom: 12 }}>
                      <div className="field"><span className="field-k">{cred.platform_name} 账号</span><span className="field-v">{cred.account}</span></div>
                      <div className="field"><span className="field-k">{cred.platform_name} 密码</span><span className="field-v">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-background-secondary)', padding: '2px 8px', borderRadius: 4 }}>
                          {showPasswords[cred.id] ? cred.encrypted_password : '••••••••'}
                          <span className="link" onClick={() => setShowPasswords(prev => ({ ...prev, [cred.id]: !prev[cred.id] }))}>
                            {showPasswords[cred.id] ? <IconEyeOff size={13} /> : <IconEye size={13} />}
                            {showPasswords[cred.id] ? ' 隐藏' : ' 查看'}
                          </span>
                        </span>
                      </span></div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>暂无平台账户记录</div>
                )}
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 8, lineHeight: 1.6 }}>
                  仅管理员及学管老师可查看，所有查看操作记录操作日志。
                </div>

                <div className="group-head" style={{ marginTop: 16 }}><IconWallet size={16} />服务与费用</div>
                <div className="field"><span className="field-k">可用课时</span><span className="field-v">{totalAvailableHours} 课时 <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>（只读）</span></span></div>
              </div>

              {/* 证件与状态 */}
              <div className="card">
                <div className="group-head"><IconShieldCheck size={16} />证件与状态</div>
                <div className="field"><span className="field-k">签证状态</span><span className="field-v">{visaDoc ? (visaDoc.status === 'valid' ? '有效' : visaDoc.status) : '—'}</span></div>
                <div className="field"><span className="field-k">签证到期日</span><span className="field-v" style={visaDoc?.expiry_date && new Date(visaDoc.expiry_date).getTime() - Date.now() < 90 * 86400000 ? { color: '#A32D2D', fontWeight: 500 } : {}}>{visaDoc?.expiry_date || '—'}</span></div>
                <div className="field"><span className="field-k">保险状态</span><span className="field-v">{insuranceDoc ? (insuranceDoc.status === 'valid' ? '有效' : insuranceDoc.status) : '—'}</span></div>
                <div className="field"><span className="field-k">保险到期日</span><span className="field-v">{insuranceDoc?.expiry_date || '—'}</span></div>
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
                      {student.emergency_contact_email && (
                        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                          ✉️ {student.emergency_contact_email}
                        </div>
                      )}
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

            {/* 警告历史 */}
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-title"><IconAlertTriangle size={16} />警告记录</div>
              {(student.warning_letters && student.warning_letters.length > 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {student.warning_letters.map((w: any) => {
                    const st = warningStatusInfo(w.status);
                    return (
                      <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 12, border: '1px solid var(--color-border-tertiary)', borderRadius: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span className="pill p-red">{w.warning_level} 级警告</span>
                            <span className={`pill ${st.className}`}>{st.label}</span>
                            {w.signed_at && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>签字于 {new Date(w.signed_at).toLocaleDateString('zh-CN')}</span>}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{w.evidence_content || '无佐证说明'}</div>
                        </div>
                        {w.status === 'issued' && (
                          <button className="btn" style={{ flexShrink: 0 }} onClick={() => handleSignWarning(w)}>
                            <IconCheck size={14} style={{ marginRight: 4 }} />标记已签字
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>暂无警告记录</div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: DCG */}
        {activeTab === 'dcg' && (
          <div className="tabpage active">
            <DcgPanel
              studentId={student.student_id}
              studentName={profile?.full_name || '该学生'}
              dateOfBirth={student.date_of_birth}
              documents={student.student_documents || []}
              onDocsChanged={() => id && fetchStudentById(id)}
            />
          </div>
        )}

        {/* Tab Content: Academic */}
        {activeTab === 'academic' && (
          <div className="tabpage active">
            <div className="g1">
              <div className="card">
                <div className="card-title">奥大选修课与课表</div>
                {student.school_timetable && student.school_timetable.length > 0 ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {[1, 2, 3, 4, 5].map(day => {
                      const dayName = ['周一', '周二', '周三', '周四', '周五'][day - 1];
                      const dayClasses = (student.school_timetable || []).filter((t: any) => t.day_of_week === day).sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
                      return (
                        <div key={day} style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: 6, padding: 8, background: 'var(--color-bg-secondary)' }}>
                          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{dayName}</div>
                          {dayClasses.length === 0 ? (
                            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-tertiary)' }}>无排课</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {dayClasses.map((c: any) => (
                                <div key={c.id} style={{ background: 'var(--color-bg)', borderLeft: '3px solid var(--color-primary)', padding: '6px 8px', borderRadius: 4, fontSize: 11 }}>
                                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{c.program_subjects?.subject_name}</div>
                                  <div style={{ color: 'var(--color-text-secondary)' }}>{c.start_time.slice(0, 5)} - {c.end_time.slice(0, 5)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '20px 0', textAlign: 'center' }}>暂无排课记录</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Life */}
        {activeTab === 'life' && (
          <div className="tabpage active">
            <div className="g2" style={{ alignItems: 'start' }}>
              <div className="card">
                <div className="group-head"><IconBed size={16} />住宿信息</div>
                {activeDorm ? (
                  <>
                    <div className="field"><span className="field-k">住宿地址</span><span className="field-v">{activeDorm.dorms?.building_name}</span></div>
                    <div className="field"><span className="field-k">房间</span><span className="field-v">Room {activeDorm.dorms?.room_number}</span></div>
                    <div className="field"><span className="field-k">入住时间</span><span className="field-v">{activeDorm.start_date} 至 {activeDorm.end_date || '至今'}</span></div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>暂无住宿记录</div>
                )}

                <div className="group-head" style={{ marginTop: 16 }}><IconHeart size={16} />健康与禁忌</div>
                <div className="field"><span className="field-k">健康情况</span><span className="field-v">{student.health_notes || '—'}</span></div>
              </div>
              
              <div className="card">
                <div className="card-title">风险警告信记录</div>
                {student.warning_letters && student.warning_letters.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {student.warning_letters.map((wl: any) => (
                      <div key={wl.id} style={{ padding: 12, border: '1px solid var(--color-border)', borderLeft: '4px solid var(--color-danger)', borderRadius: 8, background: 'var(--color-bg-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 500 }}>级别 {wl.warning_level} 警告信</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {wl.status === 'issued' && !wl.signed_at && (
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '2px 8px', fontSize: 11, minHeight: 24 }}
                                onClick={() => handleSignWarning(wl)}
                              >
                                <IconPencil size={12} style={{ marginRight: 4 }} /> 补录签字
                              </button>
                            )}
                            {wl.signed_at && (
                              <span style={{ fontSize: 11, color: 'var(--color-success)', display: 'flex', alignItems: 'center' }}>
                                <IconCheck size={12} style={{ marginRight: 2 }} /> 已签字
                              </span>
                            )}
                            <span className="pill p-amber">{wl.status}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{wl.evidence_content}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>下发日期: {new Date(wl.created_at).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>该生表现良好，无警告记录</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Placeholders for other tabs */}
        {['comms'].includes(activeTab) && (
          <div className="tabpage active">
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <IconFileText size={48} style={{ color: 'var(--color-border-hover)', marginBottom: 16 }} />
              <h3 style={{ color: 'var(--color-text-secondary)' }}>模块开发中</h3>
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: 13, marginTop: 8 }}>
                沟通记录等周边模块将在后续接入。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
