import { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, TimePicker, message } from 'antd';
import { supabase } from '../../lib/supabase';
import { useDailyCheckStore } from '../../store/useDailyCheckStore';
import dayjs from 'dayjs';

interface TransportAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransportAssignmentModal({ isOpen, onClose, onSuccess }: TransportAssignmentModalProps) {
  const [form] = Form.useForm();
  const [students, setStudents] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
      form.resetFields();
    }
  }, [isOpen]);

  const fetchStudents = async () => {
    // Get all active students
    const { data } = await supabase
      .from('students_info')
      .select('student_id, profiles(full_name)');
    
    setStudents(data || []);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);
      
      const { error } = await supabase.from('transport_passengers').insert({
        student_id: values.student_id,
        pickup_time: values.pickup_time ? values.pickup_time.format('HH:mm:ss') : null,
        pickup_location: values.pickup_location,
        drop_off_location: values.drop_off_location,
        status: 'pending'
      });
      
      if (error) throw error;
      
      message.success('已成功指派接送任务');
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.errorFields) return; // Validation failed
      message.error(err.message || '指派失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="新增接送/指派乘客"
      open={isOpen}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={isSubmitting}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="student_id" label="选择学生" rules={[{ required: true, message: '请选择学生' }]}>
          <Select showSearch optionFilterProp="children" placeholder="搜索并选择学生">
            {students.map(s => (
              <Select.Option key={s.student_id} value={s.student_id}>
                {s.profiles?.full_name || s.student_id}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item name="pickup_time" label="接送时间" rules={[{ required: true, message: '请选择时间' }]}>
          <TimePicker format="HH:mm" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="pickup_location" label="接车地点" rules={[{ required: true, message: '请输入接车地点' }]}>
          <Input placeholder="例如: 4B Tiverton Road" />
        </Form.Item>

        <Form.Item name="drop_off_location" label="送达地点" rules={[{ required: true, message: '请输入送达地点' }]}>
          <Input placeholder="例如: 奥克兰大学" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
