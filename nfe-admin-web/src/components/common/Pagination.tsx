import React from 'react';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}

export default function Pagination({ page, totalPages, total, pageSize, onPage }: Props) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Show at most 7 page buttons: first, last, current ±2, ellipsis
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);
    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 4px', marginTop: 8, borderTop: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
        共 {total} 条，第 {start}–{end} 条
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          style={btnStyle(false, page === 1)}
        >‹</button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--color-text-tertiary)', lineHeight: '28px' }}>…</span>
            : <button key={p} onClick={() => onPage(p)} style={btnStyle(p === page, false)}>{p}</button>
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          style={btnStyle(false, page === totalPages)}
        >›</button>
      </div>
    </div>
  );
}

function btnStyle(active: boolean, disabled: boolean): React.CSSProperties {
  return {
    minWidth: 28, height: 28, padding: '0 6px',
    borderRadius: 6, border: '1px solid var(--color-border)',
    background: active ? 'var(--color-primary)' : 'var(--color-background)',
    color: active ? '#fff' : disabled ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13, fontWeight: active ? 600 : 400,
    opacity: disabled ? 0.4 : 1,
  };
}
