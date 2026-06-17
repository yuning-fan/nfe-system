import { useState, useEffect } from 'react';
import { useAcademicStore } from '../../store/useAcademicStore';
import { IconTarget, IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { Modal, message } from 'antd';

export default function MilestoneManagement() {
  const { milestones, programSubjects, fetchMilestones, createMilestone, deleteMilestone, isLoading } = useAcademicStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    program_subject_id: '',
    milestone_type: 'exam',
    title: '',
    due_date: ''
  });

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '删除学术节点',
      content: '确认要删除该学术节点吗？这会影响关联此节点的所有考评记录。',
      okType: 'danger',
      onOk: async () => {
        const success = await deleteMilestone(id);
        if (success) message.success('删除成功');
      }
    });
  };

  const handleSubmit = async () => {
    if (!formData.program_subject_id || !formData.title || !formData.due_date) {
      message.error('请填写完整必填项');
      return;
    }

    const payload = {
      ...formData,
      program_subject_id: parseInt(formData.program_subject_id),
      is_grade_recorded: false
    };

    const success = await createMilestone(payload as any);
    if (success) {
      message.success('创建成功');
      setIsModalOpen(false);
    }
  };

  return (
    <div className="tabpage active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 4 }}><IconTarget size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> 学业里程碑配置 (Milestones)</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>全局配置各科目的重要时间节点（如期中考、大作业提交日），系统将自动同步给选修该课的学生</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setFormData({
            program_subject_id: programSubjects[0]?.id.toString() || '',
            milestone_type: 'exam',
            title: '',
            due_date: ''
          });
          setIsModalOpen(true);
        }}>
          <IconPlus size={16} style={{ marginRight: 4 }} /> 新增节点
        </button>
      </div>

      <div className="card">
        <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              <th style={{ padding: '12px 8px' }}>关联科目</th>
              <th style={{ padding: '12px 8px' }}>节点名称</th>
              <th style={{ padding: '12px 8px' }}>类型</th>
              <th style={{ padding: '12px 8px' }}>截止/考试日期</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map(m => {
              let typeLabel = '';
              let typeClass = '';
              if (m.milestone_type === 'exam') { typeLabel = '考试'; typeClass = 'p-red'; }
              else if (m.milestone_type === 'assignment') { typeLabel = '作业/论文'; typeClass = 'p-amber'; }
              else { typeLabel = '其他报告'; typeClass = 'p-blue'; }

              return (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                  <td style={{ padding: '12px 8px' }}>{m.program_subjects?.subject_name || '—'}</td>
                  <td style={{ padding: '12px 8px', fontWeight: 500 }}>{m.title}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span className={`pill ${typeClass}`}>{typeLabel}</span>
                  </td>
                  <td style={{ padding: '12px 8px' }}>{m.due_date}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <button className="btn" style={{ padding: '4px 8px', minHeight: 0, color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => handleDelete(m.id)}>
                      <IconTrash size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {milestones.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
                  暂无学业里程碑
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        title="新增学业节点"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={isLoading}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <div className="form-group">
            <label className="form-label">关联科目 (奥大选修课/EAP)</label>
            <select className="input" value={formData.program_subject_id} onChange={e => setFormData({ ...formData, program_subject_id: e.target.value })}>
              <option value="">-- 选择科目 --</option>
              {programSubjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">节点名称</label>
            <input className="input" placeholder="如：Mid-term Exam, Essay 1" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="form-group">
            <label className="form-label">节点类型</label>
            <select className="input" value={formData.milestone_type} onChange={e => setFormData({ ...formData, milestone_type: e.target.value })}>
              <option value="exam">考试 (Exam)</option>
              <option value="assignment">作业/论文 (Assignment)</option>
              <option value="report_due">报告 (Report)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">日期</label>
            <input className="input" type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
