import { useState, useEffect, useMemo } from 'react';
import { 
  IconBook, IconPlus, IconX, IconLoader2 
} from '@tabler/icons-react';
import { message, Input, Select } from 'antd';
import { useAcademicStore } from '../../store/useAcademicStore';
import EnrollmentModal from './EnrollmentModal';
import TimetableEditor from './TimetableEditor';
import SubjectManagement from './SubjectManagement';
import MilestoneManagement from './MilestoneManagement';
import CourseHoursManagement from './CourseHoursManagement';
import GradeRecordsManagement from './GradeRecordsManagement';
import TutorScheduleManagement from './TutorScheduleManagement';

export default function AcademicTrack() {
  const [activeTab, setActiveTab] = useState('enrollment');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [eSearch, setESearch] = useState('');
  const [eProgram, setEProgram] = useState<string | undefined>();

  const { 
    enrollments, selections, timetable, programSubjects, isLoading,
    fetchProgramsAndSubjects, fetchEnrollments, fetchTimetable,
    addElective, removeElective,  backfillCoreSubjects
  } = useAcademicStore();

  const handleBackfillCore = async (enrollment: any) => {
    const res = await backfillCoreSubjects(enrollment.id, enrollment.program_id);
    if (res.noCore) { message.warning('该项目未配置必修(core)科目——请先到「科目底表管理」把 EAP 设为必修'); return; }
    if (!res.ok) { message.error('补齐失败'); return; }
    message.success(res.added > 0 ? `已补齐 ${res.added} 门必修` : '必修已齐全');
  };

  useEffect(() => {
    fetchProgramsAndSubjects();
    fetchEnrollments();
    fetchTimetable();
  }, [fetchProgramsAndSubjects, fetchEnrollments, fetchTimetable]);

  // 本页管学校课表 → 每个学生只显示「当前/最近未来」那个阶段（与学生列表口径一致），
  // 不把以后才开学的阶段（如已升的奥大）也列出来。
  const currentEnrollments = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const byStart = (a: any, b: any) => (a.start_date || '').localeCompare(b.start_date || '');
    const byStudent: Record<string, any[]> = {};
    for (const e of enrollments) {
      if (!e.student_id) continue;
      (byStudent[e.student_id] ||= []).push(e);
    }
    return Object.values(byStudent).map(list => {
      const pool = list.filter(e => e.status !== 'withdrawn');
      const usable = pool.length ? pool : list;
      const inRange = usable.filter(e => e.status !== 'completed' && (!e.start_date || e.start_date <= today) && (!e.end_date || today <= e.end_date));
      const upcoming = usable.filter(e => e.status !== 'completed' && e.start_date && e.start_date > today);
      return inRange.length ? inRange.slice().sort(byStart).reverse()[0]
        : upcoming.length ? upcoming.slice().sort(byStart)[0]
        : usable.slice().sort(byStart).reverse()[0];
    });
  }, [enrollments]);

  const programOptions = useMemo(
    () => [...new Set(currentEnrollments.map((e: any) => e.programs?.name).filter(Boolean))].sort(),
    [currentEnrollments]
  );

  const filteredEnrollments = useMemo(() => {
    const kw = eSearch.trim();
    return currentEnrollments.filter((e: any) => {
      const matchKw = !kw || (e.profiles?.full_name || '').includes(kw);
      const matchProg = !eProgram || e.programs?.name === eProgram;
      return matchKw && matchProg;
    });
  }, [currentEnrollments, eSearch, eProgram]);

  const handleAddElective = async (enrollmentId: number) => {
    if (!selectedSubject) return;
    const success = await addElective(enrollmentId, parseInt(selectedSubject));
    if (success) {
      setSelectedSubject('');
    }
  };

  // 课表逐人手排，编辑器里一节一节增删改
  const [ttFor, setTtFor] = useState<any | null>(null);

  return (
    <>
      <div className="tab-bar">
        <div className={`tab ${activeTab === 'enrollment' ? 'active' : ''}`} onClick={() => setActiveTab('enrollment')}>选课与建档</div>
        <div className={`tab ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>科目底表管理</div>
        <div className={`tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>辅导排课</div>
        <div className={`tab ${activeTab === 'hours' ? 'active' : ''}`} onClick={() => setActiveTab('hours')}>课时管理</div>
        <div className={`tab ${activeTab === 'grades' ? 'active' : ''}`} onClick={() => setActiveTab('grades')}>成绩单</div>
        <div className={`tab ${activeTab === 'milestones' ? 'active' : ''}`} onClick={() => setActiveTab('milestones')}>学业里程碑</div>
      </div>

      {activeTab === 'enrollment' && (
        <div className="tabpage active">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, marginBottom: 4 }}><IconBook size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> 教务选课与建档</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>为新生建立项目档案，配置必修与选修科目；预科阶段可再生成课表（大学阶段只记选课与节点）</p>
            </div>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <IconPlus size={16} style={{ marginRight: 4 }} /> 新建学生报名档案
            </button>
          </div>

          {/* 搜索 + 阶段筛选 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <Input allowClear placeholder="搜索学生姓名" value={eSearch} onChange={e => setESearch(e.target.value)} style={{ width: 220 }} />
            <Select allowClear placeholder="按阶段筛选" value={eProgram} onChange={v => setEProgram(v)} style={{ width: 200 }}
              options={programOptions.map(p => ({ label: p, value: p }))} />
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>共 {filteredEnrollments.length} 人</span>
          </div>

          {isLoading && enrollments.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}><IconLoader2 className="spinner" size={24} /></div>
          ) : filteredEnrollments.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>未找到匹配的学生</div>
          ) : (
            <div className="g1">
              {filteredEnrollments.map(enrollment => {
                const enrollmentSelections = selections.filter(s => s.enrollment_id === enrollment.id);
                const coreSubjects = enrollmentSelections.filter(s => s.selection_type === 'core');
                const electiveSubjects = enrollmentSelections.filter(s => s.selection_type === 'elective');
                const availableElectives = programSubjects.filter(
                  ps => ps.subject_category === 'elective' && !enrollmentSelections.find(s => s.program_subject_id === ps.id)
                );

                const hasTimetable = timetable.some(t => t.enrollment_id === enrollment.id);
                // 奥大（大学阶段）只管选课与考核节点，不排课表、不纳入出勤
                const isUniversity = enrollment.programs?.track === 'university';

                return (
                  <div key={enrollment.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-tertiary)', paddingBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar-xs av-blue">{enrollment.profiles?.full_name?.charAt(0) || '?'}</div>
                        <span style={{ fontSize: 16, fontWeight: 600 }}>{enrollment.profiles?.full_name}</span>
                        <span className="pill p-gray">{enrollment.programs?.name}</span>
                        <span className="pill p-green">状态: {enrollment.status}</span>
                      </div>
                      {isUniversity ? (
                        <span className="pill p-gray" title="大学阶段只记录选课与考核节点">本阶段不排课表</span>
                      ) : (
                        <button className="btn btn-primary" onClick={() => setTtFor(enrollment)}>
                          {hasTimetable ? '编辑课表' : '排课表'}
                        </button>
                      )}
                    </div>

                    <div className="g2">
                      <div style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>必修课 (系统自动分配)</span>
                          {coreSubjects.length === 0 && (
                            <span className="link" style={{ fontSize: 12 }} onClick={() => handleBackfillCore(enrollment)}>补齐必修</span>
                          )}
                        </div>
                        {coreSubjects.length === 0 && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>暂无必修（导入/旧报名未分配），点「补齐必修」</div>}
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

                    {/* Timetable visualizer（奥大不显示） */}
                    {hasTimetable && !isUniversity && (
                      <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border-tertiary)', paddingTop: 16 }}>
                        <div style={{ fontWeight: 500, marginBottom: 12 }}>周课表</div>
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

      {ttFor && (
        <TimetableEditor
          open={!!ttFor}
          onClose={() => setTtFor(null)}
          enrollment={ttFor}
          subjectOptions={selections
            .filter(s => s.enrollment_id === ttFor.id && s.status !== 'dropped')
            .map(s => ({
              value: s.program_subject_id,
              label: (Array.isArray(s.program_subjects) ? s.program_subjects[0] : s.program_subjects)?.subject_name || `科目 #${s.program_subject_id}`,
            }))}
        />
      )}

      {activeTab === 'subjects' && <SubjectManagement />}
      {activeTab === 'milestones' && <MilestoneManagement />}
      {activeTab === 'hours' && <CourseHoursManagement />}
      {activeTab === 'grades' && <GradeRecordsManagement />}
      {activeTab === 'schedule' && <TutorScheduleManagement />}

      <EnrollmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
