import { useState, useEffect } from 'react';
import { useAcademicStore } from '../../store/useAcademicStore';
import { useStudentStore } from '../../store/useStudentStore';
import { IconReportAnalytics, IconPlus } from '@tabler/icons-react';
import { Modal, message } from 'antd';

export default function GradeRecordsManagement() {
  const { gradeRecords, fetchGradeRecords, addGradeRecord, courses, programSubjects, milestones, fetchCourses, fetchProgramsAndSubjects, fetchMilestones, isLoading } = useAcademicStore();
  const { students, fetchStudents } = useStudentStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    subject_type: 'program_subject', // 'program_subject' or 'course'
    program_subject_id: '',
    course_id: '',
    milestone_id: '',
    score: '',
    score_type: 'midterm'
  });

  useEffect(() => {
    fetchGradeRecords();
    fetchStudents();
    fetchCourses();
    fetchProgramsAndSubjects();
    fetchMilestones();
  }, [fetchGradeRecords, fetchStudents, fetchCourses, fetchProgramsAndSubjects, fetchMilestones]);

  const handleAddGrade = async () => {
    if (!formData.student_id || !formData.score || !formData.score_type) {
      message.error('请填写必要项 (学生, 分数, 考试类型)');
      return;
    }

    const payload: any = {
      student_id: formData.student_id,
      score: Number(formData.score),
      score_type: formData.score_type,
    };

    if (formData.subject_type === 'program_subject' && formData.program_subject_id) {
      payload.program_subject_id = parseInt(formData.program_subject_id);
    } else if (formData.subject_type === 'course' && formData.course_id) {
      payload.course_id = parseInt(formData.course_id);
    }

    if (formData.milestone_id) {
      payload.milestone_id = parseInt(formData.milestone_id);
    }

    const success = await addGradeRecord(payload);
    if (success) {
      message.success('录入成功');
      setIsModalOpen(false);
    }
  };

  return (
    <div className="tabpage active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}><IconReportAnalytics size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> 成绩与提分记录 (Grades)</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>录入学生的阶段性成绩，追踪提分效果</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <IconPlus size={16} style={{ marginRight: 4 }} /> 录入新成绩
        </button>
      </div>

      <div className="card">
        <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              <th style={{ padding: '12px 8px' }}>学生姓名</th>
              <th style={{ padding: '12px 8px' }}>关联科目/课程</th>
              <th style={{ padding: '12px 8px' }}>关联里程碑</th>
              <th style={{ padding: '12px 8px' }}>考试类型</th>
              <th style={{ padding: '12px 8px' }}>分数</th>
              <th style={{ padding: '12px 8px' }}>录入时间</th>
            </tr>
          </thead>
          <tbody>
            {gradeRecords.map(r => {
              const subjectName = r.program_subjects?.subject_name || r.courses?.name || '—';
              let typeLabel = '';
              if (r.score_type === 'midterm') typeLabel = '期中';
              else if (r.score_type === 'final') typeLabel = '期末';
              else typeLabel = '日常测验';

              return (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                  <td style={{ padding: '12px 8px', fontWeight: 500 }}>{r.profiles?.full_name || '—'}</td>
                  <td style={{ padding: '12px 8px' }}>{subjectName}</td>
                  <td style={{ padding: '12px 8px' }}>{r.academic_milestones?.title || '—'}</td>
                  <td style={{ padding: '12px 8px' }}>{typeLabel}</td>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{r.score}</td>
                  <td style={{ padding: '12px 8px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{new Date(r.recorded_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {gradeRecords.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
                  暂无成绩记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        title="录入成绩"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleAddGrade}
        confirmLoading={isLoading}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <div className="form-group">
            <label className="form-label">选择学生</label>
            <select className="input" value={formData.student_id} onChange={e => setFormData({ ...formData, student_id: e.target.value })}>
              <option value="">-- 选择学生 --</option>
              {students.map(s => <option key={s.student_id} value={s.student_id}>{s.profiles?.full_name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">科目体系</label>
              <select className="input" value={formData.subject_type} onChange={e => setFormData({ ...formData, subject_type: e.target.value })}>
                <option value="program_subject">奥大选修课 / EAP</option>
                <option value="course">机构辅导课</option>
              </select>
            </div>

            {formData.subject_type === 'program_subject' ? (
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">选择奥大科目</label>
                <select className="input" value={formData.program_subject_id} onChange={e => setFormData({ ...formData, program_subject_id: e.target.value })}>
                  <option value="">-- 可选 --</option>
                  {programSubjects.map(p => <option key={p.id} value={p.id}>{p.subject_name}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">选择机构辅导课</label>
                <select className="input" value={formData.course_id} onChange={e => setFormData({ ...formData, course_id: e.target.value })}>
                  <option value="">-- 可选 --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">关联里程碑节点 (可选)</label>
            <select className="input" value={formData.milestone_id} onChange={e => setFormData({ ...formData, milestone_id: e.target.value })}>
              <option value="">-- 不关联 --</option>
              {milestones.map(m => <option key={m.id} value={m.id}>{m.title} ({m.due_date})</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">考试类型</label>
              <select className="input" value={formData.score_type} onChange={e => setFormData({ ...formData, score_type: e.target.value })}>
                <option value="daily">日常测验 / 作业</option>
                <option value="midterm">期中考试</option>
                <option value="final">期末考试</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">分数</label>
              <input className="input" type="number" step="0.1" value={formData.score} onChange={e => setFormData({ ...formData, score: e.target.value })} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
