// 导出字段选择 —— 勾选哪些列进 Excel，选择记在浏览器本地，下次自动带出。
import { useMemo, useState, useEffect } from 'react';
import { Modal, Checkbox } from 'antd';

const LS_KEY = 'nfe.studentExport.columns';

// 存两份：selected 是勾中的列，known 是保存那一刻存在过的全部列。
// 必须分开——只存 selected 的话，「用户取消勾选的列」和「代码后来新加的列」长得一模一样
// （都不在 selected 里），新增列默认选中的逻辑就会把取消项全勾回来，选择等于没记住。
interface SavedColumns { selected: string[]; known: string[] }

function readSaved(): SavedColumns | null {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  // 兼容旧格式（纯数组）：无从得知当时有哪些列，就认作「全都见过」，保住用户已有的取消项
  if (Array.isArray(parsed)) return { selected: parsed as string[], known: [] as string[] };
  if (parsed && Array.isArray(parsed.selected) && Array.isArray(parsed.known)) return parsed as SavedColumns;
  return null;
}

/** 读取上次选择；与当前列集合取交集，保证增删列后旧配置不失效 */
export function loadSelectedColumns(allTitles: string[]): string[] {
  try {
    const saved = readSaved();
    if (!saved) return allTitles;
    const keep = new Set(saved.selected.filter(t => allTitles.includes(t)));
    // 新增的列默认选中：只有「保存时还不存在」的列才算新增（旧格式 known 为空，视作无新增）
    if (saved.known.length) {
      const knownSet = new Set(saved.known);
      allTitles.filter(t => !knownSet.has(t)).forEach(t => keep.add(t));
    }
    const merged = allTitles.filter(t => keep.has(t));
    return merged.length ? merged : allTitles;
  } catch {
    return allTitles;
  }
}

export function saveSelectedColumns(titles: string[], allTitles: string[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ selected: titles, known: allTitles } satisfies SavedColumns));
  } catch { /* 隐私模式下 localStorage 不可用，忽略 */ }
}

export interface FieldGroup { name: string; titles: string[] }

export default function ExportFieldsModal({
  open, allTitles, groups, count, onCancel, onConfirm,
}: {
  open: boolean;
  allTitles: string[];
  groups: FieldGroup[];
  count: number;                       // 待导出学生数，标题里提示
  onCancel: () => void;
  onConfirm: (titles: string[]) => void;
}) {
  const [sel, setSel] = useState<string[]>(allTitles);

  useEffect(() => { if (open) setSel(loadSelectedColumns(allTitles)); }, [open, allTitles]);

  const selSet = useMemo(() => new Set(sel), [sel]);
  const toggle = (t: string, on: boolean) =>
    setSel(prev => (on ? [...prev, t] : prev.filter(x => x !== t)));
  const toggleGroup = (g: FieldGroup, on: boolean) =>
    setSel(prev => (on ? Array.from(new Set([...prev, ...g.titles])) : prev.filter(x => !g.titles.includes(x))));

  const confirm = () => {
    // 按 allTitles 的原始顺序输出，保证列序稳定，与勾选先后无关
    const ordered = allTitles.filter(t => selSet.has(t));
    saveSelectedColumns(ordered, allTitles);
    onConfirm(ordered);
  };

  return (
    <Modal
      title={`选择导出字段（${count} 名学生）`}
      open={open}
      onCancel={onCancel}
      onOk={confirm}
      okText={`导出 ${sel.length} 列`}
      okButtonProps={{ disabled: sel.length === 0 }}
      width={720}
    >
      <div style={{ display: 'flex', gap: 10, margin: '4px 0 12px' }}>
        <button className="btn" onClick={() => setSel(allTitles)}>全选</button>
        <button className="btn" onClick={() => setSel([])}>清空</button>
        <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          选择会记住，下次导出自动带出
        </span>
      </div>

      <div style={{ maxHeight: '52vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {groups.map(g => {
          const on = g.titles.filter(t => selSet.has(t)).length;
          return (
            <div key={g.name}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Checkbox
                  checked={on === g.titles.length}
                  indeterminate={on > 0 && on < g.titles.length}
                  onChange={e => toggleGroup(g, e.target.checked)}
                >
                  <b>{g.name}</b>
                </Checkbox>
                <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{on}/{g.titles.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6, paddingLeft: 24 }}>
                {g.titles.map(t => (
                  <Checkbox key={t} checked={selSet.has(t)} onChange={e => toggle(t, e.target.checked)}>
                    <span style={{ fontSize: 13 }}>{t}</span>
                  </Checkbox>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
