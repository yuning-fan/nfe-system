import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAcademicStore } from '../../store/useAcademicStore';
import { supabase } from '../../lib/supabase';
import { IconBook, IconPlus, IconEdit, IconTrash, IconDatabase } from '@tabler/icons-react';
import { Modal, message } from 'antd';

export default function SubjectManagement() {
  const { programSubjects, programs, createProgramSubject, updateProgramSubject, deleteProgramSubject, isLoading } = useAcademicStore();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // 资料库各科目资料数量（联动学业跟进）
  const [resCount, setResCount] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from('resources').select('subject');
      const map: Record<string, number> = {};
      (data || []).forEach((r: any) => { if (r.subject) map[r.subject] = (map[r.subject] || 0) + 1; });
      setResCount(map);
    })();
  }, []);
  
  const [formData, setFormData] = useState({
    program_id: '',
    subject_name: '',
    subject_category: 'elective',
    subject_area: 'other',
    difficulty_level: 'standard',
    hours_per_week: 4,
    sessions_per_week: 2,
    max_students: 20,
    year: '',            // 开课学年，奥大 paper 分学期用；预科留空
    semester: ''         // S1 / S2 / SS
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
      year: subject.year ? String(subject.year) : '',
      semester: subject.semester || ''
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
      max_students: Number(formData.max_students),
      year: formData.year ? Number(formData.year) : null,
      semester: formData.semester || null
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
            year: '',
            semester: ''
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
              <th style={{ padding: '12px 8px' }}>学年/学期</th>
              <th style={{ padding: '12px 8px' }}>类型</th>
              <th style={{ padding: '12px 8px' }}>每周课时</th>
              <th style={{ padding: '12px 8px' }}>每周节数</th>
              <th style={{ padding: '12px 8px' }}>相关资料</th>
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
                  <td style={{ padding: '12px 8px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {subject.year || subject.semester ? `${subject.year || ''} ${subject.semester || ''}`.trim() : '—'}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span className={`pill ${subject.subject_category === 'core' ? 'p-red' : 'p-blue'}`}>
                      {subject.subject_category === 'core' ? '必修' : '选修'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px' }}>{subject.hours_per_week}h</td>
                  <td style={{ padding: '12px 8px' }}>{subject.sessions_per_week} 节</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span
                      className="link"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => navigate(`/library?subject=${encodeURIComponent(subject.subject_name)}`)}
                      title="跳转资料库查看该科目资料"
                    >
                      <IconDatabase size={13} /> {resCount[subject.subject_name] || 0} 份
                    </span>
                  </td>
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
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
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
            <input className="input" placeholder="如：EAP、数学-微积分、GEOG 205" value={formData.subject_name} onChange={e => setFormData({ ...formData, subject_name: e.target.value })} />
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">开课学年</label>
              <input className="input" type="number" placeholder="如 2026；不分学期留空" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">开课学期</label>
              <select className="input" value={formData.semester} onChange={e => setFormData({ ...formData, semester: e.target.value })}>
                <option value="">不分学期</option>
                <option value="S1">S1（2–6 月）</option>
                <option value="S2">S2（7–11 月）</option>
                <option value="SS">SS（暑期）</option>
              </select>
            </div>
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

        </div>
      </Modal>
    </div>
  );
}
