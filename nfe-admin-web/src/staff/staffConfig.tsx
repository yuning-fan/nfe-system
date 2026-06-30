// 员工端工作台配置（静态壳）—— 按 staff 原型 4 角色
import {
  IconLayoutDashboard, IconUsers, IconClipboardCheck, IconNotebook, IconAlertOctagon,
  IconDatabase, IconBed, IconSun, IconToolsKitchen2, IconPill, IconMessage2,
  IconAlertTriangle, IconCar, IconCalendar, IconClipboardList, IconBook, IconCertificate, IconReport,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';

export interface StaffNavItem {
  to: string;        // 相对角色根的子路径，'' = 工作台首页
  label: string;
  icon: ReactNode;
  desc?: string;     // 占位页说明
}

export interface StaffRoleConfig {
  label: string;     // 顶栏/侧栏角色标签
  nav: StaffNavItem[];
}

const I = (C: any) => <C stroke={1.5} />;

const HOME: StaffNavItem = { to: '', label: '我的工作台', icon: I(IconLayoutDashboard) };
const STUDENTS: StaffNavItem = { to: 'students', label: '我的学生', icon: I(IconUsers), desc: '名下学生列表（只读）：课表、出勤、成绩、补课安排' };
const LIBRARY: StaffNavItem = { to: 'library', label: '资料库', icon: I(IconDatabase), desc: '仅可查看被授权可见的资料' };

export const STAFF_ROLES: Record<string, StaffRoleConfig> = {
  patrol: {
    label: '巡查视角',
    nav: [
      HOME, STUDENTS,
      { to: 'rollcall', label: '晚自习点名', icon: I(IconClipboardCheck), desc: '18:00 应到名单，逐人标记 在场/缺席/请假 + 备注' },
      { to: 'attendance-rate', label: '出勤率录入', icon: I(IconSun), desc: '每周一录入官方出勤率（核对 life 早上出勤）' },
      { to: 'homework', label: '作业核查', icon: I(IconNotebook), desc: '作业批改与成绩监控，批阅后存入学生档案' },
      { to: 'violations', label: '违规记录', icon: I(IconAlertOctagon), desc: '违规登记 + 申请三步走警告信' },
      LIBRARY,
    ],
  },
  life: {
    label: '生活管理视角',
    nav: [
      HOME, STUDENTS,
      { to: 'dorm', label: '住宿查寝', icon: I(IconBed), desc: '晚上查寝 / 白天巡查 / 卫生检查 / 外宿审批' },
      { to: 'morning', label: '早上出勤', icon: I(IconSun), desc: '按上课时段确认 已出门/未出门/请假' },
      { to: 'meals', label: '餐食管理', icon: I(IconToolsKitchen2), desc: '餐食安排与记录' },
      { to: 'meds', label: '药物管理', icon: I(IconPill), desc: '统一保管记录、分发记录' },
      { to: 'comms', label: '家校沟通', icon: I(IconMessage2), desc: '生活类沟通记录' },
      { to: 'risk', label: '风险预警', icon: I(IconAlertTriangle), desc: '名下学生风险等级（只读）' },
      { to: 'transport', label: '接送安排', icon: I(IconCar), desc: '今日路线与接送状态' },
      LIBRARY,
    ],
  },
  tutor: {
    label: '辅导视角',
    nav: [
      HOME, STUDENTS,
      { to: 'schedule', label: '我的课表', icon: I(IconCalendar), desc: '我的课表与排课、申请调课' },
      { to: 'records', label: '上课记录', icon: I(IconClipboardList), desc: '填写上课记录（公开反馈 + 内部备注）' },
      LIBRARY,
    ],
  },
  academic: {
    label: '学管视角',
    nav: [
      HOME, STUDENTS,
      { to: 'academic', label: '学业跟进', icon: I(IconBook), desc: '出勤核算、成绩录入、补课安排、学术节点看板' },
      { to: 'courses', label: '课程管理', icon: I(IconBook), desc: '辅导课目录维护（1对1 / 班科），排课时从这里选课程' },
      { to: 'docs', label: '签证/保险/文件', icon: I(IconCertificate), desc: '学生文件上传与查看' },
      { to: 'comms', label: '家校沟通', icon: I(IconMessage2), desc: '学业类沟通记录' },
      { to: 'violations', label: '违规记录', icon: I(IconAlertOctagon), desc: '登记违规/严重违纪/学术不端（可上传证明），自动扣风险分' },
      { to: 'risk', label: '风险预警', icon: I(IconAlertTriangle), desc: '全体学生风险评分（只读）' },
      { to: 'school-warnings', label: '学校警告信', icon: I(IconAlertOctagon), desc: '登记学校警告信+上传，3封达劝退评估' },
      { to: 'warning-gen', label: '警告信生成', icon: I(IconReport), desc: '生成内部出勤警告信（提醒/正式），可编辑导出 Word' },
      { to: 'reports', label: '报告生成', icon: I(IconReport), desc: '生成双周报告、审核后推送家长' },
      LIBRARY,
    ],
  },
};
