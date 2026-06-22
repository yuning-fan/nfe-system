import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { IconPlus, IconLoader2, IconAlertTriangle, IconSearch } from '@tabler/icons-react';
import { useStudentStore } from '../../store/useStudentStore';
import { FEE_TYPE_LABELS, FEE_TYPES, type FeeType } from '../../store/useFeeStore';
import { derivePhaseStatus } from '../../lib/phaseStatus';

const RISK = (r: string) =>
  r === 'red' ? { label: '🔴 干预', cls: 'p-red' }
  : r === 'yellow' ? { label: '🟡 关注', cls: 'p-amber' }
  : { label: '🟢 正常', cls: 'p-green' };

const avatarColor = (idStr: string) => {
  const colors = ['av-blue', 'av-pink', 'av-teal', 'av-green', 'av-amber', 'av-purple'];
  let h = 0;
  for (let i = 0; i < idStr.length; i++) h = idStr.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};


// 当前阶段开学月份
const intakeMonth = (s: any): number | null => {
  const d = s.current_phase?.start_date;
  return d ? new Date(d).getMonth() + 1 : null;
};
// 某类服务在当前阶段的缴费态：paid / unpaid / none(未登记)
const feeOf = (s: any, t: FeeType): 'paid' | 'unpaid' | 'none' => {
  const f = (s.current_fees || []).find((x: any) => x.fee_type === t);
  return !f ? 'none' : f.is_paid ? 'paid' : 'unpaid';
};
const overallFee = (s: any): 'paid' | 'partial' | 'unpaid' | 'none' => {
  const fees = s.current_fees || [];
  if (fees.length === 0) return 'none';
  const paid = fees.filter((f: any) => f.is_paid).length;
  if (paid === 0) return 'unpaid';
  if (paid === fees.length) return 'paid';
  return 'partial';
};
const FEE_STATE_PILL: Record<string, { label: string; cls: string }> = {
  paid: { label: '已缴', cls: 'p-green' },
  unpaid: { label: '未缴', cls: 'p-amber' },
  none: { label: '—', cls: 'p-gray' },
};

const onboardingMissing = (s: any): number => {
  const docs = s.student_documents || [];
  return [
    !docs.find((d: any) => d.doc_type === 'offer_letter'),
    !docs.find((d: any) => d.doc_type === 'visa' && d.status !== 'expired'),
    !docs.find((d: any) => d.doc_type === 'insurance' && d.status !== 'expired'),
    !docs.find((d: any) => d.doc_type === 'guardianship'),
    !s.arrival_date,
    !s.dorm_assignments?.length,
    !s.school_timetable?.length,
  ].filter(Boolean).length;
};

const pill = (label: string, cls: string) => <span className={`pill ${cls}`}>{label}</span>;

export default function StudentList() {
  const navigate = useNavigate();
  const { students, programs, isLoading, error, fetchStudents, fetchPrograms } = useStudentStore();
  const [search, setSearch] = useState('');

  useEffect(() => { fetchStudents(); fetchPrograms(); }, [fetchStudents, fetchPrograms]);

  // 项目筛选项取自完整项目表（含奥大/大学阶段，即使暂无学生在读也显示）
  const programFilters = useMemo(
    () => programs.map(p => ({ text: p.name, value: p.name })),
    [programs]
  );

  const schoolFilters = useMemo(() => {
    const names = [...new Set(students.map(s => s.source_school).filter(Boolean))].sort();
    return names.map(n => ({ text: n as string, value: n as string }));
  }, [students]);

  // 顶部全局搜索（姓名/英文名/生源校）
  const dataSource = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      (s.profiles?.full_name ?? '').toLowerCase().includes(q) ||
      (s.english_name ?? '').toLowerCase().includes(q) ||
      (s.source_school ?? '').toLowerCase().includes(q));
  }, [students, search]);

  const feeColumn = (t: FeeType): ColumnsType<any>[number] => ({
    title: FEE_TYPE_LABELS[t],
    key: `fee_${t}`,
    width: 80,
    align: 'center',
    filters: [{ text: '已缴', value: 'paid' }, { text: '未缴', value: 'unpaid' }, { text: '未登记', value: 'none' }],
    onFilter: (v, r) => feeOf(r, t) === v,
    render: (_: any, r: any) => { const st = FEE_STATE_PILL[feeOf(r, t)]; return pill(st.label, st.cls); },
  });

  const columns: ColumnsType<any> = [
    {
      title: '姓名', key: 'name', fixed: 'left', width: 170,
      sorter: (a, b) => (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || ''),
      render: (_: any, s: any) => {
        const miss = onboardingMissing(s);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={`avatar-xs ${avatarColor(s.student_id)}`}>{(s.profiles?.full_name || '?').charAt(0)}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>{s.profiles?.full_name || '未知'}</span>
                {miss > 0 && (
                  <span title={`入学清单还有 ${miss} 项未完成`} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 10, color: '#A05000', background: '#FFF5E6', border: '1px solid #F5C97F', borderRadius: 4, padding: '0 4px' }}>
                    <IconAlertTriangle size={9} />{miss}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{s.english_name || '—'}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: '性别', key: 'gender', width: 70,
      filters: [{ text: '男', value: 'male' }, { text: '女', value: 'female' }],
      onFilter: (v, r) => r.gender === v,
      render: (_: any, s: any) => s.gender === 'male' ? '男' : s.gender === 'female' ? '女' : '—',
    },
    {
      title: '开学季', key: 'intake', width: 90,
      filters: [2, 4, 7, 9, 10].map(m => ({ text: `${m}月`, value: m })),
      onFilter: (v, r) => intakeMonth(r) === v,
      sorter: (a, b) => (intakeMonth(a) || 0) - (intakeMonth(b) || 0),
      render: (_: any, s: any) => { const m = intakeMonth(s); return m ? `${m}月` : '—'; },
    },
    {
      title: '课程/阶段', key: 'program', width: 150,
      filters: programFilters, filterSearch: true,
      onFilter: (v, r) => (r.current_phase?.programs?.name ?? '') === v,
      render: (_: any, s: any) => {
        const name = s.current_phase?.programs?.name;
        const src = s.current_phase?.source;
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {src === 'green_channel' && pill('绿通', 'p-green')}
            {src === 'agent' && pill('散客', 'p-blue')}
            {name ? pill(name, 'p-purple') : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
          </div>
        );
      },
    },
    {
      title: '在读状态', key: 'status', width: 90,
      filters: [{ text: '待入学', value: 'pending' }, { text: '在读', value: 'active' }, { text: '已完成', value: 'completed' }, { text: '退学', value: 'withdrawn' }, { text: '暂停', value: 'suspended' }],
      onFilter: (v, r) => derivePhaseStatus(r.current_phase).key === v,
      render: (_: any, s: any) => { const st = derivePhaseStatus(s.current_phase); return pill(st.label, st.cls); },
    },
    {
      title: '风险', key: 'risk', width: 90,
      filters: [{ text: '正常', value: 'green' }, { text: '关注', value: 'yellow' }, { text: '干预', value: 'red' }],
      onFilter: (v, r) => (r.risk_level || 'green') === v,
      render: (_: any, s: any) => { const r = RISK(s.risk_level); return pill(r.label, r.cls); },
    },
    {
      title: '生源校', key: 'school', width: 120,
      filters: schoolFilters, filterSearch: true,
      onFilter: (v, r) => r.source_school === v,
      render: (_: any, s: any) => s.source_school || '—',
    },
    {
      title: '缴费状态', key: 'fee_overall', width: 100,
      filters: [{ text: '已缴清', value: 'paid' }, { text: '部分', value: 'partial' }, { text: '未缴费', value: 'unpaid' }, { text: '未登记', value: 'none' }],
      onFilter: (v, r) => overallFee(r) === v,
      render: (_: any, s: any) => {
        const o = overallFee(s);
        const map: any = { paid: { l: '已缴清', c: 'p-green' }, partial: { l: '部分', c: 'p-amber' }, unpaid: { l: '未缴费', c: 'p-red' }, none: { l: '未登记', c: 'p-gray' } };
        return pill(map[o].l, map[o].c);
      },
    },
    ...FEE_TYPES.map(feeColumn),
    {
      title: '可用课时', key: 'hours', width: 90, align: 'right',
      sorter: (a, b) => (a.available_hours ?? -1) - (b.available_hours ?? -1),
      render: (_: any, s: any) => s.available_hours != null ? `${s.available_hours}` : '—',
    },
    {
      title: '操作', key: 'action', fixed: 'right', width: 90,
      render: (_: any, s: any) => <span className="link" onClick={() => navigate(`/students/${s.student_id}`)}>查看档案</span>,
    },
  ];

  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-danger)' }}>加载失败：{error}</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Input
          allowClear
          prefix={<IconSearch size={14} style={{ color: 'var(--color-text-tertiary)' }} />}
          placeholder="搜索姓名 / 英文名 / 学校"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 280 }}
        />
        <button className="btn btn-primary"><IconPlus stroke={1.5} size={16} />新建学生档案</button>
      </div>

      <Table
        rowKey="student_id"
        size="small"
        loading={isLoading ? { indicator: <IconLoader2 className="spinner" size={24} /> } : false}
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: 1450 }}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 名学生` }}
      />
    </>
  );
}
