import { useState, useEffect } from 'react';
import { IconX, IconLoader2, IconBook } from '@tabler/icons-react';
import { message } from 'antd';
import { supabase } from '../../lib/supabase';
import { getVisibleStudentIds } from '../../lib/guardedStudents';
import { useAuthStore } from '../../store/useAuthStore';
import { useAcademicStore } from '../../store/useAcademicStore';

interface StudentOption {
  student_id: string;
  profiles?: { full_name: string };
}

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EnrollmentModal({ isOpen, onClose }: EnrollmentModalProps) {
  const { programs, createEnrollment, isLoading } = useAcademicStore();
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');

  useEffect(() => {
    if (isOpen) {
      // 名单走共享 roster（已按登录者可见范围收窄），不再自查全表
      getVisibleStudentIds(useAuthStore.getState().profile?.id).then(async visibleIds => {
          let q = supabase.from('students_info').select('student_id, profiles!inner(full_name)');
          if (visibleIds) q = q.in('student_id', visibleIds.length ? visibleIds : ['00000000-0000-0000-0000-000000000000']);
          const { data } = await q;
          const formatted = (data || []).map((s: any) => ({
            ...s,
            profiles: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
          }));
          setStudents(formatted);
          if (formatted.length > 0) setSelectedStudent(formatted[0].student_id);
        });
        
      if (programs.length > 0) {
        setSelectedProgram(programs[0].id.toString());
      }
    }
  }, [isOpen, programs]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedStudent || !selectedProgram) return;
    const success = await createEnrollment(selectedStudent, parseInt(selectedProgram));
    if (success) {
      message.success('新生入学档案建档成功，已自动分配必修课程！');
      onClose();
    } else {
      message.error('建档失败，请重试');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="card" style={{ width: 400, margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 600 }}>
            <IconBook size={24} style={{ color: 'var(--color-primary)' }} />
            新建学生项目报名
          </div>
          <button className="btn" onClick={onClose} style={{ padding: 4, border: 'none' }}>
            <IconX size={20} />
          </button>
        </div>

        <div className="g3">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="field-k">选择学生</span>
            <select 
              className="btn" 
              style={{ width: '100%', textAlign: 'left', background: 'var(--color-bg-secondary)' }}
              value={selectedStudent}
              onChange={e => setSelectedStudent(e.target.value)}
            >
              {students.map(s => (
                <option key={s.student_id} value={s.student_id}>{s.profiles?.full_name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="field-k">报读项目</span>
            <select 
              className="btn" 
              style={{ width: '100%', textAlign: 'left', background: 'var(--color-bg-secondary)' }}
              value={selectedProgram}
              onChange={e => setSelectedProgram(e.target.value)}
            >
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button className="btn" onClick={onClose} disabled={isLoading}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? <IconLoader2 size={16} className="spinner" /> : '确认建档'}
          </button>
        </div>
      </div>
    </div>
  );
}
