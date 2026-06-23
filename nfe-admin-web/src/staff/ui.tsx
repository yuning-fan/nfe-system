// 员工端静态壳通用小组件
import type { ReactNode } from 'react';

export function Section({ title, action, hint, children }: { title: string; action?: ReactNode; hint?: string; children?: ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hint ? 4 : 12 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>{title}</div>
        {action}
      </div>
      {hint && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>{hint}</div>}
      {children}
    </div>
  );
}

export function Table({ cols, rows }: { cols: string[]; rows: ReactNode[][] }) {
  return (
    <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
      <thead>
        <tr>{cols.map((c, i) => <th key={i} style={{ padding: '10px 14px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} style={{ borderTop: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
            {r.map((c, ci) => <td key={ci} style={{ padding: '10px 14px' }}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const riskPill = (level: 'red' | 'yellow' | 'green') => {
  const map = { red: ['p-red', '🔴 红色'], yellow: ['p-amber', '🟡 黄色'], green: ['p-green', '🟢 正常'] } as const;
  const [cls, label] = map[level];
  return <span className={`pill ${cls}`}>{label}</span>;
};

export const pill = (cls: string, label: string) => <span className={`pill ${cls}`}>{label}</span>;

export const ghostBtn = (label: string) => <button className="btn" disabled style={{ padding: '4px 10px', minHeight: 0 }}>{label}</button>;
export const primaryBtn = (label: string) => <button className="btn btn-primary" disabled>{label}</button>;

export const previewNote = () => (
  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 10 }}>静态预览 · 功能开发中</div>
);
