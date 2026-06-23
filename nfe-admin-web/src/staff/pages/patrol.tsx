// 巡查老师 · 详情页（静态壳，照 staff 原型）
import { Section, Table, riskPill, pill, primaryBtn, previewNote } from '../ui';

export function PatrolStudents() {
  return (
    <Section title="学生基本信息" hint="只读 · 仅查看姓名、学校、违规次数。如需更新请联系学管老师。">
      <Table
        cols={['姓名', '学校', '住宿', '违规次数', '风险状态']}
        rows={[
          ['张晓明', 'Avondale College', 'Apt 1 · R2', '5 次', riskPill('red')],
          ['林思远', 'MAGS', 'Apt 1 · R3', '3 次', riskPill('yellow')],
          ['王明宇', 'Avondale College', 'Apt 1 · R4', '0 次', riskPill('green')],
          ['孙欢', 'Avondale College', 'Apt 2 · R1', '1 次', riskPill('green')],
          ['李雨晴', 'MAGS', 'Apt 2 · R2', '0 次', riskPill('green')],
        ]}
      />
    </Section>
  );
}

export function PatrolRollcall() {
  return (
    <>
      <Section title="晚自习点名" hint="2026-06-05 · 18:00 · 应到 24 人" action={primaryBtn('提交记录')}>
        <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
          {[['应到', '24'], ['已标记', '20'], ['缺席', '2'], ['请假', '2']].map(([l, n]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{n}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{l}</div>
            </div>
          ))}
        </div>
        <Table
          cols={['姓名', '状态', '备注']}
          rows={[
            ['张晓明', pill('p-red', '缺席'), '已推送王老师'],
            ['林思远', pill('p-amber', '请假'), '病假已批准'],
            ['王明宇', pill('p-green', '在场'), '—'],
            ['李雨晴', pill('p-green', '在场'), '—'],
            ['孙欢', pill('p-green', '在场'), '—'],
            ['周欣怡', pill('p-red', '缺席'), '待确认'],
          ]}
        />
        {previewNote()}
      </Section>
      <Section title="历史点名记录">
        <Table
          cols={['日期', '应到', '在场', '缺席']}
          rows={[['06-04 周四', '24', '23', '1'], ['06-03 周三', '24', '22', '2'], ['06-02 周二', '24', '24', '0']]}
        />
      </Section>
    </>
  );
}

export function PatrolHomework() {
  return (
    <Section title="作业核查" hint="作业批改与成绩监控，批阅后存入学生档案" action={primaryBtn('新增核查')}>
      <Table
        cols={['学生', '科目', '作业', '完成度', '状态']}
        rows={[
          ['张晓明', '物理', '力学练习', '60%', pill('p-amber', '待跟进')],
          ['林思远', '数学', '二次函数', '良好', pill('p-green', '已批阅')],
          ['王明宇', '数学', '代数单测', '优秀', pill('p-green', '已批阅')],
        ]}
      />
      {previewNote()}
    </Section>
  );
}

export function PatrolViolations() {
  return (
    <>
      <Section title="违规记录" hint="新增违规 · 警告信申请" action={primaryBtn('新增违规')}>
        <Table
          cols={['学生', '违规类型', '日期', '状态']}
          rows={[
            ['张晓明', '缺席自习', '06-03', pill('p-blue', '审批中')],
            ['林思远', '手机使用', '06-04', pill('p-amber', '待存档')],
            ['王明宇', '手机使用', '06-04', pill('p-amber', '待存档')],
            ['张晓明', '晚归', '05-20', pill('p-gray', '已存档')],
          ]}
        />
      </Section>
      <Section title="警告信流程" hint="出具警告信需先报批学管老师审批，审批通过后方可出具。">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          {pill('p-gray', '① 口头通报')}<span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
          {pill('p-gray', '② 电子警告信')}<span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
          {pill('p-gray', '③ 最终警告信')}
        </div>
      </Section>
    </>
  );
}
