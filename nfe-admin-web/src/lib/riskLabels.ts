// 风险等级展示口径的唯一来源——改标签/样式只改这里，勿在页面内另写映射
import type { RiskLevel } from './riskEngine';

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  red: '🔴 干预',
  yellow: '🟡 关注',
  green: '🟢 正常',
};

export const RISK_LEVEL_PILL_CLASS: Record<RiskLevel, string> = {
  red: 'p-red',
  yellow: 'p-amber',
  green: 'p-green',
};

// DB 字段可能为 null/历史脏值，统一收敛到三级
export const normalizeRiskLevel = (v?: string | null): RiskLevel =>
  v === 'red' || v === 'yellow' ? v : 'green';
