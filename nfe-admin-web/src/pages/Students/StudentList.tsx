import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Input, Modal, Select, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { IconPlus, IconLoader2, IconAlertTriangle, IconSearch, IconFileSpreadsheet } from '@tabler/icons-react';
import { useStudentStore } from '../../store/useStudentStore';
import { FEE_TYPE_LABELS, FEE_TYPES, type FeeType } from '../../store/useFeeStore';
import { derivePhaseStatus } from '../../lib/phaseStatus';
import { RISK_LEVEL_LABEL, RISK_LEVEL_PILL_CLASS, normalizeRiskLevel } from '../../lib/riskLabels';
import { downloadXlsx, type CellValue } from '../../lib/xlsx';
import ExportFieldsModal from './ExportFieldsModal';

const RISK = (r: string) => {
  const level = normalizeRiskLevel(r);
  return { label: RISK_LEVEL_LABEL[level], cls: RISK_LEVEL_PILL_CLASS[level] };
};

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

// 最晚结束的阶段结束日（服务截止日期）
const latestEnd = (s: any): string | null => {
  const ends = (s.all_phases || []).map((p: any) => p.end_date).filter(Boolean) as string[];
  return ends.length ? ends.sort().slice(-1)[0] : null;
};

// ---- 导出 Excel ----
// 比表格列多带一批档案字段（生日/城市/顾问/签证等）：表格是速览，导出是存档。
// 状态口径全部复用页面同款函数，避免两处各写一套。
const SOURCE_LABEL: Record<string, string> = { green_channel: '绿通', agent: '散客' };
const FEE_STATE_TEXT: Record<string, string> = { paid: '已缴', unpaid: '未缴', none: '未登记' };
const OVERALL_FEE_TEXT: Record<string, string> = { paid: '已缴清', partial: '部分', unpaid: '未缴费', none: '未登记' };

const EXPORT_COLUMNS: { title: string; width: number; value: (s: any) => CellValue }[] = [
  { title: '姓名', width: 12, value: s => s.profiles?.full_name },
  { title: '拼音英文名', width: 14, value: s => s.english_name },
  { title: '英文名', width: 12, value: s => s.preferred_english_name },
  { title: '性别', width: 6, value: s => s.gender === 'male' ? '男' : s.gender === 'female' ? '女' : '' },
  { title: '出生日期', width: 12, value: s => s.date_of_birth },
  { title: '电话', width: 14, value: s => s.profiles?.phone },
  { title: '城市', width: 8, value: s => s.city },
  { title: '来源学校', width: 22, value: s => s.source_school },
  { title: '就读学校', width: 18, value: s => s.school_name },
  { title: '市场来源', width: 12, value: s => s.market_source },
  { title: '顾问', width: 10, value: s => s.advisor },
  { title: '新西兰顾问/学管', width: 16, value: s => s.nz_advisor_name },
  { title: '新西兰生活老师', width: 16, value: s => s.life_teacher_name },
  { title: '渠道', width: 8, value: s => SOURCE_LABEL[s.current_phase?.source] ?? '' },
  { title: '当前课程/阶段', width: 24, value: s => s.current_phase?.programs?.name },
  { title: '开学日期', width: 12, value: s => s.current_phase?.start_date },
  { title: '开学季', width: 8, value: s => { const m = intakeMonth(s); return m ? `${m}月` : ''; } },
  { title: '在读状态', width: 10, value: s => derivePhaseStatus(s.current_phase).label },
  { title: '风险等级', width: 10, value: s => RISK_LEVEL_LABEL[normalizeRiskLevel(s.risk_level)] },
  { title: '服务截止日期', width: 14, value: s => latestEnd(s) },
  { title: '缴费状态', width: 10, value: s => OVERALL_FEE_TEXT[overallFee(s)] },
  ...FEE_TYPES.map(t => ({
    title: `${FEE_TYPE_LABELS[t]}费`, width: 8, value: (s: any) => FEE_STATE_TEXT[feeOf(s, t)],
  })),
  { title: '可用课时', width: 10, value: s => s.available_hours ?? null },
  { title: '抵新日期', width: 12, value: s => s.arrival_date },
  { title: '签证到期', width: 12, value: s => s.visa_expiry },
  { title: '入学清单待办', width: 12, value: s => onboardingMissing(s) },
];

// 导出字段分组（仅影响勾选面板的排布，不影响导出列序——列序始终按 EXPORT_COLUMNS）
const EXPORT_ALL_TITLES = EXPORT_COLUMNS.map(c => c.title);
const GROUP_DEFS: { name: string; titles: string[] }[] = [
  { name: '基本信息', titles: ['姓名', '拼音英文名', '英文名', '性别', '出生日期', '电话', '城市'] },
  { name: '学校与来源', titles: ['来源学校', '就读学校', '市场来源', '渠道'] },
  { name: '负责人', titles: ['顾问', '新西兰顾问/学管', '新西兰生活老师'] },
  { name: '课程与状态', titles: ['当前课程/阶段', '开学日期', '开学季', '在读状态', '服务截止日期', '风险等级'] },
  { name: '证件与入学', titles: ['抵新日期', '签证到期', '入学清单待办'] },
];
// 未归组的（各项费用、可用课时等）统一进「费用与课时」，避免新增列时漏掉
const EXPORT_GROUPS = (() => {
  const grouped = new Set(GROUP_DEFS.flatMap(g => g.titles));
  const rest = EXPORT_ALL_TITLES.filter(t => !grouped.has(t));
  const defs = GROUP_DEFS
    .map(g => ({ name: g.name, titles: g.titles.filter(t => EXPORT_ALL_TITLES.includes(t)) }))
    .filter(g => g.titles.length > 0);
  return rest.length ? [...defs, { name: '费用与课时', titles: rest }] : defs;
})();

export default function StudentList() {
  const navigate = useNavigate();
  const { students, programs, isLoading, error, fetchStudents, fetchPrograms, createStudent } = useStudentStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', english_name: '', gender: '', phone: '', school_name: '', source_school: '' });

  const handleCreate = async () => {
    if (!form.full_name.trim()) { message.warning('请填写学生姓名'); return; }
    setSaving(true);
    const res = await createStudent({ ...form, full_name: form.full_name.trim() });
    setSaving(false);
    if (res.ok) {
      message.success('学生档案已创建');
      setCreateOpen(false);
      setForm({ full_name: '', english_name: '', gender: '', phone: '', school_name: '', source_school: '' });
    } else {
      message.error(res.error || '创建失败');
    }
  };
  const [search, setSearch] = useState('');

  useEffect(() => { fetchStudents(); fetchPrograms(); }, [fetchStudents, fetchPrograms]);

  // 项目筛选项取自完整项目表（含奥大/大学阶段，即使暂无学生在读也显示）
  const programFilters = useMemo(
    () => programs.map(p => ({ text: p.name, value: p.name })),
    [programs]
  );


  // 顶部全局搜索（姓名/英文名/生源校）
  const dataSource = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      (s.profiles?.full_name ?? '').toLowerCase().includes(q) ||
      (s.english_name ?? '').toLowerCase().includes(q) ||
      (s.source_school ?? '').toLowerCase().includes(q));
  }, [students, search]);

  // 导出取表格「当前视图」：搜索 + 列筛选 + 排序后的全部行（不止当前页）。
  // 列筛选状态在 antd 内部，只能从 onChange 的 currentDataSource 拿；搜索变化时回落到 dataSource。
  const [viewRows, setViewRows] = useState<any[]>([]);
  useEffect(() => { setViewRows(dataSource); }, [dataSource]);

  // 点导出先选字段；确认后才生成文件
  const [exportOpen, setExportOpen] = useState(false);
  const handleExport = () => {
    if (!viewRows.length) { message.warning('当前没有可导出的学生'); return; }
    setExportOpen(true);
  };

  const doExport = (titles: string[]) => {
    const cols = EXPORT_COLUMNS.filter(c => titles.includes(c.title));
    if (!cols.length) { message.warning('请至少选择一个字段'); return; }
    const today = new Date().toLocaleDateString('sv');  // sv 语言环境即 YYYY-MM-DD
    downloadXlsx(`学生信息_${today}.xlsx`, {
      sheetName: '学生信息',
      headers: cols.map(c => c.title),
      colWidths: cols.map(c => c.width),
      rows: viewRows.map(s => cols.map(c => c.value(s))),
    });
    setExportOpen(false);
    message.success(`已导出 ${viewRows.length} 名学生 × ${cols.length} 列`);
  };

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
      title: '服务截止日期', key: 'service_end', width: 180,
      filters: Array.from({ length: 12 }, (_, i) => ({ text: `${i + 1}月`, value: i + 1 })),
      onFilter: (v, r) => { const e = latestEnd(r); return !!e && (new Date(e).getMonth() + 1) === v; },
      sorter: (a, b) => (latestEnd(a) || '').localeCompare(latestEnd(b) || ''),
      render: (_: any, s: any) => {
        const e = latestEnd(s);
        if (!e) return <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>;
        const p = (s.all_phases || []).find((x: any) => x.end_date === e);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 500 }}>{e}</span>
            {p?.programs?.name && pill(p.programs.name, 'p-purple')}
          </div>
        );
      },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn" onClick={handleExport} disabled={isLoading || !viewRows.length}
            title="按当前搜索与筛选结果导出（不止当前页）">
            <IconFileSpreadsheet stroke={1.5} size={16} />导出 Excel
          </button>
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><IconPlus stroke={1.5} size={16} />新建学生档案</button>
        </div>
      </div>

      <Modal title="新建学生档案" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={handleCreate}
        okText={saving ? '创建中…' : '创建'} confirmLoading={saving} width={460}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">姓名 *</label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="中文姓名" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">英文名</label>
              <Input value={form.english_name} onChange={e => setForm(f => ({ ...f, english_name: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 120 }}>
              <label className="form-label">性别</label>
              <Select style={{ width: '100%' }} value={form.gender || undefined} onChange={v => setForm(f => ({ ...f, gender: v }))}
                placeholder="选择" options={[{ label: '男', value: 'male' }, { label: '女', value: 'female' }]} allowClear />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">电话</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label">就读学校</label>
            <Input value={form.school_name} onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))} placeholder="如 Avondale College / MAGS" />
          </div>
          <div>
            <label className="form-label">来源学校 / 渠道</label>
            <Input value={form.source_school} onChange={e => setForm(f => ({ ...f, source_school: e.target.value }))} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            创建后该学生即可在「选课与建档」里配置项目与课程。学生暂不登录，无需邮箱密码。
          </div>
        </div>
      </Modal>

      <Table
        rowKey="student_id"
        size="small"
        loading={isLoading ? { indicator: <IconLoader2 className="spinner" size={24} /> } : false}
        columns={columns}
        dataSource={dataSource}
        onChange={(_p, _f, _s, extra) => setViewRows(extra.currentDataSource)}
        scroll={{ x: 1370 }}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 名学生` }}
      />

      <ExportFieldsModal
        open={exportOpen}
        allTitles={EXPORT_ALL_TITLES}
        groups={EXPORT_GROUPS}
        count={viewRows.length}
        onCancel={() => setExportOpen(false)}
        onConfirm={doExport}
      />
    </>
  );
}
