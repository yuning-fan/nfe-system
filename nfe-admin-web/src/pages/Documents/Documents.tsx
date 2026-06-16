import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { IconUpload, IconLoader2, IconFileAlert, IconFileText, IconSearch } from '@tabler/icons-react';

interface Student {
  student_id: string;
  school_name: string | null;
  profiles: { full_name: string } | Array<{ full_name: string }>;
}

interface MockDoc {
  type: string;
  typeCls: string;
  filename: string;
  uploadDate: string;
  uploader: string;
}

interface MockCredential {
  label: string;
  expiry: string;
  status: 'ok' | 'warning' | 'expired';
}

// Mock document data (student_documents table is empty)
const MOCK_DOCS: Record<string, MockDoc[]> = {
  default: [
    { type: '护照', typeCls: 'p-blue', filename: 'passport_scan.pdf', uploadDate: '2026-01-10', uploader: '管理员' },
    { type: '签证', typeCls: 'p-red', filename: 'visa_2026.pdf', uploadDate: '2026-01-10', uploader: '管理员' },
    { type: '保险单', typeCls: 'p-green', filename: 'insurance_policy.pdf', uploadDate: '2026-01-12', uploader: '管理员' },
    { type: '录取通知书', typeCls: 'p-purple', filename: 'offer_letter.pdf', uploadDate: '2025-11-05', uploader: '管理员' },
    { type: '监护协议', typeCls: 'p-gray', filename: 'guardianship_agreement.pdf', uploadDate: '2025-10-20', uploader: '管理员' },
  ],
};

const MOCK_CREDENTIALS: Record<string, MockCredential[]> = {
  default: [
    { label: '签证', expiry: '2026-11-30', status: 'ok' },
    { label: '健康保险', expiry: '2026-12-15', status: 'ok' },
  ],
  '占小诺': [
    { label: '签证', expiry: '2026-06-30', status: 'warning' },  // 即将到期
    { label: '健康保险', expiry: '2026-12-15', status: 'ok' },
  ],
};

// Students with credentials expiring soon (mock)
const EXPIRING_SOON = ['占小诺'];

function daysUntil(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((d.getTime() - now.getTime()) / 86400000);
}

function getStatusPill(status: string) {
  if (status === 'ok') return <span className="pill p-green">正常</span>;
  if (status === 'warning') return <span className="pill p-amber">即将到期</span>;
  return <span className="pill p-red">已过期</span>;
}

export default function Documents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('students_info')
        .select('student_id, school_name, profiles(full_name)')
        .order('student_id');
      const list = (data as Student[]) || [];
      setStudents(list);
      if (list.length > 0) setSelected(list[0]);
      setIsLoading(false);
    }
    fetch();
  }, []);

  const getName = (s: Student) => {
    const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    return p?.full_name || '—';
  };

  const filtered = students.filter((s) => getName(s).includes(search));
  const expiring = students.filter((s) => EXPIRING_SOON.includes(getName(s)));
  const selectedName = selected ? getName(selected) : '';
  const docs = MOCK_DOCS[selectedName] || MOCK_DOCS['default'];
  const creds = MOCK_CREDENTIALS[selectedName] || MOCK_CREDENTIALS['default'];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <IconLoader2 className="spinner" size={32} style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Left sidebar */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <IconSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
          <input
            className="search-bar"
            style={{ width: '100%', paddingLeft: 30 }}
            placeholder="搜索学生…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Expiring soon section */}
        {expiring.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6, fontWeight: 500 }}>
              <IconFileAlert size={12} style={{ marginRight: 4, color: 'var(--color-danger)' }} />即将到期
            </div>
            {expiring.map((s) => {
              const cred = (MOCK_CREDENTIALS[getName(s)] || MOCK_CREDENTIALS['default']).find(c => c.status === 'warning');
              const days = cred ? daysUntil(cred.expiry) : 0;
              return (
                <div
                  key={s.student_id}
                  style={{ padding: '8px 10px', borderRadius: 8, background: '#FCEBEB', border: '0.5px solid #F7C1C1', marginBottom: 6, cursor: 'pointer' }}
                  onClick={() => setSelected(s)}
                >
                  <div style={{ fontWeight: 500, fontSize: 12, color: '#A32D2D' }}>{getName(s)}</div>
                  <div style={{ fontSize: 11, color: '#A32D2D' }}>签证 · {days}天后到期</div>
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '8px 0 4px', fontWeight: 500 }}>全部学生</div>
          </>
        )}

        {/* All students */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map((s) => {
            const isActive = selected?.student_id === s.student_id;
            return (
              <div
                key={s.student_id}
                className={`subnav-item ${isActive ? 'subnav-active' : ''}`}
                onClick={() => setSelected(s)}
              >
                <div style={{ fontWeight: 500, color: isActive ? 'var(--color-text-info)' : undefined }}>
                  {getName(s)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: document detail */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{selectedName} — 文件管理</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              {selected?.school_name || '—'} · 签证有效至 {(MOCK_CREDENTIALS[selectedName] || MOCK_CREDENTIALS['default'])[0]?.expiry}
            </div>
          </div>
          <button className="btn btn-primary">
            <IconUpload size={14} style={{ marginRight: 4 }} />上传文件
          </button>
        </div>

        {/* Credentials status cards */}
        <div className="g2" style={{ marginBottom: 12 }}>
          {creds.map((c) => (
            <div key={c.label} className="card" style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{c.label}状态</div>
              <div style={{ fontWeight: 500 }}>
                {c.status === 'ok' ? '有效 ' : c.status === 'warning' ? '即将到期 ' : '已过期 '}
                <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>· 到期 {c.expiry}</span>
              </div>
              <div style={{ marginTop: 4 }}>{getStatusPill(c.status)}</div>
            </div>
          ))}
        </div>

        {/* Documents table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>文件类型</th>
                <th>文件名</th>
                <th>上传时间</th>
                <th>上传人</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc, i) => (
                <tr key={i}>
                  <td><span className={`pill ${doc.typeCls}`}>{doc.type}</span></td>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconFileText size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                    {doc.filename}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{doc.uploadDate}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{doc.uploader}</td>
                  <td>
                    <span className="link">预览</span>
                    {' · '}
                    <span className="link">下载</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
