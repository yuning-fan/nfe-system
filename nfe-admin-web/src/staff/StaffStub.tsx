// 巡查工作台子页占位（纯静态壳）
import { IconClock } from '@tabler/icons-react';

export default function StaffStub({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>{title}</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20 }}>{desc}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-tertiary)' }}>
        <IconClock size={16} /> 静态壳 · 功能开发中
      </div>
    </div>
  );
}
