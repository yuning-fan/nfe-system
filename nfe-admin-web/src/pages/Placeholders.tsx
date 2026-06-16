import { IconReport, IconSpeakerphone, IconSchool, IconConfetti, IconDatabase, IconUserCog, IconListDetails, IconSettings, IconClock } from '@tabler/icons-react';

export function PlaceholderPage({ title, icon: Icon, desc }: { title: string, icon: any, desc: string }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
      <div style={{ padding: 20, background: 'var(--color-bg-secondary)', borderRadius: '50%', marginBottom: 16 }}>
        <Icon size={48} style={{ color: 'var(--color-primary)' }} stroke={1.5} />
      </div>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>{title}</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>{desc}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-tertiary)' }}>
        <IconClock size={16} /> 模块开发中，敬请期待后续更新
      </div>
    </div>
  );
}

export function Reports() {
  return <PlaceholderPage title="报告生成" icon={IconReport} desc="自动生成双周学术报告与综合评估报告" />;
}

export function Notices() {
  return <PlaceholderPage title="通知管理" icon={IconSpeakerphone} desc="管理内部教务通知与外部家校通知" />;
}

export function UniApplication() {
  return <PlaceholderPage title="升学规划" icon={IconSchool} desc="跟踪升学节点，管理大学申请材料" />;
}

export function Activities() {
  return <PlaceholderPage title="NFE活动管理" icon={IconConfetti} desc="发布课外活动，管理报名与家长反馈" />;
}

export function Library() {
  return <PlaceholderPage title="资料库" icon={IconDatabase} desc="知识沉淀与复用，管理模板与教材" />;
}

export function Accounts() {
  return <PlaceholderPage title="员工账号管理" icon={IconUserCog} desc="管理系统账号与权限分配" />;
}

export function SystemLogs() {
  return <PlaceholderPage title="系统操作日志" icon={IconListDetails} desc="查看关键操作记录与审计日志" />;
}

export function Settings() {
  return <PlaceholderPage title="系统配置" icon={IconSettings} desc="配置风险阈值、通知模板与系统规则" />;
}
