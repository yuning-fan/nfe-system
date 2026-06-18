import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  IconPlus, IconLoader2, IconMessage2,
  IconPhone, IconMail, IconBrandWechat, IconNotes, IconUsers
} from '@tabler/icons-react';

interface Student {
  student_id: string;
  profiles: { full_name: string } | Array<{ full_name: string }>;
}

interface CommLog {
  id: number;
  student_id: string;
  contact_party: string;
  channel: string;
  content: string;
  created_at: string;
  staff_id: string;
  profiles?: { full_name: string };
}

const partyConfig: Record<string, { label: string; cls: string }> = {
  parent:   { label: '家长', cls: 'p-red' },
  school:   { label: '学校', cls: 'p-blue' },
  student:  { label: '学生', cls: 'p-gray' },
  housing:  { label: '住宿方', cls: 'p-amber' },
  guardian: { label: '监护人', cls: 'p-purple' },
};

const channelConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  phone:   { label: '电话沟通', icon: <IconPhone size={12} /> },
  email:   { label: '邮件', icon: <IconMail size={12} /> },
  wechat:  { label: '微信沟通', icon: <IconBrandWechat size={12} /> },
  meeting: { label: '面谈', icon: <IconUsers size={12} /> },
  note:    { label: '备注', icon: <IconNotes size={12} /> },
};

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const hhmm = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  if (diff === 0) return `今天 ${hhmm}`;
  if (diff === 1) return `昨天 ${hhmm}`;
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

// Mock data since communication_logs is empty
const MOCK_LOGS: Record<string, CommLog[]> = {
  '占小诺': [
    { id: 1, student_id: '', contact_party: 'parent', channel: 'phone', content: '与家长通话，告知学生本学期开学适应情况良好，成绩稳定。家长表示满意。', created_at: new Date(Date.now() - 2 * 3600000).toISOString(), staff_id: '', profiles: { full_name: '王老师' } },
    { id: 2, student_id: '', contact_party: 'student', channel: 'wechat', content: '微信提醒明天有重要考试，建议提前复习英语词汇。', created_at: new Date(Date.now() - 86400000).toISOString(), staff_id: '', profiles: { full_name: '陈老师' } },
  ],
  '吴奕辉': [
    { id: 3, student_id: '', contact_party: 'school', channel: 'email', content: '收到学校班主任邮件，确认学生本周出勤情况正常，课堂表现积极。', created_at: new Date(Date.now() - 3 * 86400000).toISOString(), staff_id: '', profiles: { full_name: '王老师' } },
  ],
};

export default function Communications() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [logs, setLogs] = useState<CommLog[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStudents() {
      const { data } = await supabase
        .from('students_info')
        .select('student_id, profiles(full_name)')
        .order('student_id');
      const list = (data as Student[]) || [];
      setStudents(list);
      if (list.length > 0) setSelectedStudent(list[0]);
      setIsLoading(false);
    }
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    const profile = Array.isArray(selectedStudent.profiles) ? selectedStudent.profiles[0] : selectedStudent.profiles;
    const name = profile?.full_name || '';
    // Try fetching from DB first; fall back to mock
    async function fetchLogs() {
      const { data } = await supabase
        .from('communication_logs')
        .select('*, profiles!communication_logs_staff_id_fkey(full_name)')
        .eq('student_id', selectedStudent!.student_id)
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setLogs(data as unknown as CommLog[]);
      } else {
        setLogs(MOCK_LOGS[name] || []);
      }
    }
    fetchLogs();
  }, [selectedStudent]);

  const getStudentName = (s: Student) => {
    const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    return p?.full_name || '—';
  };

  const filteredStudents = students.filter((s) =>
    getStudentName(s).includes(searchText)
  );

  const filteredLogs = filterParty
    ? logs.filter((l) => l.contact_party === filterParty)
    : logs;

  const selectedName = selectedStudent ? getStudentName(selectedStudent) : '';

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <IconLoader2 className="spinner" size={32} style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Left sidebar: student list */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <input
          className="search-bar"
          style={{ width: '100%', marginBottom: 10 }}
          placeholder="搜索学生…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <select
          className="sel"
          style={{ width: '100%', marginBottom: 10 }}
          value={filterParty}
          onChange={(e) => setFilterParty(e.target.value)}
        >
          <option value="">全部对象</option>
          <option value="student">学生</option>
          <option value="parent">家长</option>
          <option value="school">学校</option>
          <option value="housing">住宿方</option>
          <option value="guardian">监护人</option>
        </select>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredStudents.map((s) => {
            const name = getStudentName(s);
            const isActive = selectedStudent?.student_id === s.student_id;
            const mockLogs = MOCK_LOGS[name] || [];
            return (
              <div
                key={s.student_id}
                className={`subnav-item ${isActive ? 'subnav-active' : ''}`}
                onClick={() => setSelectedStudent(s)}
              >
                <div style={{ fontWeight: 500, color: isActive ? 'var(--color-text-info)' : undefined }}>{name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  {mockLogs.length > 0 ? formatTime(mockLogs[0].created_at) : '暂无记录'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: timeline */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>
            <IconMessage2 size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {selectedName} — 沟通记录
          </div>
          <button className="btn btn-primary">
            <IconPlus size={14} style={{ marginRight: 4 }} />添加记录
          </button>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
            <IconMessage2 size={40} style={{ color: 'var(--color-border-hover)', marginBottom: 12 }} />
            <div style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>暂无沟通记录</div>
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13, marginTop: 6 }}>
              点击右上角「添加记录」记录与家长/学校的沟通情况
            </div>
          </div>
        ) : (
          <div className="card">
            {filteredLogs.map((log, idx) => {
              const party = partyConfig[log.contact_party] || { label: log.contact_party, cls: 'p-gray' };
              const channel = channelConfig[log.channel] || { label: log.channel, icon: null };
              const staffName = Array.isArray(log.profiles)
                ? (log.profiles as any[])[0]?.full_name
                : log.profiles?.full_name;
              return (
                <div
                  key={log.id}
                  className="timeline-item"
                  style={{ borderBottom: idx < filteredLogs.length - 1 ? undefined : 'none' }}
                >
                  <div style={{ width: 80, flexShrink: 0, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                    {formatTime(log.created_at)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className={`pill ${party.cls}`}>{party.label}</span>
                      <span style={{ fontWeight: 500, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {channel.icon}{channel.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12 }}>{log.content}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      操作人：{staffName || '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
