// 课程管理 —— 辅导课目录（courses 表）增删改 + 一键导入预设科目
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAcademicStore } from '../../store/useAcademicStore';
import { message, Modal, Select, Input } from 'antd';
import { IconPlus, IconPencil, IconTrash, IconDownload, IconLoader2 } from '@tabler/icons-react';

const db = supabase as any;

// 预设：EAP + 13 门选修（数学拆为 2 门）= 14 个科目，按"班科"预置
const PRESET_SUBJECTS = [
  '英语（EAP）', '数学-微积分', '数学-建模', '统计', '会计', '物理', '生物',
  '化学', '经济', '地理', '摄影', '设计', '艺术史', '传播学',
];

const TYPE_OPTIONS = [
  { label: '班科', value: 'group_class' },
  { label: '1对1', value: 'one_on_one' },
];
const typeLabel = (t: string) => (t === 'one_on_one' ? '1对1' : '班科');

interface Course { id: number; name: string; type: string; }

export default function CourseManagement() {
  const fetchCoursesStore = useAcademicStore(s => s.fetchCourses);
  const [rows, setRows] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState<{ name: string; type: string }>({ name: '', type: 'group_class' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from('courses').select('*').order('id');
    setRows((data as Course[]) || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ name: '', type: 'group_class' }); setOpen(true); };
  const openEdit = (c: Course) => { setEditing(c); setForm({ name: c.name, type: c.type }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { message.warning('请填写课程名称'); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await db.from('courses').update({ name: form.name.trim(), type: form.type }).eq('id', editing.id);
        if (error) throw error;
        message.success('已更新');
      } else {
        const { error } = await db.from('courses').insert({ name: form.name.trim(), type: form.type });
        if (error) throw error;
        message.success('已新建');
      }
      setOpen(false);
      await load();
      await fetchCoursesStore();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const remove = (c: Course) => {
    Modal.confirm({
      title: '删除课程', content: `确定删除「${c.name}（${typeLabel(c.type)}）」吗？已用于排课/课时账户的课程不建议删除。`,
      okButtonProps: { danger: true },
      onOk: async () => {
        const { error } = await db.from('courses').delete().eq('id', c.id);
        if (error) { message.error('删除失败（可能已被排课引用）'); return; }
        message.success('已删除');
        await load();
        await fetchCoursesStore();
      },
    });
  };

  const importPreset = () => {
    Modal.confirm({
      title: '导入预设科目',
      content: `将按"班科"导入 ${PRESET_SUBJECTS.length} 个预设科目（EAP + 13 门选修）。已存在的同名班科会跳过。`,
      onOk: async () => {
        setImporting(true);
        try {
          const existing = new Set(rows.filter(r => r.type === 'group_class').map(r => r.name));
          const toAdd = PRESET_SUBJECTS.filter(n => !existing.has(n)).map(n => ({ name: n, type: 'group_class' }));
          if (toAdd.length === 0) { message.info('预设科目已全部存在，无需导入'); return; }
          const { error } = await db.from('courses').insert(toAdd);
          if (error) throw error;
          message.success(`已导入 ${toAdd.length} 门科目`);
          await load();
          await fetchCoursesStore();
        } catch (e: any) {
          message.error(e.message || '导入失败');
        } finally {
          setImporting(false);
        }
      },
    });
  };

  return (
    <div className="page active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>辅导课目录 · 排课时从这里选课程；1对1 与 班科 分开维护（价格不同）</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={importPreset} disabled={importing}>
            {importing ? <IconLoader2 size={16} className="spinner" /> : <><IconDownload size={16} style={{ marginRight: 6 }} />导入预设科目</>}
          </button>
          <button className="btn btn-primary" onClick={openAdd}><IconPlus size={16} style={{ marginRight: 6 }} />新建课程</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}><IconLoader2 className="spinner" size={24} style={{ color: 'var(--color-primary)' }} /></div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            暂无课程，点右上「导入预设科目」一键建立 EAP + 13 门选修。
          </div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px' }}>课程名称</th>
                <th style={{ padding: '12px 16px' }}>课型</th>
                <th style={{ padding: '12px 16px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid var(--color-border-tertiary)', fontSize: 14 }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`pill ${c.type === 'one_on_one' ? 'p-blue' : 'p-amber'}`}>{typeLabel(c.type)}</span>
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <span className="link" onClick={() => openEdit(c)}><IconPencil size={13} style={{ verticalAlign: 'middle' }} /> 编辑</span>
                    {' · '}
                    <span className="link" style={{ color: 'var(--color-danger)' }} onClick={() => remove(c)}><IconTrash size={13} style={{ verticalAlign: 'middle' }} /> 删除</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal title={editing ? '编辑课程' : '新建课程'} open={open} onCancel={() => setOpen(false)} onOk={save}
        okText={saving ? '保存中…' : '保存'} confirmLoading={saving} width={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
          <div>
            <label className="form-label">课程名称 *</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如：物理、英语（EAP）" />
          </div>
          <div>
            <label className="form-label">课型</label>
            <Select style={{ width: '100%' }} value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} options={TYPE_OPTIONS} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
