import { useEffect, useState } from 'react';
import { useDailyCheckStore, type DailyCheckStatus } from '../../store/useDailyCheckStore';
import { IconBuilding, IconCheck, IconX, IconMoonStars } from '@tabler/icons-react';
import { message } from 'antd';

export default function DormCheck() {
  const { dormStudents, loadDormStudents, submitDormChecks, isLoading } = useDailyCheckStore();
  const [attendance, setAttendance] = useState<Record<string, { status: DailyCheckStatus; notes: string }>>({});

  useEffect(() => {
    loadDormStudents();
  }, [loadDormStudents]);

  // Initialize attendance state when dormStudents load
  useEffect(() => {
    if (dormStudents.length > 0 && Object.keys(attendance).length === 0) {
      const initial: Record<string, { status: DailyCheckStatus; notes: string }> = {};
      dormStudents.forEach(s => {
        initial[s.student_id] = { status: 'present', notes: '' };
      });
      setAttendance(initial);
    }
  }, [dormStudents, attendance]);

  const handleStatusChange = (studentId: string, status: DailyCheckStatus) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes }
    }));
  };

  const handleSubmit = async () => {
    const records = Object.keys(attendance).map(studentId => ({
      student_id: studentId,
      status: attendance[studentId].status,
      notes: attendance[studentId].notes
    }));
    
    const success = await submitDormChecks(records);
    if (success) {
      message.success('查寝打卡成功提交！');
    } else {
      message.error('提交失败，请重试');
    }
  };

  if (isLoading && dormStudents.length === 0) {
    return <div style={{ padding: 20 }}>加载中...</div>;
  }

  // Group by building
  const grouped = dormStudents.reduce((acc, student) => {
    const b = student.dorms?.building_name || '未分配';
    if (!acc[b]) acc[b] = [];
    acc[b].push(student);
    return acc;
  }, {} as Record<string, typeof dormStudents>);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2><IconMoonStars size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} /> 住宿查寝</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>请记录所有在宿学生的就寝状态</p>
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading || dormStudents.length === 0}>
          提交查寝记录
        </button>
      </div>

      <div className="g2" style={{ alignItems: 'flex-start' }}>
        {Object.entries(grouped).map(([building, students]) => (
          <div key={building} className="card">
            <div className="card-title">
              <IconBuilding size={18} /> {building}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {students.map(s => {
                const state = attendance[s.student_id] || { status: 'present', notes: '' };
                return (
                  <div key={s.student_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--color-border-tertiary)' }}>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{s.students_info?.profiles?.full_name || '未知学生'}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>房间: {s.dorms?.room_number || '—'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button 
                          className={`btn ${state.status === 'present' ? 'btn-primary' : ''}`}
                          style={{ padding: '4px 10px', fontSize: 12, minHeight: 0 }}
                          onClick={() => handleStatusChange(s.student_id, 'present')}
                        >
                          <IconCheck size={14} style={{ marginRight: 2 }} /> 在宿
                        </button>
                        <button 
                          className={`btn ${state.status === 'absent' ? 'btn-primary' : ''}`}
                          style={{ padding: '4px 10px', fontSize: 12, minHeight: 0, backgroundColor: state.status === 'absent' ? 'var(--color-danger)' : undefined, borderColor: state.status === 'absent' ? 'var(--color-danger)' : undefined }}
                          onClick={() => handleStatusChange(s.student_id, 'absent')}
                        >
                          <IconX size={14} style={{ marginRight: 2 }} /> 缺席
                        </button>
                        <button 
                          className={`btn ${state.status === 'leave' ? 'btn-primary' : ''}`}
                          style={{ padding: '4px 10px', fontSize: 12, minHeight: 0, backgroundColor: state.status === 'leave' ? '#EF9F27' : undefined, borderColor: state.status === 'leave' ? '#EF9F27' : undefined }}
                          onClick={() => handleStatusChange(s.student_id, 'leave')}
                        >
                          请假
                        </button>
                      </div>
                      <input 
                        type="text" 
                        placeholder="备注(如: 晚归/生病)" 
                        value={state.notes}
                        onChange={e => handleNotesChange(s.student_id, e.target.value)}
                        style={{ fontSize: 11, padding: '2px 6px', border: '1px solid var(--color-border)', borderRadius: 4, width: 150 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {dormStudents.length === 0 && !isLoading && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            当前没有正在住宿的学生记录
          </div>
        )}
      </div>
    </div>
  );
}
