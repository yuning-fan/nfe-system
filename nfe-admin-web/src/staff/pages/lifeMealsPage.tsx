// 生活老师 · 餐食管理（排餐 + 报餐 + 照片）
// 做饭模式(cook)：排早/中/晚菜单 → 生成接龙文本 → 报餐网格(手动登记/小程序回传) → 汇总份数
// 取餐模式(pickup)：份数 + 备注 + 照片
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { getGuardedBuildings, getStudentIdsByBuilding, type GuardedBuilding } from '../../lib/guardedStudents';
import { uploadFile, getDownloadUrl } from '../../lib/r2';
import { Section } from '../ui';
import { message, Modal } from 'antd';
import { IconLoader2, IconCopy, IconCamera, IconPhoto, IconTrash, IconPencil } from '@tabler/icons-react';

const db = supabase as any;

type MealKey = 'breakfast' | 'lunch' | 'dinner';
const MEAL_LABEL: Record<MealKey, string> = { breakfast: '早餐', lunch: '中餐', dinner: '晚餐' };
const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner'];
const PHOTO_COL: Record<MealKey, string> = { breakfast: 'breakfast_photo', lunch: 'lunch_photo', dinner: 'dinner_photo' };

const DEFAULT_HEADER = '孩子们，好好生活，认真吃饭！我们的宗旨是：健康营养有滋味 保护地球🌍拒绝浪费';

interface Plan {
  id: number;
  building_name: string;
  meal_date: string;
  mode: string;
  breakfast_menu: string | null;
  lunch_menu: string | null;
  dinner_menu: string | null;
  portions: number | null;
  signup_deadline: string | null;
  notes: string | null;
  breakfast_photo: string | null;
  lunch_photo: string | null;
  dinner_photo: string | null;
}
interface Student { id: string; name: string; }
type SignupState = Record<string, { breakfast: boolean; lunch: boolean; dinner: boolean }>;

function tomorrow(): string {
  const d = new Date(Date.now() + 86400000);
  return d.toISOString().slice(0, 10);
}
function defaultDeadline(dateStr: string): string {
  // 前一晚 24:00 = 当天 00:00（datetime-local 格式）——取报餐日期当天 00:00
  return `${dateStr}T00:00`;
}

export function LifeMeals() {
  const staffId = useAuthStore(s => s.user?.id ?? null);
  const [buildings, setBuildings] = useState<GuardedBuilding[]>([]);
  const [building, setBuilding] = useState<string>('');
  const [date, setDate] = useState<string>(tomorrow());
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);

  // 编辑态
  const [menus, setMenus] = useState<Record<MealKey, string>>({ breakfast: '', lunch: '', dinner: '' });
  const [portions, setPortions] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [deadline, setDeadline] = useState<string>(defaultDeadline(tomorrow()));
  const [saving, setSaving] = useState(false);

  // 报餐网格
  const [students, setStudents] = useState<Student[]>([]);
  const [signups, setSignups] = useState<SignupState>({});

  // 接龙文本
  const [header, setHeader] = useState(DEFAULT_HEADER);

  // 排餐记录列表（该公寓）
  const [history, setHistory] = useState<Plan[]>([]);

  const mode = buildings.find(b => b.building_name === building)?.meal_mode || 'pickup';

  // 初始化公寓列表
  useEffect(() => {
    let alive = true;
    getGuardedBuildings(staffId).then(bs => {
      if (!alive) return;
      setBuildings(bs);
      setBuilding(prev => prev || bs[0]?.building_name || '');
      setLoading(false);
    });
    return () => { alive = false; };
  }, [staffId]);

  // 加载某公寓某天的排餐 + 报餐
  const loadPlan = useCallback(async () => {
    if (!building || !date) return;
    const { data: p } = await db.from('meal_plans')
      .select('*').eq('building_name', building).eq('meal_date', date).maybeSingle();
    setPlan(p || null);
    setMenus({
      breakfast: p?.breakfast_menu || '', lunch: p?.lunch_menu || '', dinner: p?.dinner_menu || '',
    });
    setPortions(p?.portions || 0);
    setNotes(p?.notes || '');
    setDeadline(p?.signup_deadline ? p.signup_deadline.slice(0, 16) : defaultDeadline(date));

    // 报餐网格（做饭模式）
    const ids = await getStudentIdsByBuilding(building);
    if (ids.length) {
      const { data: profs } = await db.from('profiles').select('id, full_name').in('id', ids).order('full_name');
      setStudents(((profs || []) as any[]).map(x => ({ id: x.id, name: x.full_name })));
    } else {
      setStudents([]);
    }
    const st: SignupState = {};
    ids.forEach(id => { st[id] = { breakfast: false, lunch: false, dinner: false }; });
    if (p?.id) {
      const { data: sus } = await db.from('meal_signups').select('student_id, breakfast, lunch, dinner').eq('plan_id', p.id);
      for (const s of (sus || []) as any[]) st[s.student_id] = { breakfast: s.breakfast, lunch: s.lunch, dinner: s.dinner };
    }
    setSignups(st);
  }, [building, date]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  // 该公寓的排餐记录列表（近 60 天）
  const loadHistory = useCallback(async () => {
    if (!building) { setHistory([]); return; }
    const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const { data } = await db.from('meal_plans')
      .select('*').eq('building_name', building).gte('meal_date', since)
      .order('meal_date', { ascending: false });
    setHistory((data || []) as Plan[]);
  }, [building]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // 删除某条排餐（级联删报餐 meal_signups）
  const deletePlan = (p: Plan) => {
    Modal.confirm({
      title: `删除 ${p.meal_date} · ${p.building_name} 的排餐`,
      content: '将一并删除这条排餐下的所有报餐记录，不可恢复。',
      okButtonProps: { danger: true },
      onOk: async () => {
        const { error } = await db.from('meal_plans').delete().eq('id', p.id);
        if (error) { message.error('删除失败'); return; }
        message.success('已删除');
        loadHistory();
        if (p.meal_date === date) loadPlan(); // 删的是当前编辑的这天
      },
    });
  };

  // 保存排餐（upsert）
  const savePlan = async () => {
    if (!building) return;
    setSaving(true);
    const row: any = {
      building_name: building, meal_date: date, mode,
      breakfast_menu: menus.breakfast || null, lunch_menu: menus.lunch || null, dinner_menu: menus.dinner || null,
      portions: mode === 'pickup' ? (portions || 0) : (plan?.portions ?? 0),
      notes: notes || null,
      signup_deadline: mode === 'cook' && deadline ? new Date(deadline).toISOString() : null,
    };
    if (!plan) row.created_by = staffId;
    const { error } = await db.from('meal_plans').upsert(row, { onConflict: 'building_name,meal_date' });
    if (error) { message.error('保存失败：' + error.message); setSaving(false); return; }
    message.success('排餐已保存');
    setSaving(false);
    loadPlan();
    loadHistory();
  };

  // 报餐网格勾选 → upsert 单行
  const toggleSignup = async (studentId: string, meal: MealKey) => {
    if (!plan?.id) { message.warning('请先保存排餐'); return; }
    const cur = signups[studentId] || { breakfast: false, lunch: false, dinner: false };
    const next = { ...cur, [meal]: !cur[meal] };
    setSignups(p => ({ ...p, [studentId]: next }));
    const { error } = await db.from('meal_signups').upsert(
      { plan_id: plan.id, student_id: studentId, ...next, source: 'manual', updated_at: new Date().toISOString() },
      { onConflict: 'plan_id,student_id' },
    );
    if (error) { message.error('登记失败'); setSignups(p => ({ ...p, [studentId]: cur })); }
  };

  // 上传实物照片 → 更新 meal_plans.*_photo
  const uploadPhoto = async (meal: MealKey, file: File) => {
    if (!plan?.id) { message.warning('请先保存排餐'); return; }
    try {
      const { key } = await uploadFile('resources', 'meal', file);
      const { error } = await db.from('meal_plans').update({ [PHOTO_COL[meal]]: key }).eq('id', plan.id);
      if (error) throw error;
      message.success('照片已上传');
      loadPlan();
    } catch (e: any) { message.error(e.message || '上传失败'); }
  };

  const viewPhoto = async (key: string) => {
    try { window.open(await getDownloadUrl('resources', key), '_blank'); }
    catch (e: any) { message.error(e.message || '获取照片失败'); }
  };

  // 生成接龙文本
  const buildSignupText = () => {
    const lines = [
      '#接龙', header, '',
      `${date} 就餐请接龙～（接龙截止 ${deadline.replace('T', ' ')}）`, '',
      `早餐：${menus.breakfast || '—'}`,
      `中餐🍲${menus.lunch || '—'}`,
      `晚餐🍲${menus.dinner || '—'}`, '',
      '例：Monica 早中吃晚不吃', '1.', '2.', '3.',
    ];
    return lines.join('\n');
  };
  const copySignupText = async () => {
    try { await navigator.clipboard.writeText(buildSignupText()); message.success('接龙文本已复制'); }
    catch { message.error('复制失败，请手动选择'); }
  };

  const tally = MEAL_KEYS.reduce((a, m) => {
    a[m] = students.reduce((n, s) => n + (signups[s.id]?.[m] ? 1 : 0), 0); return a;
  }, {} as Record<MealKey, number>);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;
  }
  if (buildings.length === 0) {
    return <Section title="餐食管理"><div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无名下公寓</div></Section>;
  }

  return (
    <>
      {/* 公寓 + 日期 选择 */}
      <Section title="餐食管理" hint="选择公寓与日期排餐；做饭模式可生成接龙文本并登记报餐">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="input" style={{ minWidth: 200 }} value={building} onChange={e => setBuilding(e.target.value)}>
            {buildings.map(b => (
              <option key={b.building_name} value={b.building_name}>
                {b.building_name}（{b.meal_mode === 'cook' ? '做饭' : '取餐'}）
              </option>
            ))}
          </select>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <span className={`pill ${mode === 'cook' ? 'p-purple' : 'p-blue'}`}>{mode === 'cook' ? '做饭模式' : '取餐模式'}</span>
        </div>
      </Section>

      {/* 排餐记录列表（该公寓近 60 天）——点「编辑」载入下方表单，可删除 */}
      <Section title="排餐记录" hint={`${building} · 近 60 天`}>
        {history.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无排餐记录</div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>{['日期', '模式', '菜单 / 份数', '操作'].map(c => (
                <th key={c} style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{c}</th>
              ))}</tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} style={{ borderTop: '1px solid var(--color-border-tertiary)', background: h.meal_date === date ? 'var(--color-bg-secondary)' : undefined }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{h.meal_date}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`pill ${h.mode === 'cook' ? 'p-purple' : 'p-blue'}`}>{h.mode === 'cook' ? '做饭' : '取餐'}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                    {h.mode === 'cook'
                      ? [h.breakfast_menu && `早:${h.breakfast_menu}`, h.lunch_menu && `中:${h.lunch_menu}`, h.dinner_menu && `晚:${h.dinner_menu}`].filter(Boolean).join(' · ') || '—'
                      : `${h.portions || 0} 份${h.notes ? ' · ' + h.notes : ''}`}
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <span className="link" style={{ marginRight: 14 }} onClick={() => setDate(h.meal_date)}>
                      <IconPencil size={13} style={{ verticalAlign: 'middle' }} /> 编辑
                    </span>
                    <span className="link" style={{ color: 'var(--color-danger)' }} onClick={() => deletePlan(h)}>
                      <IconTrash size={13} style={{ verticalAlign: 'middle' }} /> 删除
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* 排餐 */}
      <Section title="排餐" hint={mode === 'cook' ? '填写早/中/晚菜单与报餐截止' : '记录份数与备注'}
        action={<button className="btn btn-primary" onClick={savePlan} disabled={saving}>{saving ? '保存中…' : (plan ? '更新排餐' : '保存排餐')}</button>}>
        {mode === 'cook' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MEAL_KEYS.map(m => (
              <div key={m} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ width: 44, fontSize: 13, paddingTop: 8, color: 'var(--color-text-secondary)' }}>
                  {MEAL_LABEL[m]}
                </span>
                <input className="input" style={{ flex: 1 }} placeholder={`${MEAL_LABEL[m]}菜单`}
                  value={menus[m]} onChange={e => setMenus(p => ({ ...p, [m]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ width: 44, fontSize: 13, color: 'var(--color-text-secondary)' }}>截止</span>
              <input className="input" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ width: 44, fontSize: 13, color: 'var(--color-text-secondary)' }}>份数</span>
              <input className="input" type="number" min={0} style={{ width: 120 }} value={portions}
                onChange={e => setPortions(Number(e.target.value) || 0)} />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ width: 44, fontSize: 13, paddingTop: 8, color: 'var(--color-text-secondary)' }}>备注</span>
              <input className="input" style={{ flex: 1 }} placeholder="菜单 / 取餐备注" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        )}
      </Section>

      {/* 接龙文本（做饭） */}
      {mode === 'cook' && (
        <Section title="生成接龙文本" hint="复制后粘贴到微信群（小程序上线后学生可在小程序内报餐）"
          action={<button className="btn btn-primary" onClick={copySignupText}><IconCopy size={15} style={{ verticalAlign: 'middle' }} /> 复制</button>}>
          <input className="input" style={{ width: '100%', marginBottom: 8 }} value={header} onChange={e => setHeader(e.target.value)} placeholder="接龙抬头（可编辑）" />
          <pre style={{ background: 'var(--color-bg-secondary)', padding: 12, borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{buildSignupText()}</pre>
        </Section>
      )}

      {/* 报餐结果（做饭） */}
      {mode === 'cook' && (
        <Section title="报餐结果" hint="学生在微信群/小程序报餐后在此登记或核对；勾选即写入">
          {/* 每餐需做份数 —— 核心汇总，醒目展示 */}
          {plan?.id && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              {MEAL_KEYS.map(m => (
                <div key={m} style={{ flex: 1, textAlign: 'center', padding: '12px 8px', background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>{MEAL_LABEL[m]}需做</div>
                  <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{tally[m]}<span style={{ fontSize: 13, fontWeight: 400, marginLeft: 2 }}>份</span></div>
                </div>
              ))}
            </div>
          )}
          {!plan?.id ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>请先保存排餐</div>
          ) : students.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>该公寓暂无在住学生</div>
          ) : (
            <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>学生</th>
                  {MEAL_KEYS.map(m => (
                    <th key={m} style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                      {MEAL_LABEL[m]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{s.name}</td>
                    {MEAL_KEYS.map(m => (
                      <td key={m} style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <input type="checkbox" checked={!!signups[s.id]?.[m]} onChange={() => toggleSignup(s.id, m)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid var(--color-border-secondary)', fontWeight: 600 }}>
                  <td style={{ padding: '10px 12px' }}>合计份数</td>
                  {MEAL_KEYS.map(m => (
                    <td key={m} style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span className="pill p-green">{tally[m]}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </Section>
      )}

      {/* 实物照片 */}
      <Section title="实物照片留档" hint={plan?.id ? '每餐可上传一张实物图' : '保存排餐后可上传'}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {MEAL_KEYS.map(m => {
            const key = plan ? (plan as any)[PHOTO_COL[m]] as string | null : null;
            return (
              <div key={m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{MEAL_LABEL[m]}</div>
                {key ? (
                  <button className="btn" style={{ minHeight: 0, padding: '6px 12px' }} onClick={() => viewPhoto(key)}>
                    <IconPhoto size={15} style={{ verticalAlign: 'middle' }} /> 查看
                  </button>
                ) : (
                  <label className="btn" style={{ minHeight: 0, padding: '6px 12px', cursor: plan?.id ? 'pointer' : 'not-allowed', opacity: plan?.id ? 1 : 0.5 }}>
                    <IconCamera size={15} style={{ verticalAlign: 'middle' }} /> 上传
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={!plan?.id}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(m, f); e.currentTarget.value = ''; }} />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}
