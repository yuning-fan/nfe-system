import { useState, useEffect } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useStudentStore } from '../../store/useStudentStore';
import { useAcademicStore } from '../../store/useAcademicStore';
import { IconCalendarPlus, IconPlus, IconCheck, IconX, IconClock, IconUser, IconBook, IconPaperclip } from '@tabler/icons-react';
import { Modal, message } from 'antd';
import { getDownloadUrl } from '../../lib/r2';
import FileUploadButton from '../../components/common/FileUploadButton';


export default function TutorScheduleManagement() {
  const { pendingSchedules, schedules, tutors, fetchPendingSchedules, fetchSchedules, fetchTutors, createSchedule, approveSchedule, rejectSchedule, attachMaterial, isLoading } = useScheduleStore();

  const openMaterial = async (key: string | null) => {
    if (!key) return;
    try {
      const url = await getDownloadUrl('materials', key);
      window.open(url, '_blank');
    } catch (e: any) {
      message.error(e.message || '获取课件失败');
    }
  };
  const { students, fetchStudents } = useStudentStore();
  const { courses, fetchCourses, courseAssets, fetchCourseAssets } = useAcademicStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  // Week navigation: offset in weeks from today (0 = this week)
  const [weekOffset, setWeekOffset] = useState(0);
  const [formData, setFormData] = useState({
    student_id: '',
    tutor_id: '',
    course_id: '',
    subject_label: '',
    date: '',
    start_hour: '09',
    start_min: '00',
    duration_hours: '1.5',
  });

  useEffect(() => {
    fetchPendingSchedules();
    fetchSchedules();
    fetchTutors();
    fetchStudents();
    fetchCourses();
    fetchCourseAssets();
  }, [fetchPendingSchedules, fetchSchedules, fetchTutors, fetchStudents, fetchCourses, fetchCourseAssets]);

  // Auto-fill subject_label from selected course
  useEffect(() => {
    if (formData.course_id) {
      const c = courses.find(c => c.id === parseInt(formData.course_id));
      if (c) setFormData(f => ({ ...f, subject_label: c.name }));
    }
  }, [formData.course_id, courses]);

  // Get remaining hours for selected student + course combo
  const remainingHours = (() => {
    if (!formData.student_id || !formData.course_id) return null;
    const asset = courseAssets.find(
      a => a.student_id === formData.student_id && a.course_id === parseInt(formData.course_id)
    );
    if (!asset) return null;
    return Number(asset.total_hours) - Number(asset.used_hours);
  })();

  const handleCreate = async () => {
    if (!formData.student_id || !formData.tutor_id || !formData.course_id || !formData.date) {
      message.error('请填写所有必填项');
      return;
    }

    const startTime = new Date(`${formData.date}T${formData.start_hour}:${formData.start_min}:00`);
    const endTime = new Date(startTime.getTime() + parseFloat(formData.duration_hours) * 60 * 60 * 1000);

    // Warn if not enough hours
    if (remainingHours !== null && parseFloat(formData.duration_hours) > remainingHours) {
      message.warning(`该学生此课程剩余课时不足（剩余 ${remainingHours} 小时），但仍可提交申请。`);
    }

    const success = await createSchedule({
      student_id: formData.student_id,
      tutor_id: formData.tutor_id,
      course_id: parseInt(formData.course_id),
      subject_label: formData.subject_label,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    });

    if (success) {
      message.success('排课申请已提交，等待审批');
      setIsCreateOpen(false);
    }
  };

  const handleApprove = (id: number, studentName: string) => {
    Modal.confirm({
      title: '确认审批通过',
      content: `确认通过【${studentName}】的这堂课申请？系统将自动扣减对应课时。`,
      okText: '通过',
      onOk: async () => {
        const success = await approveSchedule(id);
        if (success) message.success('排课已审批通过，课时已扣减');
      }
    });
  };

  const handleReject = (id: number) => {
    Modal.confirm({
      title: '拒绝排课申请',
      content: '确认拒绝此排课申请？该记录将被删除。',
      okText: '拒绝',
      okType: 'danger',
      onOk: async () => {
        const success = await rejectSchedule(id);
        if (success) message.success('排课申请已拒绝');
      }
    });
  };

  const DAY_NAMES = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  // Compute the Mon–Sun date range for the selected week
  const getWeekDates = () => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };
  const weekDates = getWeekDates();

  // Filter schedules to the currently visible week
  const schedulesInWeek = schedules.filter(s => {
    const d = new Date(s.start_time);
    return d >= weekDates[0] && d < new Date(weekDates[6].getTime() + 86400000);
  });

  // Group by day index (0=Mon…6=Sun)
  const byDay: Record<number, typeof schedules> = {};
  for (let i = 0; i < 7; i++) byDay[i] = [];
  schedulesInWeek.forEach(s => {
    const d = new Date(s.start_time);
    let idx = d.getDay() - 1; // Mon=0
    if (idx < 0) idx = 6; // Sun
    byDay[idx].push(s);
  });

  const formatWeekLabel = () => {
    const s = weekDates[0];
    const e = weekDates[6];
    return `${s.getMonth() + 1}/${s.getDate()} — ${e.getMonth() + 1}/${e.getDate()}`;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatHour = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const getDuration = (start: string, end: string) => {
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
    return `${diff}h`;
  };

  return (
    <div className="tabpage active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>
            <IconCalendarPlus size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            辅导排课管理
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
            发起 1v1 辅导课申请，审批通过后自动扣减课时账户余额
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
          <IconPlus size={16} style={{ marginRight: 4 }} /> 新建排课申请
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        <div className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
          待审批 {pendingSchedules.length > 0 && <span style={{ background: 'var(--color-danger)', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: 11, marginLeft: 6 }}>{pendingSchedules.length}</span>}
        </div>
        <div className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>已审批课表</div>
      </div>

      {/* Pending approval list */}
      {activeTab === 'pending' && (
        <div>
          {pendingSchedules.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)' }}>
              <IconCheck size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div>暂无待审批排课申请</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingSchedules.map(s => (
                <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px' }}>
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>学生</div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        <IconUser size={13} style={{ verticalAlign: 'middle', marginRight: 4, color: 'var(--color-primary)' }} />
                        {(s.student as any)?.full_name || '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>辅导老师</div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{(s.tutor as any)?.full_name || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>课程 / 科目</div>
                      <div style={{ fontSize: 14 }}>
                        <IconBook size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {s.subject_label || (s.course as any)?.name || '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 2 }}>时间 / 时长</div>
                      <div style={{ fontSize: 14 }}>
                        <IconClock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {formatTime(s.start_time)} · {getDuration(s.start_time, s.end_time)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '6px 16px', minHeight: 0 }}
                      onClick={() => handleApprove(s.id, (s.student as any)?.full_name || '')}
                    >
                      <IconCheck size={14} style={{ marginRight: 4 }} /> 通过
                    </button>
                    <button
                      className="btn"
                      style={{ padding: '6px 14px', minHeight: 0, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                      onClick={() => handleReject(s.id)}
                    >
                      <IconX size={14} style={{ marginRight: 4 }} /> 拒绝
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly calendar view for confirmed schedules */}
      {activeTab === 'all' && (
        <div>
          {/* Week navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button className="btn" style={{ padding: '4px 12px', minHeight: 0 }} onClick={() => setWeekOffset(w => w - 1)}>← 上一周</button>
            <span style={{ fontWeight: 600, fontSize: 14, minWidth: 130, textAlign: 'center' }}>{formatWeekLabel()}</span>
            <button className="btn" style={{ padding: '4px 12px', minHeight: 0 }} onClick={() => setWeekOffset(w => w + 1)}>下一周 →</button>
            {weekOffset !== 0 && (
              <button className="btn" style={{ padding: '4px 10px', minHeight: 0, fontSize: 12 }} onClick={() => setWeekOffset(0)}>回到本周</button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-tertiary)' }}>共 {schedulesInWeek.length} 节课</span>
          </div>

          {/* 7-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {weekDates.map((date, idx) => {
              const isToday = date.toDateString() === new Date().toDateString();
              const daySessions = byDay[idx] || [];
              return (
                <div key={idx} style={{
                  background: 'var(--color-bg)',
                  border: isToday ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: 8,
                  minHeight: 160
                }}>
                  <div style={{
                    textAlign: 'center',
                    marginBottom: 8,
                    fontSize: 12,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                  }}>
                    {DAY_NAMES[idx + 1]}<br />
                    <span style={{ fontSize: 11, opacity: 0.7 }}>{date.getMonth() + 1}/{date.getDate()}</span>
                  </div>
                  {daySessions.length === 0 ? (
                    <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-tertiary)', paddingTop: 16 }}>—</div>
                  ) : (
                    daySessions.map(s => (
                      <div key={s.id} style={{
                        background: s.status === 'completed' ? 'var(--color-success-bg, #f0fdf4)' : 'var(--color-primary-bg, #eff6ff)',
                        borderLeft: `3px solid ${s.status === 'completed' ? 'var(--color-success, #22c55e)' : 'var(--color-primary)'}`,
                        borderRadius: 4,
                        padding: '5px 7px',
                        marginBottom: 6,
                        fontSize: 11,
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{(s.student as any)?.full_name}</div>
                        <div style={{ color: 'var(--color-text-secondary)' }}>{s.subject_label || (s.course as any)?.name}</div>
                        <div style={{ color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                          {formatHour(s.start_time)} – {formatHour(s.end_time)}
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 10 }}>👨‍🏫 {(s.tutor as any)?.full_name}</div>
                        <div style={{ marginTop: 4 }}>
                          {s.material_url ? (
                            <span className="link" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 2 }} onClick={() => openMaterial(s.material_url)}>
                              <IconPaperclip size={10} /> 查看课件
                            </span>
                          ) : (
                            <FileUploadButton
                              bucket="materials"
                              prefix={`${s.id}`}
                              label="课件"
                              className="btn-tiny"
                              onUploaded={async ({ key }) => { await attachMaterial(s.id, key); }}
                            />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>

          {schedules.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)' }}>暂无已审批排课记录</div>
          )}
        </div>
      )}

      {/* Create Schedule Modal */}
      <Modal
        title="新建 1v1 辅导排课申请"
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={isLoading}
        width={580}
        okText="提交申请"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>

          <div style={{ display: 'flex', gap: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">学生</label>
              <select className="input" value={formData.student_id} onChange={e => setFormData({ ...formData, student_id: e.target.value })}>
                <option value="">-- 选择学生 --</option>
                {students.map(s => <option key={s.student_id} value={s.student_id}>{s.profiles?.full_name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">辅导老师</label>
              <select className="input" value={formData.tutor_id} onChange={e => setFormData({ ...formData, tutor_id: e.target.value })}>
                <option value="">-- 选择老师 --</option>
                {tutors.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">辅导课程</label>
            <select className="input" value={formData.course_id} onChange={e => setFormData({ ...formData, course_id: e.target.value })}>
              <option value="">-- 选择课程 --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
            </select>
            {remainingHours !== null && (
              <div style={{ marginTop: 6, fontSize: 12, color: remainingHours <= 2 ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                该学生此课程剩余课时：<strong>{remainingHours} 小时</strong>
              </div>
            )}
            {formData.student_id && formData.course_id && remainingHours === null && (
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-danger)' }}>
                ⚠️ 该学生此课程暂无课时账户，请先充值
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div className="form-group" style={{ flex: 1.5 }}>
              <label className="form-label">上课日期</label>
              <input className="input" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">开始时间</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select className="input" value={formData.start_hour} onChange={e => setFormData({ ...formData, start_hour: e.target.value })}>
                  {Array.from({ length: 14 }, (_, i) => i + 7).map(h => (
                    <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}:00</option>
                  ))}
                </select>
                <select className="input" value={formData.start_min} onChange={e => setFormData({ ...formData, start_min: e.target.value })}>
                  {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">课时时长</label>
              <select className="input" value={formData.duration_hours} onChange={e => setFormData({ ...formData, duration_hours: e.target.value })}>
                <option value="0.5">0.5 小时</option>
                <option value="1">1 小时</option>
                <option value="1.5">1.5 小时</option>
                <option value="2">2 小时</option>
                <option value="2.5">2.5 小时</option>
                <option value="3">3 小时</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
