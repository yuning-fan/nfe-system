// 巡查老师 · 我的工作台（静态壳，照 staff 原型 pt-home）
import { IconClipboardCheck, IconShieldX, IconNotebook } from '@tabler/icons-react';

export default function PatrolHome() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 待处理 */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>
          待处理 <span className="pill p-red" style={{ marginLeft: 6 }}>2 项</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <div>
              <div style={{ fontWeight: 500 }}>待存档违规记录</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>昨晚自习记录 2 条手机使用违规</div>
            </div>
            <span className="pill p-amber">待存档</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <div>
              <div style={{ fontWeight: 500 }}>待报批警告信</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>张晓明 · 最终警告信 · 已提交学管</div>
            </div>
            <span className="pill p-blue">审批中</span>
          </div>
        </div>
      </div>

      {/* 警告信流程 */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 8 }}>警告信流程</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
          出具警告信需先报批学管老师审批，审批通过后方可出具。
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span className="pill p-gray">① 口头通报</span>
          <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
          <span className="pill p-gray">② 电子警告信</span>
          <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
          <span className="pill p-gray">③ 最终警告信</span>
        </div>
      </div>

      {/* 今日日程 */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>今日日程</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ScheduleRow icon={<IconClipboardCheck size={16} />} time="18:00" title="晚自习点名" desc="全体学生 · 记录出勤" tag="待执行" tagCls="p-amber" />
          <ScheduleRow icon={<IconShieldX size={16} />} time="18:30+" title="自习巡查" desc="每 30 分钟一轮，量化打分记录纪律" tag="6 轮" tagCls="p-gray" />
          <ScheduleRow icon={<IconNotebook size={16} />} time="收作业" title="作业批改与成绩监控" desc="批阅后直接存入学生档案" tag="" tagCls="" />
        </div>
      </div>

      {/* 点名快捷入口 */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>点名快捷入口</div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Stat n="24" label="应到" />
          <Stat n="—" label="已到" />
          <Stat n="—" label="缺席" />
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} disabled>
            <IconClipboardCheck size={16} style={{ marginRight: 6 }} />开始点名
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 10 }}>静态预览 · 功能开发中</div>
      </div>
    </div>
  );
}

function ScheduleRow({ icon, time, title, desc, tag, tagCls }: { icon: React.ReactNode; time: string; title: string; desc: string; tag: string; tagCls: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
      <div style={{ width: 56, fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>{time}</div>
      <div style={{ color: 'var(--color-text-tertiary)' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{desc}</div>
      </div>
      {tag && <span className={`pill ${tagCls}`}>{tag}</span>}
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{n}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{label}</div>
    </div>
  );
}
