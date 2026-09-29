// 迷你折线图 —— 手写内联 SVG，零依赖
//
// 为什么不引图表库：项目里一个图表库都没装，bundle 已经 2.3MB 且 vite 在警告；
// 为一条几十像素的折线装 recharts 不划算。与 lib/reportExport.ts、lib/xlsx.ts 同样的零依赖路线。

export interface SparkPoint {
  label: string;   // x 轴标签（日期）
  value: number;
}

interface Props {
  points: SparkPoint[];          // 按时间正序
  refLine?: number;              // 参考线（如合约红线 95）
  refLabel?: string;
  dangerBelow?: number;          // 低于此值的点标红
  width?: number;
  height?: number;
  unit?: string;
}

export default function Sparkline({
  points, refLine, refLabel, dangerBelow, width = 420, height = 96, unit = '',
}: Props) {
  if (!points.length) return null;

  const padX = 8, padTop = 10, padBottom = 18;
  const plotH = height - padTop - padBottom;

  // 纵轴范围：含参考线，再上下留 1 个单位，避免线贴边
  const vals = points.map(p => p.value).concat(refLine != null ? [refLine] : []);
  let lo = Math.min(...vals) - 1;
  let hi = Math.max(...vals) + 1;
  if (hi - lo < 2) { lo -= 1; hi += 1; }          // 全部相等时也要有高度
  const y = (v: number) => padTop + plotH - ((v - lo) / (hi - lo)) * plotH;
  const x = (i: number) =>
    points.length === 1 ? width / 2 : padX + (i * (width - padX * 2)) / (points.length - 1);

  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
  const isDanger = (v: number) => dangerBelow != null && v < dangerBelow;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', maxWidth: width }} role="img"
      aria-label={`趋势图，最新 ${points[points.length - 1].value}${unit}`}>
      {refLine != null && (
        <>
          <line x1={0} x2={width} y1={y(refLine)} y2={y(refLine)}
            stroke="var(--color-danger)" strokeWidth="1" strokeDasharray="4 3" opacity="0.55" />
          {refLabel && (
            <text x={width - 2} y={y(refLine) - 3} textAnchor="end"
              fontSize="9" fill="var(--color-danger)" opacity="0.8">{refLabel}</text>
          )}
        </>
      )}

      {points.length > 1 && (
        <polyline points={line} fill="none" stroke="var(--color-primary)" strokeWidth="1.8"
          strokeLinejoin="round" strokeLinecap="round" />
      )}

      {points.map((p, i) => (
        <g key={`${p.label}-${i}`}>
          <circle cx={x(i)} cy={y(p.value)} r={3.2}
            fill={isDanger(p.value) ? 'var(--color-danger)' : 'var(--color-primary)'} />
          {/* 只标首尾的数值，中间点靠 hover 的 title */}
          {(i === 0 || i === points.length - 1) && (
            <text x={x(i)} y={y(p.value) - 7} textAnchor={i === 0 ? 'start' : 'end'}
              fontSize="10" fill="var(--color-text-secondary)">{p.value}{unit}</text>
          )}
          <title>{p.label}：{p.value}{unit}</title>
        </g>
      ))}

      {/* x 轴只标首尾，中间挤不下 */}
      <text x={padX} y={height - 4} fontSize="9" fill="var(--color-text-tertiary)">{points[0].label}</text>
      {points.length > 1 && (
        <text x={width - padX} y={height - 4} textAnchor="end" fontSize="9" fill="var(--color-text-tertiary)">
          {points[points.length - 1].label}
        </text>
      )}
    </svg>
  );
}
