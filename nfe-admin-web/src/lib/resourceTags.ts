// 资料库标签词表
//
// 科目与阶段不再写死：选项由 lib/useSubjectOptions.ts 从科目底表 / 项目表读取，
// 保证资料存的科目名与科目管理页同名。原先这里是一份中文科目清单（统计/会计…），
// 与底表英文名（Statistics/Accounting…）永远匹配不上，导致科目管理页资料计数恒为 0、跳转筛选为空。

// 不属于任何具体科目/项目时使用
export const GENERAL_SUBJECT = '通用/跨科';
export const GENERAL_STAGE = '通用';

export const RESOURCE_TYPES = [
  '课件/讲义',
  '练习题',
  '范文/样本',
  '参考资料',
  '模板表格',
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];
