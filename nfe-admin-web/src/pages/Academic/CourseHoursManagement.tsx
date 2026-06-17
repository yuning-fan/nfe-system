import { useState, useEffect } from 'react';
import { useAcademicStore } from '../../store/useAcademicStore';
import { useStudentStore } from '../../store/useStudentStore';
import { IconWallet, IconPlus } from '@tabler/icons-react';
import { Modal, message } from 'antd';

export default function CourseHoursManagement() {
  const { courseAssets, courses, fetchCourseAssets, fetchCourses, topUpHours, isLoading } = useAcademicStore();
  const { students, fetchStudents } = useStudentStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '',
    course_id: '',
    hours: 10
  });

  useEffect(() => {
    fetchCourseAssets();
    fetchCourses();
    fetchStudents();
  }, [fetchCourseAssets, fetchCourses, fetchStudents]);

  const handleTopUp = async () => {
    if (!formData.student_id || !formData.course_id || !formData.hours) {
      message.error('请填写完整必填项');
      return;
    }
    const success = await topUpHours(formData.student_id, parseInt(formData.course_id), Number(formData.hours));
    if (success) {
      message.success('充值成功');
      setIsModalOpen(false);
    }
  };

  return (
    <div className="tabpage active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}><IconWallet size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> 课时管理账本 (Course Assets)</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>管理学生在各门辅导课（1v1/班课）的剩余可用课时</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <IconPlus size={16} style={{ marginRight: 4 }} /> 课时充值 / 录入
        </button>
      </div>

      <div className="card">
        <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              <th style={{ padding: '12px 8px' }}>学生姓名</th>
              <th style={{ padding: '12px 8px' }}>辅导课程</th>
              <th style={{ padding: '12px 8px' }}>总课时</th>
              <th style={{ padding: '12px 8px' }}>已用课时</th>
              <th style={{ padding: '12px 8px' }}>剩余课时</th>
            </tr>
          </thead>
          <tbody>
            {courseAssets.map(asset => {
              const remaining = Number(asset.total_hours) - Number(asset.used_hours);
              return (
                <tr key={asset.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                  <td style={{ padding: '12px 8px', fontWeight: 500 }}>{asset.profiles?.full_name || '—'}</td>
                  <td style={{ padding: '12px 8px' }}>{asset.courses?.name || '—'}</td>
                  <td style={{ padding: '12px 8px' }}>{asset.total_hours}</td>
                  <td style={{ padding: '12px 8px' }}>{asset.used_hours}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span className={`pill ${remaining <= 5 ? 'p-red' : 'p-green'}`}>
                      {remaining} 小时
                    </span>
                  </td>
                </tr>
              );
            })}
            {courseAssets.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
                  暂无课时记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        title="课时充值"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleTopUp}
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
          
          <div className="form-group">
            <label className="form-label">选择辅导课 (Course)</label>
            <select className="input" value={formData.course_id} onChange={e => setFormData({ ...formData, course_id: e.target.value })}>
              <option value="">-- 选择课程 --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">充值课时数 (小时)</label>
            <input className="input" type="number" step="0.5" value={formData.hours} onChange={e => setFormData({ ...formData, hours: e.target.value as any })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
