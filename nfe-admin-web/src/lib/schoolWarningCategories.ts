// 学校警告信的分类口径。原本是 staff/pages/schoolWarnings.tsx 里的局部常量，
// 因为学生档案「时间线」也要显示分类，提到 lib 做单一来源——数据层不应反向 import 页面组件。

export const SCHOOL_WARNING_CATEGORIES = [
  { label: '出勤', value: 'attendance' },
  { label: '学术不端', value: 'academic' },
  { label: '纪律', value: 'discipline' },
];

export const schoolWarningCatLabel = (v: string) =>
  SCHOOL_WARNING_CATEGORIES.find(c => c.value === v)?.label || v || '—';
