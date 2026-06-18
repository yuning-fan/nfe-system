import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSearch } from '@tabler/icons-react';
import { supabase } from '../../lib/supabase';

interface StudentLite { id: string; full_name: string; english_name: string | null }

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 首次展开时加载学生名单（id + 中文名 + 英文名）
  const ensureLoaded = async () => {
    if (students.length > 0) return;
    const db = supabase as any;
    const { data: profs } = await db.from('profiles').select('id, full_name').eq('role', 'student');
    const { data: infos } = await db.from('students_info').select('student_id, english_name');
    const engMap: Record<string, string | null> = {};
    for (const i of infos || []) engMap[i.student_id] = i.english_name;
    setStudents((profs || []).map((p: any) => ({ id: p.id, full_name: p.full_name, english_name: engMap[p.id] || null })));
  };

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(''); }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleOpen = async () => {
    setOpen(true);
    await ensureLoaded();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const matches = q.trim()
    ? students.filter(s =>
        s.full_name?.toLowerCase().includes(q.toLowerCase()) ||
        (s.english_name || '').toLowerCase().includes(q.toLowerCase())
      ).slice(0, 8)
    : [];

  const go = (id: string) => { setOpen(false); setQ(''); navigate(`/students/${id}`); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="icon-btn" onClick={handleOpen} title="搜索学生">
        <IconSearch stroke={1.5} />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 40, right: 0, width: 300, zIndex: 100,
          background: 'var(--color-background-primary)', borderRadius: 10,
          border: '0.5px solid var(--color-border-secondary)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
        }}>
          <div style={{ padding: 10, borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <input
              ref={inputRef}
              className="search-bar"
              style={{ width: '100%', maxWidth: 'none' }}
              placeholder="搜索学生姓名 / 英文名…"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && matches[0]) go(matches[0].id); }}
            />
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {q.trim() === '' ? (
              <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-tertiary)' }}>输入姓名开始搜索</div>
            ) : matches.length === 0 ? (
              <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-tertiary)' }}>未找到匹配的学生</div>
            ) : (
              matches.map(s => (
                <div key={s.id}
                  onClick={() => go(s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: '0.5px solid var(--color-border-tertiary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="avatar-xs av-blue">{s.full_name?.charAt(0) || '?'}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.full_name}</div>
                    {s.english_name && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{s.english_name}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
