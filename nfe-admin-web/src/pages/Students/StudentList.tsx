import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPlus, IconLoader2, IconAlertTriangle } from '@tabler/icons-react';
import { useStudentStore } from '../../store/useStudentStore';

export default function StudentList() {
  const navigate = useNavigate();
  const { students, isLoading, error, fetchStudents } = useStudentStore();

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Helper to map DB risk enum to UI label and pill class
  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'green': return { label: '🟢 正常', className: 'p-green' };
      case 'yellow': return { label: '🟡 关注', className: 'p-amber' };
      case 'red': return { label: '🔴 干预', className: 'p-red' };
      default: return { label: '🟢 正常', className: 'p-green' };
    }
  };

  // Helper to map DB status enum to UI label and pill class
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return { label: '在读', className: 'p-green' };
      case 'completed': return { label: '已毕业', className: 'p-blue' };
      case 'withdrawn': return { label: '退学', className: 'p-red' };
      case 'suspended': return { label: '暂停', className: 'p-amber' };
      default: return { label: '在读', className: 'p-green' };
    }
  };

  // Helper to generate a consistent avatar color class based on student ID string
  const getAvatarColor = (idStr: string) => {
    const colors = ['av-blue', 'av-pink', 'av-teal', 'av-green', 'av-amber', 'av-purple'];
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Check if visa is expiring soon (within 90 days)
  const getVisaStyle = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return {};
    const diff = new Date(expiryDate).getTime() - Date.now();
    const daysLeft = diff / (1000 * 60 * 60 * 24);
    if (daysLeft < 0) return { color: '#A32D2D', fontWeight: 600 }; // expired
    if (daysLeft < 90) return { color: '#A32D2D', fontWeight: 500 }; // <90 days
    return {};
  };

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // empty = all
  const [riskFilter, setRiskFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');

  // Dynamically extract school list
  const schoolList = [...new Set(students.map(s => s.school_name).filter((n): n is string => !!n))].sort();

  // Compute filtered list
  const filteredStudents = students.filter((student) => {
    const lower = searchText.toLowerCase();
    const matchesSearch =
      (student.profiles?.full_name ?? '').toLowerCase().includes(lower) ||
      (student.english_name ?? '').toLowerCase().includes(lower) ||
      (student.student_id ?? '').toLowerCase().includes(lower) ||
      (student.school_name ?? '').toLowerCase().includes(lower);

    const enrollmentArray = Array.isArray(student.student_enrollments) ? student.student_enrollments : (student.student_enrollments ? [student.student_enrollments] : []);
    const enrollmentObj = enrollmentArray[0];
    const statusMatch = statusFilter
      ? (enrollmentObj?.status ?? '') === statusFilter
      : true;
    const riskMatch = riskFilter
      ? student.risk_level === riskFilter
      : true;
    const schoolMatch = schoolFilter
      ? student.school_name === schoolFilter
      : true;

    return matchesSearch && statusMatch && riskMatch && schoolMatch;
  });

  const totalCols = 10;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            className="search-bar"
            placeholder="搜索学生姓名 / 编号 / 学校…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select className="sel" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">全部状态</option>
            <option value="active">在读</option>
            <option value="completed">已毕业</option>
            <option value="suspended">暂停</option>
          </select>
          <select className="sel" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            <option value="">全部风险</option>
            <option value="green">🟢 正常</option>
            <option value="yellow">🟡 关注</option>
            <option value="red">🔴 干预</option>
          </select>
          <select className="sel" value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
            <option value="">全部学校</option>
            {schoolList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="btn btn-primary">
          <IconPlus stroke={1.5} size={16} />新建学生档案
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>编号</th>
              <th>姓名</th>
              <th>性别</th>
              <th>项目</th>
              <th>在读状态</th>
              <th>风险等级</th>
              <th>签证到期</th>
              <th>可用课时</th>
              <th>入学时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={totalCols} style={{ textAlign: 'center', padding: '40px 0' }}>
                  <IconLoader2 className="spinner" size={24} style={{ color: 'var(--color-primary)' }} />
                  <div style={{ marginTop: 8, color: 'var(--color-text-tertiary)', fontSize: 13 }}>加载中...</div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={totalCols} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-danger)' }}>
                  数据加载失败：{error}
                </td>
              </tr>
            ) : (filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-tertiary)' }}>
                    暂无符合筛选条件的学生
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => {
                  const profileArray = Array.isArray(student.profiles) ? student.profiles : (student.profiles ? [student.profiles] : []);
                  const profile = profileArray[0];
                  const enrollmentArray = Array.isArray(student.student_enrollments) ? student.student_enrollments : (student.student_enrollments ? [student.student_enrollments] : []);
                  const enrollment = enrollmentArray[0];
                  const programArray = Array.isArray(enrollment?.programs) ? enrollment.programs : (enrollment?.programs ? [enrollment.programs] : []);
                  const program = programArray[0];
                  const displayId = `NFE-${String(index + 1).padStart(3, '0')}`;
                  
                  const riskInfo = getRiskLabel(student.risk_level);
                  const statusInfo = getStatusLabel(enrollment?.status || 'active');
                  
                  const avatarColor = getAvatarColor(student.student_id);
                  const avatarChar = (profile?.avatar_url && !profile.avatar_url.includes('/'))
                    ? profile.avatar_url
                    : (profile?.full_name?.charAt(0) || 'U');

                  const genderLabel = student.gender === 'male' ? '男' : student.gender === 'female' ? '女' : '—';

                  // Onboarding checklist — count missing items
                  const docs = (student as any).student_documents || [];
                  const onboardingMissingCount = [
                    !docs.find((d: any) => d.doc_type === 'offer_letter'),
                    !docs.find((d: any) => d.doc_type === 'visa' && d.status !== 'expired'),
                    !docs.find((d: any) => d.doc_type === 'insurance' && d.status !== 'expired'),
                    !docs.find((d: any) => d.doc_type === 'guardianship'),
                    !(student as any).arrival_date,
                    !(student as any).dorm_assignments?.length,
                  ].filter(Boolean).length;

                  return (
                    <tr key={student.student_id}>
                      <td style={{ color: 'var(--color-text-tertiary)' }}>{displayId}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className={`avatar-xs ${avatarColor}`}>{avatarChar}</div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 500 }}>{profile?.full_name || '未知姓名'}</span>
                              {onboardingMissingCount > 0 && (
                                <span title={`入学清单还有 ${onboardingMissingCount} 项未完成`} style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 2,
                                  fontSize: 10, color: '#A05000', background: '#FFF5E6',
                                  border: '1px solid #F5C97F', borderRadius: 4, padding: '1px 5px',
                                }}>
                                  <IconAlertTriangle size={10} />{onboardingMissingCount}项待补
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                              {student.english_name || 'No English Name'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{genderLabel}</td>
                      <td>
                        {program || enrollment?.source ? (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {enrollment?.source === 'green_channel' && <span className="pill p-green">绿通</span>}
                            {enrollment?.source === 'agent' && <span className="pill p-blue">散客</span>}
                            {program && <span className="pill p-purple">{program.name}</span>}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                        )}
                      </td>
                      <td><span className={`pill ${statusInfo.className}`}>{statusInfo.label}</span></td>
                      <td><span className={`pill ${riskInfo.className}`}>{riskInfo.label}</span></td>
                      <td style={getVisaStyle(student.visa_expiry)}>
                        {student.visa_expiry || '—'}
                      </td>
                      <td>
                        {student.available_hours != null ? `${student.available_hours}课时` : '—'}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>
                        {enrollment?.start_date || '—'}
                      </td>
                      <td><span className="link" onClick={() => navigate(`/students/${student.student_id}`)}>查看档案</span></td>
                    </tr>
                  );
                })
              ))}
          </tbody>
        </table>

        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            共{students.length}名学生，显示第1—{filteredStudents.length}条
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn" style={{ padding: '4px 10px' }} disabled>上一页</button>
            <button className="btn btn-primary" style={{ padding: '4px 10px' }} disabled>下一页</button>
          </div>
        </div>
      </div>
    </>
  );
}
