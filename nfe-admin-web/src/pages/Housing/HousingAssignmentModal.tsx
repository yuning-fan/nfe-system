import { useState, useEffect } from 'react';
import { Modal, Form, Select, DatePicker, message } from 'antd';
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';

interface HousingAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableRooms: any[];
}

export default function HousingAssignmentModal({ isOpen, onClose, onSuccess, availableRooms }: HousingAssignmentModalProps) {
  const [form] = Form.useForm();
  const [students, setStudents] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUnassignedStudents();
      form.resetFields();
    }
  }, [isOpen]);

  const fetchUnassignedStudents = async () => {
    // get students without active dorm assignments
    const { data: activeAssignments } = await supabase.from('dorm_assignments').select('student_id').eq('is_active', true);
    const assignedIds = activeAssignments?.map(a => a.student_id) || [];
    
    let query = supabase.from('students_info').select('student_id, profiles(full_name)');
    if (assignedIds.length > 0) {
      query = query.not('student_id', 'in', `(${assignedIds.join(',')})`);
    }
    
    const { data } = await query;
    setStudents(data || []);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);
      
      const { error } = await supabase.from('dorm_assignments').insert({
        student_id: values.student_id,
        dorm_id: values.dorm_id,
        start_date: values.start_date.format('YYYY-MM-DD'),
        is_active: true
      });
      
      if (error) throw error;
      
      // Update room status to occupied
      await supabase.from('dorms').update({ room_status: 'occupied' }).eq('id', values.dorm_id);

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
          <Select showSearch optionFilterProp="children" placeholder="搜索并选择无住宿学生">
            {students.map(s => (
              <Select.Option key={s.student_id} value={s.student_id}>
                {s.profiles?.full_name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item name="dorm_id" label="选择房间" rules={[{ required: true, message: '请选择房间' }]}>
          <Select showSearch optionFilterProp="children" placeholder="搜索并选择空置房间">
            {availableRooms.map(r => (
              <Select.Option key={r.id} value={r.id}>
                {r.building_name} - {r.room_number} (容量: {r.capacity})
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
