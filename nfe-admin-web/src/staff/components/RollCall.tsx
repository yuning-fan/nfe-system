// 通用点名组件 —— 晚自习(night_study) / 早上出勤(morning) / 辅导课(tutoring) 复用
// 逐人标记 在场/缺席/请假 + 备注，提交写 daily_checks；缺席由算分引擎自动扣分。
import { useEffect, useState, useCallback, Fragment } from 'react';
import { supabase } from '../../lib/supabase';
import { useDailyCheckStore, type DailyCheckType } from '../../store/useDailyCheckStore';
import { useAuthStore } from '../../store/useAuthStore';
import { recomputeRisk } from '../../lib/riskEngine';
import { message, Modal } from 'antd';
import { IconLoader2, IconChevronRight, IconChevronDown, IconTrash } from '@tabler/icons-react';
import { Section } from '../ui';

const db = supabase as any;

type St = 'present' | 'absent' | 'leave';
interface Stu { id: string; name: string; }
interface HistRow { date: string; present: number; absent: number; leave: number; total: number; }

const ST_LABEL: Record<St, string> = { present: '在场', absent: '缺席', leave: '请假' };
const ST_CLS: Record<St, string> = { present: 'p-green', absent: 'p-red', leave: 'p-amber' };

// scope: 'all' = 全体在读（晚自习）；'today_school' = 今日有课的学生（早上出勤，按 school_timetable）
export default function RollCall({ checkType, title, hint, scope = 'all' }: { checkType: DailyCheckType; title: string; hint?: string; scope?: 'all' | 'today_school' }) {
  const submit = useDailyCheckStore(s => s.submitDailyChecks);
  const saving = useDailyCheckStore(s => s.isLoading);

  const [students, setStudents] = useState<Stu[]>([]);
  const [state, setState] = useState<Record<string, { status: St; notes: string }>>({});
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistRow[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ id: number; student_id: string; name: string; status: St; notes: string | null }[]>([]);
  const operatorId = useAuthStore(s => s.user?.id ?? null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    let list: Stu[] = [];
    if (scope === 'today_school') {
      // 今日有课的学生：school_timetable 中 day_of_week=今天(1=周一..7=周日) 且在生效区间内
      const jsDay = new Date().getDay();           // 0=周日..6=周六
      const dow = jsDay === 0 ? 7 : jsDay;          // 转成 1..7
      const today = new Date().toISOString().slice(0, 10);
      const { data: tt } = await db
        .from('school_timetable')
        .select('student_id')
        .eq('day_of_week', dow)
        .lte('effective_from', today)
        .gte('effective_until', today);
      const ids = Array.from(new Set(((tt || []) as any[]).map(r => r.student_id).filter(Boolean)));
      if (ids.length) {
        const { data } = await db.from('profiles').select('id, full_name').in('id', ids).order('full_name');
        list = (data || []).map((p: any) => ({ id: p.id, name: p.full_name }));
      }
    } else {
      const { data } = await db.from('profiles').select('id, full_name').eq('role', 'student').order('full_name');
      list = (data || []).map((p: any) => ({ id: p.id, name: p.full_name }));
    }
    setStudents(list);
    const init: Record<string, { status: St; notes: string }> = {};
    list.forEach(s => { init[s.id] = { status: 'present', notes: '' }; });
    setState(init);
    setLoading(false);
  }, [scope]);

  const loadHistory = useCallback(async () => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await db.from('daily_checks').select('status, created_at').eq('check_type', checkType).gte('created_at', since);
    const byDate: Record<string, { present: number; absent: number; leave: number }> = {};
    for (const r of (data || []) as any[]) {
      const d = (r.created_at || '').slice(0, 10);
      if (!d) continue;
      byDate[d] = byDate[d] || { present: 0, absent: 0, leave: 0 };
      const st = r.status as St;
      if (st === 'present' || st === 'absent' || st === 'leave') byDate[d][st]++;
    }
    setHistory(
      Object.entries(byDate)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, v]) => ({ date, ...v, total: v.present + v.absent + v.leave }))
    );
  }, [checkType]);

  const nameOf = useCallback((id: string) => students.find(s => s.id === id)?.name || '未知', [students]);

  const loadDetail = useCallback(async (date: string) => {
    const start = new Date(date + 'T00:00:00');
    const end = new Date(start.getTime() + 86400000);
    const { data } = await db
      .from('daily_checks')
      .select('id, student_id, status, notes')
      .eq('check_type', checkType)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString());
    setDetail(((data || []) as any[]).map(r => ({ id: r.id, student_id: r.student_id, name: nameOf(r.student_id), status: r.status as St, notes: r.notes }))
      .sort((a, b) => a.name.localeCompare(b.name, 'zh')));
  }, [checkType, nameOf]);

  const toggleExpand = (date: string) => {
    if (expandedDate === date) { setExpandedDate(null); return; }
    setExpandedDate(date);
    loadDetail(date);
  };

  // 改某条记录的状态（在场/缺席/请假）→ 即时重算该学生
  const changeRecordStatus = async (rec: { id: number; student_id: string }, status: St) => {
    const { error } = await db.from('daily_checks').update({ status }).eq('id', rec.id);
    if (error) { message.error('修改失败'); return; }
    await recomputeRisk(rec.student_id, operatorId);
    message.success('已修改，风险分已更新');
    if (expandedDate) loadDetail(expandedDate);
    loadHistory();
  };

  // 删除某条记录 → 即时重算
  const deleteRecord = (rec: { id: number; student_id: string; name: string }) => {
    Modal.confirm({
      title: '删除该点名记录',
      content: `确定删除 ${rec.name} 这条记录吗？删除后会重新计算该学生的风险分。`,
      okButtonProps: { danger: true },
      onOk: async () => {
        const { error } = await db.from('daily_checks').delete().eq('id', rec.id);
        if (error) { message.error('删除失败'); return; }
        await recomputeRisk(rec.student_id, operatorId);
        message.success('已删除');
        if (expandedDate) loadDetail(expandedDate);
        loadHistory();
      },
    });
  };

  // 删除整日记录 → 重算涉及的所有学生
  const deleteDay = (date: string) => {
    Modal.confirm({
      title: `删除 ${date} 全部点名`,
      content: '将删除当天这一类点名的所有记录，并重算涉及学生的风险分。',
      okButtonProps: { danger: true },
      onOk: async () => {
        const start = new Date(date + 'T00:00:00');
        const end = new Date(start.getTime() + 86400000);
        const { data: rows } = await db.from('daily_checks').select('student_id')
          .eq('check_type', checkType).gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
        const ids = Array.from(new Set(((rows || []) as any[]).map(r => r.student_id)));
        const { error } = await db.from('daily_checks').delete()
          .eq('check_type', checkType).gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
        if (error) { message.error('删除失败'); return; }
        await Promise.all(ids.map(id => recomputeRisk(id, operatorId)));
        message.success('已删除当天点名');
        setExpandedDate(null);
        loadHistory();
      },
    });
  };

  useEffect(() => { loadStudents(); loadHistory(); }, [loadStudents, loadHistory]);

  // 点"缺席/请假"即标记，再点一次取消回到"在场"；只需标异常的人，其余默认在场
  const toggleStatus = (id: string, status: St) =>
    setState(p => ({ ...p, [id]: { ...p[id], status: p[id]?.status === status ? 'present' : status } }));
  const setNotes = (id: string, notes: string) => setState(p => ({ ...p, [id]: { ...p[id], notes } }));
  const resetAllPresent = () => {
    const init: Record<string, { status: St; notes: string }> = {};
    students.forEach(s => { init[s.id] = { status: 'present', notes: '' }; });
    setState(init);
  };

  const counts = students.reduce(
    (a, s) => { const st = state[s.id]?.status || 'present'; a[st]++; return a; },
    { present: 0, absent: 0, leave: 0 } as Record<St, number>
  );

  const handleSubmit = async () => {
    const records = students.map(s => ({
      student_id: s.id,
      status: state[s.id]?.status || 'present',
      notes: state[s.id]?.notes || '',
    }));
    const ok = await submit(checkType, records);
    if (ok) {
      message.success(`点名已提交：缺席 ${counts.absent} 人，相关学生风险分已自动更新`);
      loadHistory();
    } else {
      message.error('提交失败，请重试');
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><IconLoader2 className="spinner" size={28} style={{ color: 'var(--color-primary)' }} /></div>;
  }

  const today = new Date().toLocaleDateString('zh-CN');

  return (
    <>
      <Section
        title={title}
        hint={hint || `${today} · 应到 ${students.length} 人`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={resetAllPresent} disabled={saving}>全部在场</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? <IconLoader2 size={16} className="spinner" /> : '提交点名'}
            </button>
          </div>
        }
      >
        {/* 汇总条 */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
          {([['应到', students.length], ['在场', counts.present], ['缺席', counts.absent], ['请假', counts.leave]] as [string, number][]).map(([l, n]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{n}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 10 }}>
          只需标出<b>缺席</b>和<b>请假</b>的人,其余默认在场。点错再点一次可取消。
        </div>
        {students.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            {scope === 'today_school' ? '今日无排课学生（周末或课表为空）' : '暂无在读学生'}
          </div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 12px' }}>姓名</th>
                <th style={{ padding: '10px 12px' }}>标记（不点=在场）</th>
                <th style={{ padding: '10px 12px' }}>备注</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const cur = state[s.id]?.status || 'present';
                return (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--color-border-tertiary)', background: cur === 'absent' ? 'rgba(226,75,74,0.06)' : cur === 'leave' ? 'rgba(239,159,39,0.06)' : undefined }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                      {s.name}
                      {cur === 'present' && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-text-tertiary)' }}>在场</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['absent', 'leave'] as St[]).map(st => (
                          <button
                            key={st}
                            className={`btn ${cur === st ? 'btn-primary' : ''}`}
                            onClick={() => toggleStatus(s.id, st)}
                            style={{
                              padding: '3px 12px', fontSize: 12, minHeight: 0,
                              backgroundColor: cur === st ? (st === 'absent' ? 'var(--color-danger)' : '#EF9F27') : undefined,
                              borderColor: cur === st ? (st === 'absent' ? 'var(--color-danger)' : '#EF9F27') : undefined,
                            }}
                          >
                            {ST_LABEL[st]}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {cur === 'present' ? (
                        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>—</span>
                      ) : (
                        <input
                          className="input"
                          style={{ width: '100%', minHeight: 0, padding: '4px 8px', fontSize: 12 }}
                          placeholder="原因 / 备注"
                          value={state[s.id]?.notes || ''}
                          onChange={e => setNotes(s.id, e.target.value)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="历史点名记录" hint="近 30 天 · 点开某天可改状态 / 删记录（记错了在这里改）">
        {history.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>暂无记录</div>
        ) : (
          <table className="tbl" style={{ width: '100%', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 12px' }}>日期</th>
                <th style={{ padding: '10px 12px' }}>应到</th>
                <th style={{ padding: '10px 12px' }}>在场</th>
                <th style={{ padding: '10px 12px' }}>缺席</th>
                <th style={{ padding: '10px 12px' }}>请假</th>
                <th style={{ padding: '10px 12px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <Fragment key={h.date}>
                  <tr style={{ borderTop: '1px solid var(--color-border-tertiary)', cursor: 'pointer' }} onClick={() => toggleExpand(h.date)}>
                    <td style={{ padding: '10px 12px' }}>
                      {expandedDate === h.date ? <IconChevronDown size={14} style={{ verticalAlign: 'middle' }} /> : <IconChevronRight size={14} style={{ verticalAlign: 'middle' }} />} {h.date}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{h.total}</td>
                    <td style={{ padding: '10px 12px' }}><span className={`pill ${ST_CLS.present}`}>{h.present}</span></td>
                    <td style={{ padding: '10px 12px' }}><span className={`pill ${ST_CLS.absent}`}>{h.absent}</span></td>
                    <td style={{ padding: '10px 12px' }}><span className={`pill ${ST_CLS.leave}`}>{h.leave}</span></td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="link" style={{ color: 'var(--color-danger)' }} onClick={(e) => { e.stopPropagation(); deleteDay(h.date); }}>
                        <IconTrash size={13} style={{ verticalAlign: 'middle' }} /> 删当天
                      </span>
                    </td>
                  </tr>
                  {expandedDate === h.date && (
                    <tr>
                      <td colSpan={6} style={{ padding: '6px 12px 14px', background: 'var(--color-bg-secondary)' }}>
                        {detail.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: 8 }}>加载中 / 无明细</div>
                        ) : detail.map(rec => (
                          <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--color-border-tertiary)' }}>
                            <span style={{ width: 90, fontWeight: 500, fontSize: 13 }}>{rec.name}</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {(['present', 'absent', 'leave'] as St[]).map(st => (
                                <button key={st} className={`btn ${rec.status === st ? 'btn-primary' : ''}`}
                                  onClick={() => changeRecordStatus(rec, st)}
                                  style={{
                                    padding: '2px 10px', fontSize: 12, minHeight: 0,
                                    backgroundColor: rec.status === st ? (st === 'absent' ? 'var(--color-danger)' : st === 'leave' ? '#EF9F27' : undefined) : undefined,
                                    borderColor: rec.status === st ? (st === 'absent' ? 'var(--color-danger)' : st === 'leave' ? '#EF9F27' : undefined) : undefined,
                                  }}>
                                  {ST_LABEL[st]}
                                </button>
                              ))}
                            </div>
                            {rec.notes && <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{rec.notes}</span>}
                            <span className="link" style={{ marginLeft: 'auto', color: 'var(--color-danger)' }} onClick={() => deleteRecord(rec)}>
                              <IconTrash size={13} style={{ verticalAlign: 'middle' }} /> 删除
                            </span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </>
  );
}
