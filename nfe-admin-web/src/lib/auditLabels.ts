// 系统操作日志的中文映射：把 audit_logs 里的表名/字段名翻成人话。
// 只覆盖被触发器审计的 17 张表（见 migrations/20260821120000_audit_logs.sql）。

/** 被审计的表 → 模块中文名。顺序即筛选下拉的顺序：A 层在前，B 层在后。 */
export const AUDIT_TABLE_LABELS: Record<string, string> = {
  // ── A 层：全记 ──
  profiles: '员工/学生账号',
  students_info: '学生档案',
  student_enrollments: '学生报读',
  student_fees: '费用缴纳',
  student_hour_pools: '课时池',
  student_credentials: '学校平台账号',
  student_documents: '学生证件',
  dorm_assignments: '住宿分配',
  warning_letters: '警告信',
  violation_logs: '违纪记录',
  risk_config: '风险评分参数',
  courses: '课程',
  // ── B 层：只记删除与关键字段改动 ──
  schedules: '课表排课',
  grade_records: '成绩记录',
  reports: '报告',
  resources: '资料库',
  activities: 'NFE活动',
};

/** 字段名 → 中文。跨表同名字段共用一条，够用且好维护。 */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  // 通用
  id: 'ID', created_at: '创建时间', updated_at: '更新时间', status: '状态',
  student_id: '学生', title: '标题', note: '备注', description: '说明',
  // profiles
  full_name: '姓名', role: '角色', phone: '电话', avatar_url: '头像', 
  // students_info
  english_name: '英文名', preferred_english_name: '常用英文名', nfe_no: 'NFE学号',
  gender: '性别', date_of_birth: '出生日期', passport_number: '护照号',
  home_address: '家庭住址', health_notes: '健康备注',
  emergency_contact_name: '紧急联系人', emergency_contact_phone: '紧急联系电话',
  emergency_contact_email: '紧急联系邮箱',
  school_name: '就读学校', source_school: '原高中', city: '城市',
  market_source: '市场来源', advisor: '顾问', nz_advisor_id: '新西兰顾问',
  life_teacher_id: '生活老师', enrollment_id: '报读记录',
  english_level: '英语水平', target_university: '目标大学', target_degree: '目标专业',
  offer_status: 'Offer状态', scholarship_requirement: '奖学金要求',
  uoa_student_id: 'UOA学号', up_student_id: 'UP学号',
  risk_level: '风险等级', total_risk_score: '风险总分',
  school_attendance_rate: '学校出勤率', attendance_rate_updated_at: '出勤率更新时间',
  arrival_date: '抵达日期', payment_note: '付款备注',
  // 报读 / 费用 / 课时
  program_id: '项目', cohort_name: '班期', source: '来源渠道',
  start_date: '开始日期', end_date: '结束日期', enrolled_by: '登记人',
  fee_type: '费用类型', is_paid: '是否已缴', paid_date: '缴费日期',
  course_type: '课型', total_hours: '剩余课时',
  // 学校平台账号
  platform_name: '平台', account: '账号', encrypted_password: '密码',
  // 证件
  doc_type: '证件类型', file_url: '文件', issue_date: '签发日期', expiry_date: '到期日期',
  uploaded_by: '上传人',
  // 住宿
  dorm_id: '宿舍', is_active: '是否在住',
  // 警告信 / 违纪
  category: '类别', warning_level: '警告级别', evidence_content: '事由',
  occurred_on: '发生日期', signed_at: '签署时间', issuer_id: '签发人',
  attachment_url: '附件', violation_type: '违纪类型', reason: '原因',
  deduction_points: '扣分', reporter_id: '上报人',
  // 风险参数
  key: '参数键', value: '参数值', label: '参数名称',
  // 课程 / 排课 / 成绩
  name: '名称', type: '类型', course_id: '课程', program_subject_id: '科目',
  subject_label: '科目名称', tutor_id: '授课老师',
  start_time: '开始时间', end_time: '结束时间',
  material_url: '课件', homework_content: '作业',
  feedback_public: '对外反馈', feedback_internal: '内部反馈',
  milestone_id: '考核节点', score: '分数', score_type: '成绩类型',
  recorded_by: '录入人', recorded_at: '录入时间',
  // 报告 / 资料 / 活动
  content: '正文', report_type: '报告类型', pdf_url: 'PDF',
  period_start: '周期开始', period_end: '周期结束',
  generated_by: '生成人', generated_at: '生成时间',
  reviewer_id: '审核人', reviewed_at: '审核时间', sent_at: '发送时间',
  is_student_visible: '学生可见', resource_type: '资料类型', resource_year: '年份',
  knowledge_points: '知识点', program_stage: '阶段', subject: '科目',
  version: '版本', superseded_by_id: '被替代为', uploader_id: '上传人',
  activity_date: '活动日期', location: '地点', photos: '照片', created_by: '创建人',
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  INSERT: '新增', UPDATE: '修改', DELETE: '删除',
};

export const AUDIT_ACTION_PILL: Record<string, string> = {
  INSERT: 'p-green', UPDATE: 'p-blue', DELETE: 'p-red',
};

export const ROLE_LABELS: Record<string, string> = {
  admin: '管理员', manager: '主管', tutor: '学科老师',
  patrol: '巡查老师', life: '生活老师', driver: '司机', student: '学生',
};

export const tableLabel = (t: string) => AUDIT_TABLE_LABELS[t] || t;
export const fieldLabel = (f: string) => AUDIT_FIELD_LABELS[f] || f;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

/**
 * 把 jsonb 里的值渲染成一行可读文本。
 * nameMap 用于把 UUID 外键换成人名（本页只解析 profiles 里的人）。
 */
export function formatValue(v: unknown, nameMap?: Record<string, string>): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? '是' : '否';
  if (Array.isArray(v)) return v.length ? `${v.length} 项` : '—';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  // 这里刻意用正则而非 isUuid()：isUuid 的类型谓词是 `v is string`，
  // 对已经是 string 的变量使用会把 else 分支收窄成 never，导致后面的 s.length 报错。
  if (UUID_RE.test(s)) return nameMap?.[s] || `${s.slice(0, 8)}…`;
  // ISO 时间戳压成 分钟 精度，避免一行被时区尾巴撑爆
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.slice(0, 16).replace('T', ' ');
  return s.length > 60 ? s.slice(0, 60) + '…' : s;
}
