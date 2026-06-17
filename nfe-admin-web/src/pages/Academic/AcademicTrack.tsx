import { useState, useEffect } from 'react';
import { 
  IconBook, IconPlus, IconX, IconLoader2 
} from '@tabler/icons-react';
import { message, Modal } from 'antd';
import { useAcademicStore } from '../../store/useAcademicStore';
import EnrollmentModal from './EnrollmentModal';
import SubjectManagement from './SubjectManagement';
import MilestoneManagement from './MilestoneManagement';
import CourseHoursManagement from './CourseHoursManagement';
import GradeRecordsManagement from './GradeRecordsManagement';

export default function AcademicTrack() {
  const [activeTab, setActiveTab] = useState('enrollment');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');

  const { 
    enrollments, selections, timetable, programSubjects, isLoading,
    fetchProgramsAndSubjects, fetchEnrollments, fetchTimetable,
    addElective, removeElective, generateTimetable
  } = useAcademicStore();

  useEffect(() => {
    fetchProgramsAndSubjects();
    fetchEnrollments();
    fetchTimetable();
  }, [fetchProgramsAndSubjects, fetchEnrollments, fetchTimetable]);

  const handleAddElective = async (enrollmentId: number) => {
    if (!selectedSubject) return;
    const success = await addElective(enrollmentId, parseInt(selectedSubject));
    if (success) {
      setSelectedSubject('');
    }
  };

  const handleGenerateTimetable = (enrollmentId: number) => {
    Modal.confirm({
      title: '重新生成课表',
      content: '重新生成课表将覆盖已有课表，确认生成吗？',
      onOk: async () => {
        const success = await generateTimetable(enrollmentId);
        if (success) message.success('课表生成成功！');
      }
    });
  };

  return (
    <>
      <div className="tab-bar">
        <div className={`tab ${activeTab === 'enrollment' ? 'active' : ''}`} onClick={() => setActiveTab('enrollment')}>选课与建档</div>
        <div className={`tab ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>科目底表管理</div>
        <div className={`tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>辅导课表排期</div>
        <div className={`tab ${activeTab === 'approval' ? 'active' : ''}`} onClick={() => setActiveTab('approval')}>排课审批 (3)</div>
        <div className={`tab ${activeTab === 'hours' ? 'active' : ''}`} onClick={() => setActiveTab('hours')}>课时管理</div>
        <div className={`tab ${activeTab === 'grades' ? 'active' : ''}`} onClick={() => setActiveTab('grades')}>成绩单</div>
        <div className={`tab ${activeTab === 'milestones' ? 'active' : ''}`} onClick={() => setActiveTab('milestones')}>学业里程碑</div>
      </div>

      {activeTab === 'enrollment' && (
        <div className="tabpage active">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, marginBottom: 4 }}><IconBook size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> 教务选课与建档</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>为新生建立项目档案，配置必修与选修科目，并一键生成基础课表</p>
            </div>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <IconPlus size={16} style={{ marginRight: 4 }} /> 新建学生报名档案
            </button>
          </div>

          {isLoading && enrollments.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}><IconLoader2 className="spinner" size={24} /></div>
          ) : (
            <div className="g1">
              {enrollments.map(enrollment => {
                const enrollmentSelections = selections.filter(s => s.enrollment_id === enrollment.id);
                const coreSubjects = enrollmentSelections.filter(s => s.selection_type === 'core');
                const electiveSubjects = enrollmentSelections.filter(s => s.selection_type === 'elective');
                const availableElectives = programSubjects.filter(
                  ps => ps.subject_category === 'elective' && !enrollmentSelections.find(s => s.program_subject_id === ps.id)
                );

                const hasTimetable = timetable.some(t => t.enrollment_id === enrollment.id);

                return (
                  <div key={enrollment.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-tertiary)', paddingBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar-xs av-blue">{enrollment.profiles?.full_name?.charAt(0) || '?'}</div>
                        <span style={{ fontSize: 16, fontWeight: 600 }}>{enrollment.profiles?.full_name}</span>
                        <span className="pill p-gray">{enrollment.programs?.name}</span>
                        <span className="pill p-green">状态: {enrollment.status}</span>
                      </div>
                      <button className="btn btn-primary" onClick={() => handleGenerateTimetable(enrollment.id)}>
                        {hasTimetable ? '重新生成奥大课表' : '一键生成奥大课表'}
                      </button>
                    </div>

                    <div className="g2">
                      <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8 }}>
                        <div style={{ fontWeight: 500, marginBottom: 8, color: 'var(--color-text-secondary)' }}>必修课 (系统自动分配)</div>
                        {coreSubjects.map(s => (
                          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                            <span>{s.program_subjects?.subject_name}</span>
                            <span style={{ color: 'var(--color-text-tertiary)' }}>{s.program_subjects?.hours_per_week} 课时/周</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>选修课 ({electiveSubjects.length}/4)</span>
                        </div>
                        {electiveSubjects.map(s => (
                          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                            <span>{s.program_subjects?.subject_name}</span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ color: 'var(--color-text-tertiary)' }}>{s.program_subjects?.hours_per_week} 课时/周</span>
                              <IconX size={14} style={{ cursor: 'pointer', color: 'var(--color-danger)' }} onClick={() => removeElective(s.id)} />
                            </div>
                          </div>
                        ))}
                        {electiveSubjects.length < 4 && availableElectives.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                            <select 
                              className="btn" 
                              style={{ flex: 1, textAlign: 'left', padding: '4px 8px', fontSize: 12 }}
                              value={selectedSubject}
                              onChange={e => setSelectedSubject(e.target.value)}
                            >
                              <option value="">-- 选择选修课 --</option>
                              {availableElectives.map(subj => (
                                <option key={subj.id} value={subj.id}>{subj.subject_name}</option>
                              ))}
                            </select>
                            <button className="btn btn-primary" style={{ padding: '4px 8px', minHeight: 0 }} onClick={() => handleAddElective(enrollment.id)}>
                              添加
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timetable visualizer */}
                    {hasTimetable && (
                      <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border-tertiary)', paddingTop: 16 }}>
                        <div style={{ fontWeight: 500, marginBottom: 12 }}>生成的奥大周课表</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[1,2,3,4,5].map(day => {
                            const dayName = ['周一', '周二', '周三', '周四', '周五'][day - 1];
                            const dayClasses = timetable.filter(t => t.enrollment_id === enrollment.id && t.day_of_week === day).sort((a,b) => a.start_time.localeCompare(b.start_time));
                            return (
                              <div key={day} style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: 6, padding: 8, background: 'var(--color-bg-secondary)' }}>
                                <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{dayName}</div>
                                {dayClasses.length === 0 ? (
                                  <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-tertiary)' }}>无排课</div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {dayClasses.map(c => (
                                      <div key={c.id} style={{ background: 'var(--color-bg)', borderLeft: '3px solid var(--color-primary)', padding: '6px 8px', borderRadius: 4, fontSize: 11 }}>
                                        <div style={{ fontWeight: 500, marginBottom: 2 }}>{c.program_subjects?.subject_name}</div>
                                        <div style={{ color: 'var(--color-text-secondary)' }}>{c.start_time.slice(0,5)} - {c.end_time.slice(0,5)}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {enrollments.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-tertiary)' }}>
                  <IconBook size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                  <div>还没有任何学生报名档案</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'subjects' && <SubjectManagement />}
      {activeTab === 'milestones' && <MilestoneManagement />}
      {activeTab === 'hours' && <CourseHoursManagement />}
      {activeTab === 'grades' && <GradeRecordsManagement />}

      {/* Other tabs placeholder */}
      {activeTab === 'schedule' && (
        <div className="tabpage active">
          <div className="card">
            <div className="card-title">辅导排期 (原型占位)</div>
            <div style={{ color: 'var(--color-text-secondary)' }}>请稍候，我们正在开发排课功能。</div>
          </div>
        </div>
      )}
      
      {activeTab === 'approval' && (
        <div className="tabpage active">
          <div className="card">
            <div className="card-title">排课审批 (原型占位)</div>
            <div style={{ color: 'var(--color-text-secondary)' }}>请稍候，我们正在开发排课审批功能。</div>
          </div>
        </div>
      )}

      <EnrollmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
