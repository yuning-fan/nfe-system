import { useState, useEffect } from 'react';
import { Modal, Form, Select, DatePicker, message } from 'antd';
import { supabase } from '../../lib/supabase';
import StudentSelect from '../../components/common/StudentSelect';

interface HousingAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableRooms: any[];
  preselectedRoomId?: number | null;
}

export default function HousingAssignmentModal({ isOpen, onClose, onSuccess, availableRooms, preselectedRoomId }: HousingAssignmentModalProps) {
  const [form] = Form.useForm();
  const [students, setStudents] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUnassignedStudents();
      form.resetFields();
      // Pre-select the room if provided
      if (preselectedRoomId != null) {
        form.setFieldValue('dorm_id', preselectedRoomId);
      }
    }
  }, [isOpen, preselectedRoomId]);

  const fetchUnassignedStudents = async () => {
    // Step 1: get all actively-assigned student IDs
    const { data: activeAssignments } = await supabase
      .from('dorm_assignments')
      .select('student_id')
      .eq('is_active', true);
    const assignedIds = activeAssignments?.map((a: any) => a.student_id) || [];

    // Step 2: get ALL student profiles (not limited to students_info rows)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'student');

    // Step 3: filter out already-assigned students in JS
    const unassigned = (profileData || []).filter(
      (p: any) => !assignedIds.includes(p.id)
    );

    // Normalise shape to match what the Select renders: student_id + profiles.full_name
    setStudents(unassigned.map((p: any) => ({ student_id: p.id, profiles: { full_name: p.full_name } })));
  };


  const handleOk = async () => {
    const db = supabase as any;
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);
      
      const { error } = await db.from('dorm_assignments').insert({
        student_id: values.student_id,
        dorm_id: values.dorm_id,
        start_date: values.start_date.format('YYYY-MM-DD'),
        is_active: true
      });
      
      if (error) throw error;
      
      // Update room status to occupied
      await db.from('dorms').update({ room_status: 'occupied' }).eq('id', values.dorm_id);

      message.success('房间分配成功！');
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.errorFields) return; // Validation failed
      message.error(err.message || '分配失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="分配房间"
      open={isOpen}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={isSubmitting}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="student_id" label="选择学生" rules={[{ required: true, message: '请选择学生' }]}>
          <StudentSelect placeholder="搜索并选择无住宿学生"
            options={students.map(s => ({ label: s.profiles?.full_name || '—', value: s.student_id }))} />
        </Form.Item>
        
        <Form.Item name="dorm_id" label="选择房间" rules={[{ required: true, message: '请选择房间' }]}>
          <Select showSearch optionFilterProp="children" placeholder="搜索并选择空置房间">
            {availableRooms.map(r => (
              <Select.Option key={r.id} value={r.id}>
                {r.building_name}{r.unit ? ` ${r.unit}` : ''} - {r.room_number} (容量: {r.capacity})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="start_date" label="入住日期" rules={[{ required: true, message: '请选择入住日期' }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
