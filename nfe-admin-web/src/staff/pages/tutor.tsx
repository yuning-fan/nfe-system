// 辅导老师 · 详情页（静态壳，照 staff 原型）
import { Section, Table, riskPill, pill, primaryBtn, previewNote } from '../ui';

export function TutorStudents() {
  const card = (initial: string, name: string, meta: string, level: 'red' | 'yellow' | 'green', stats: [string, string][]) => (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div className="avatar-sm">{initial}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{meta}</div>
        </div>
        {riskPill(level)}
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        {stats.map(([l, v]) => (
          <div key={l}><span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{l} </span><b style={{ fontSize: 13 }}>{v}</b></div>
        ))}
      </div>
    </div>
  );
  return (
    <Section title="我的学生" hint="名下学生 · 只读学习档案">
      {card('林', '林思远', 'MAGS · Y13 · 数学', 'yellow', [['本周课时', '2 节'], ['上次成绩', 'B+（英语写作）'], ['课时余量', '16 课时'], ['学习状态', '需关注']])}
      {card('王', '王明宇', 'Avondale College · Y11 · 数学', 'green', [['本周课时', '3 节'], ['上次成绩', 'A（代数单测）'], ['课时余量', '22 课时'], ['学习状态', '进步明显']])}
      {card('张', '张晓明', 'Avondale College · Y12 · 物理', 'red', [['本周课时', '1 节'], ['上次成绩', '42/100'], ['课时余量', '4 课时'], ['学习状态', '需重点干预']])}
    </Section>
  );
}

export function TutorSchedule() {
  return (
    <Section title="我的课表" hint="本周排课 · 2026 年第 23 周" action={primaryBtn('申请调课')}>
      <Table
        cols={['时段', '周一', '周二', '周三', '周四', '周五']}
        rows={[
          ['09:00', '张晓明 物理 60min', '', '张晓明 物理 待确认', '', ''],
          ['14:00', '', '林思远 数学 60min', '', '林思远 数学 60min', ''],
          ['16:00', '王明宇 数学 60min', '', '王明宇 数学 60min', '', '王明宇 数学 60min'],
        ]}
      />
      {previewNote()}
    </Section>
  );
}

export function TutorRecords() {
  return (
    <>
      <Section title="上课记录" hint="填写反馈 · 学管确认后扣减课时" action={primaryBtn('新建记录')}>
        <Table
          cols={['学生', '科目', '日期', '时长', '课堂反馈', '状态']}
          rows={[
            ['林思远', '数学', '06-03', '60min', '专注度良好，二次函数掌握约 70%', pill('p-green', '已确认')],
            ['王明宇', '数学', '06-04', '60min', '表现优秀，主动提问', pill('p-green', '已确认')],
            ['张晓明', '物理', '06-03', '60min', '—', pill('p-amber', '待填写')],
            ['林思远', '数学', '05-31', '60min', '复习章节，作业完成度好', pill('p-green', '已确认')],
          ]}
        />
        {previewNote()}
      </Section>
      <Section title="资料库" hint="仅可见自己上传及被标记可见的资料" action={primaryBtn('上传资料')}>
        <Table
          cols={['文件名', '科目', '复用次数', '更新时间']}
          rows={[
            ['EAP 学术写作讲义.pdf', '英语（EAP）', '8 次', '2026-03-15'],
            ['物理力学练习题库.pdf', '物理', '5 次', '2026-04-20'],
          ]}
        />
      </Section>
    </>
  );
}
