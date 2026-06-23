// 员工端通用静态详情页
import { Section, Table, pill, primaryBtn } from '../ui';

export function StaffLibrary() {
  return (
    <Section title="资料库" hint="仅可查看被授权可见的资料" action={primaryBtn('上传资料')}>
      <Table
        cols={['文件名', '科目', '类型', '更新时间']}
        rows={[
          ['EAP 学术写作讲义.pdf', '英语（EAP）', pill('p-blue', '课件/讲义'), '2026-03-15'],
          ['物理力学练习题库.pdf', '物理', pill('p-blue', '练习题'), '2026-04-20'],
          ['违规记录模板.docx', '通用/跨科', pill('p-gray', '模板表格'), '2026-03-15'],
        ]}
      />
    </Section>
  );
}

export function MyStudentsReadonly() {
  return (
    <Section title="我的学生" hint="名下学生（只读）">
      <Table
        cols={['姓名', '学校 / 年级', '风险等级', '最近跟进']}
        rows={[
          ['张晓明', 'Avondale College · Y12', '🔴 红色', '2026-06-04'],
          ['林思远', 'MAGS · Y13', '🟡 黄色', '2026-06-05'],
          ['王明宇', 'Avondale College · Y11', '🟢 正常', '2026-05-28'],
        ]}
      />
    </Section>
  );
}
