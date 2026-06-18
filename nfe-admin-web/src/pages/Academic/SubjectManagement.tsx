import { useState } from 'react';
import { useAcademicStore } from '../../store/useAcademicStore';
import { IconBook, IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { Modal, message } from 'antd';

export default function SubjectManagement() {
  const { programSubjects, programs, createProgramSubject, updateProgramSubject, deleteProgramSubject, isLoading } = useAcademicStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    program_id: '',
    subject_name: '',
    subject_category: 'elective',
    subject_area: 'other',
    difficulty_level: 'standard',
    hours_per_week: 4,
    sessions_per_week: 2,
    max_students: 20,
    default_schedule: [] as { day_of_week: number; start_time: string; end_time: string; room: string }[]
  });

  const handleEdit = (subject: any) => {
    setFormData({
      program_id: subject.program_id.toString(),
      subject_name: subject.subject_name,
      subject_category: subject.subject_category,
      subject_area: subject.subject_area,
      difficulty_level: subject.difficulty_level,
      hours_per_week: subject.hours_per_week,
      sessions_per_week: subject.sessions_per_week,
      max_students: subject.max_students || 20,
      default_schedule: subject.default_schedule || []
    });
    setEditingId(subject.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '删除科目',
      content: '确认要删除该科目底表吗？如果有学生已经选了这门课，删除可能会导致报错。',
      okType: 'danger',
      onOk: async () => {
        const success = await deleteProgramSubject(id);
        if (success) message.success('删除成功');
      }
    });
  };

  const handleSubmit = async () => {
    if (!formData.subject_name || !formData.program_id) {
      message.error('请填写完整必填项');
      return;
    }

    const payload = {
      ...formData,
      program_id: parseInt(formData.program_id),
      hours_per_week: Number(formData.hours_per_week),
      sessions_per_week: Number(formData.sessions_per_week),
      max_students: Number(formData.max_students)
    };

    let success;
    if (editingId) {
      success = await updateProgramSubject(editingId, payload);
    } else {
      success = await createProgramSubject(payload);
    }

    if (success) {
      message.success(editingId ? '更新成功' : '创建成功');
      setIsModalOpen(false);
      setEditingId(null);
    }
  };

  return (
    <div className="tabpage active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}><IconBook size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> 科目底表库 (Subjects)</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>管理各个项目下的必修课与选修课底表，供排课与选课使用</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingId(null);
          setFormData({
            program_id: programs[0]?.id.toString() || '',
            subject_name: '',
            subject_category: 'elective',
            subject_area: 'other',
            difficulty_level: 'standard',
            hours_per_week: 4,
            sessions_per_week: 2,
            max_students: 20,
            default_schedule: []
          });
          setIsModalOpen(true);
        }}>
          <IconPlus size={16} style={{ marginRight: 4 }} /> 新增科目
        </button>
      </div>

      <div className="card">
        <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              <th style={{ padding: '12px 8px' }}>所属项目</th>
              <th style={{ padding: '12px 8px' }}>科目名称</th>
              <th style={{ padding: '12px 8px' }}>类型</th>
              <th style={{ padding: '12px 8px' }}>每周课时</th>
              <th style={{ padding: '12px 8px' }}>每周节数</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {programSubjects.map(subject => {
              const programName = programs.find(p => p.id === subject.program_id)?.name;
              return (
                <tr key={subject.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                  <td style={{ padding: '12px 8px' }}>{programName}</td>
                  <td style={{ padding: '12px 8px', fontWeight: 500 }}>{subject.subject_name}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span className={`pill ${subject.subject_category === 'core' ? 'p-red' : 'p-blue'}`}>
                      {subject.subject_category === 'core' ? '必修' : '选修'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px' }}>{subject.hours_per_week}h</td>
                  <td style={{ padding: '12px 8px' }}>{subject.sessions_per_week} 节</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <button className="btn" style={{ padding: '4px 8px', minHeight: 0, marginRight: 8 }} onClick={() => handleEdit(subject)}>
                      <IconEdit size={14} />
                    </button>
                    <button className="btn" style={{ padding: '4px 8px', minHeight: 0, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => handleDelete(subject.id)}>
                      <IconTrash size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {programSubjects.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
                  暂无科目数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        title={editingId ? '编辑科目' : '新增科目'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isLoading}
        width={500}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <div className="form-group">
            <label className="form-label">所属项目</label>
            <select className="input" value={formData.program_id} onChange={e => setFormData({ ...formData, program_id: e.target.value })}>
              <option value="">-- 选择项目 --</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">科目名称</label>
            <input className="input" placeholder="如：EAP, 数学-微积分" value={formData.subject_name} onChange={e => setFormData({ ...formData, subject_name: e.target.value })} />
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">类型 (必修/选修)</label>
              <select className="input" value={formData.subject_category} onChange={e => setFormData({ ...formData, subject_category: e.target.value })}>
                <option value="core">必修课 (Core)</option>
                <option value="elective">选修课 (Elective)</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">学科领域</label>
              <select className="input" value={formData.subject_area} onChange={e => setFormData({ ...formData, subject_area: e.target.value })}>
                <option value="english">英语 (English)</option>
                <option value="science">科学 (Science)</option>
                <option value="commerce">商科 (Commerce)</option>
                <option value="arts">文科 (Arts)</option>
                <option value="other">其他 (Other)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">每周课时总长</label>
              <input className="input" type="number" step="0.5" value={formData.hours_per_week} onChange={e => setFormData({ ...formData, hours_per_week: e.target.value as any })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">每周节数</label>
              <input className="input" type="number" value={formData.sessions_per_week} onChange={e => setFormData({ ...formData, sessions_per_week: e.target.value as any })} />
            </div>
          </div>

          <div style={{ marginTop: 8, padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>固定上课排期 (用于自动生成课表)</label>
              <button 
                className="btn btn-primary" 
                style={{ padding: '2px 8px', fontSize: 12, minHeight: 24 }}
                onClick={() => setFormData({ ...formData, default_schedule: [...formData.default_schedule, { day_of_week: 1, start_time: '09:00', end_time: '11:00', room: '' }] })}
              >
                <IconPlus size={12} /> 添加排期
              </button>
            </div>
            {formData.default_schedule.map((schedule, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <select 
                  className="input" 
                  style={{ flex: 1 }}
                  value={schedule.day_of_week} 
                  onChange={e => {
                    const newSchedule = [...formData.default_schedule];
                    newSchedule[idx].day_of_week = parseInt(e.target.value);
                    setFormData({ ...formData, default_schedule: newSchedule });
                  }}
                >
                  <option value={1}>周一</option>
                  <option value={2}>周二</option>
                  <option value={3}>周三</option>
                  <option value={4}>周四</option>
                  <option value={5}>周五</option>
                </select>
                <input 
                  className="input" type="time" style={{ width: 100 }}
                  value={schedule.start_time} 
                  onChange={e => {
                    const newSchedule = [...formData.default_schedule];
                    newSchedule[idx].start_time = e.target.value;
                    setFormData({ ...formData, default_schedule: newSchedule });
                  }} 
                />
                <span>-</span>
                <input 
                  className="input" type="time" style={{ width: 100 }}
                  value={schedule.end_time} 
                  onChange={e => {
                    const newSchedule = [...formData.default_schedule];
                    newSchedule[idx].end_time = e.target.value;
                    setFormData({ ...formData, default_schedule: newSchedule });
                  }} 
                />
                <IconTrash 
                  size={16} 
                  style={{ color: 'var(--color-danger)', cursor: 'pointer' }} 
                  onClick={() => {
                    const newSchedule = formData.default_schedule.filter((_, i) => i !== idx);
                    setFormData({ ...formData, default_schedule: newSchedule });
                  }} 
                />
              </div>
            ))}
            {formData.default_schedule.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '10px 0' }}>无固定排期</div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
