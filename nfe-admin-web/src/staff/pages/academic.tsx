// 学管老师 · 详情页（静态壳，照 staff 原型）
import { Section, Table, riskPill, pill, ghostBtn, primaryBtn, previewNote } from '../ui';

export function AcademicStudents() {
  return (
    <Section title="学生管理" hint="共 12 名在管学生" action={primaryBtn('新增学生')}>
      <Table
        cols={['姓名', '学校 / 年级', '课时余量', '签证到期', '风险等级', '最近跟进']}
        rows={[
          ['张晓明', 'Avondale College · Y12', '剩 4 课时', '⚠ 2026-09-12', riskPill('red'), '2026-06-04'],
          ['王明宇', 'Avondale College · Y11', '22 课时', '2026-11-30', riskPill('green'), '2026-05-28'],
          ['林思远', 'MAGS · Y13', '16 课时', '2026-06-19 ⚠', riskPill('yellow'), '2026-06-05'],
        ]}
      />
    </Section>
  );
}

export function AcademicTrackPage() {
  return (
    <>
      <Section title="待审批请假" hint="2 条">
        <Table
          cols={['学生', '类型', '时间', '说明', '操作']}
          rows={[
            ['林思远', '病假', '2026-06-05 全天', '附医证', <>{ghostBtn('批准')} {ghostBtn('拒绝')}</>],
            ['王明宇', '事假', '2026-06-07 下午', '家庭活动', <>{ghostBtn('批准')} {ghostBtn('拒绝')}</>],
          ]}
        />
      </Section>
      <Section title="近期成绩" hint="成绩录入 · 课时管理" action={primaryBtn('录入成绩')}>
        <Table
          cols={['学生', '科目', '考试', '成绩', '状态']}
          rows={[
            ['张晓明', '数学', '单元测验 5', '42/100', pill('p-amber', '待跟进')],
            ['林思远', '英语', '写作作业', 'B+', pill('p-green', '已录入')],
            ['李雨晴', '化学', '期中考', '88/100', pill('p-green', '已录入')],
          ]}
        />
        {previewNote()}
      </Section>
    </>
  );
}

export function AcademicDocs() {
  return (
    <>
      <Section title="到期预警" hint="2 人" action={primaryBtn('上传文件')}>
        <Table
          cols={['学生', '证件类型', '到期日', '剩余', '操作']}
          rows={[
            ['林思远', '学生签证', '2026-06-19', '还剩 14 天', ghostBtn('提醒家长')],
            ['陈佳琳', '学生签证', '2026-06-19', '还剩 14 天', ghostBtn('提醒家长')],
          ]}
        />
      </Section>
      <Section title="证件概览">
        <Table
          cols={['学生', '证件类型', '到期日', '状态']}
          rows={[
            ['林思远', '学生签证', '2026-06-19', pill('p-red', '紧急')],
            ['陈佳琳', '学生签证', '2026-06-19', pill('p-red', '紧急')],
            ['孙欢', '旅游保险', '2026-08-20', pill('p-amber', '关注')],
            ['张晓明', '学生签证', '2026-09-12', pill('p-gray', '正常')],
          ]}
        />
      </Section>
    </>
  );
}

export function AcademicComms() {
  return (
    <Section title="家校沟通" hint="沟通记录 · 消息推送" action={primaryBtn('新建记录')}>
      <Table
        cols={['学生', '方式', '摘要', '时间']}
        rows={[
          ['张晓明', '电话', '告知缺勤，家长会跟进', '06-04'],
          ['林思远', '微信', '病假告知，家长知晓', '06-05'],
          ['王明宇', '邮件', '学期总结报告已发送', '05-28'],
          ['李雨晴', '电话', '学习进度汇报，家长满意', '06-01'],
        ]}
      />
      {previewNote()}
    </Section>
  );
}

export function AcademicRisk() {
  return (
    <>
      <Section title="风险学生" hint="学生风险评级 · 跟进记录">
        <Table
          cols={['学生', '风险等级', '原因', '操作']}
          rows={[
            ['张晓明', riskPill('red'), '缺勤 · 成绩下滑 · 本周未见', ghostBtn('跟进')],
            ['林思远', riskPill('yellow'), '晚归 2 次 · 签证即将到期', ghostBtn('跟进')],
          ]}
        />
      </Section>
      <Section title="评级标准">
        <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>{riskPill('red')} 连续缺勤 3 天、签证逾期、重大违规</div>
          <div>{riskPill('yellow')} 成绩显著下滑、课时不足 2 周、违规记录 2+ 次</div>
          <div>{riskPill('green')} 无异常，正常跟进</div>
        </div>
      </Section>
    </>
  );
}

export function AcademicReports() {
  return (
    <Section title="报告生成" hint="月报 · 学情报告 · 出勤汇总" action={primaryBtn('生成月度学情报告')}>
      <Table
        cols={['报告名称', '类型', '生成时间', '操作']}
        rows={[
          ['2026 年 5 月学情报告', '月报', '2026-06-01', ghostBtn('下载')],
          ['张晓明 单生学情报告', '单生', '2026-05-30', ghostBtn('下载')],
        ]}
      />
      {previewNote()}
    </Section>
  );
}
