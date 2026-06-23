// 资料库标签词表 —— 贴合 NFE 预科课程结构
// 科目：1 门必修（英语 EAP）+ 13 门学术选修 + 通用/跨科

export const SUBJECTS = [
  '英语（EAP）',
  '数学-微积分',
  '数学-建模',
  '统计',
  '会计',
  '物理',
  '生物',
  '化学',
  '经济',
  '地理',
  '摄影',
  '设计',
  '艺术史',
  '传播学',
  '通用/跨科',
] as const;

export const PROGRAM_STAGES = [
  '预科-Standard',
  '预科-Accelerated',
  '预科-Fast-track',
  '大学阶段（奥大）',
  'Foundation Connect',
  '通用',
] as const;

export const RESOURCE_TYPES = [
  '课件/讲义',
  '练习题',
  '范文/样本',
  '参考资料',
  '模板表格',
] as const;

export type Subject = (typeof SUBJECTS)[number];
export type ProgramStage = (typeof PROGRAM_STAGES)[number];
export type ResourceType = (typeof RESOURCE_TYPES)[number];
