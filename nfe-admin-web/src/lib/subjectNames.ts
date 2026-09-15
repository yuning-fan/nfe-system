// 科目中英对照 —— 科目底表（program_subjects.subject_name）存英文名，界面给中文用户看需中英对照。
// 报告导出、资料库等处共用，勿再各写一份。
const SUBJECT_CN: Record<string, string> = {
  EAP: '学术英语', Biology: '生物', Chemistry: '化学', Physics: '物理',
  Mathematics: '数学', Calculus: '微积分', Statistics: '统计',
  Economics: '经济', Accounting: '会计', Design: '设计',
  'Art History': '艺术史', Geography: '地理', 'Media Studies': '传媒研究',
};

/** 英文科目名 → 中文名；查不到（如奥大课程代码 COMMS 106）返回空串 */
export const cnOf = (name: string) => {
  const hit = Object.keys(SUBJECT_CN).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return hit ? SUBJECT_CN[hit] : '';
};

/** 展示用标签：Statistics（统计）；无中文名时原样返回 */
export const subjectLabel = (name: string) => {
  const cn = cnOf(name);
  return cn ? `${name}（${cn}）` : name;
};
